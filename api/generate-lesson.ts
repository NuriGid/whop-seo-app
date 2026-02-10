/**
 * CourseRocket v7.0 - Simplified Attachment focus
 * 
 * focuses on: PDF Reading + Text Content
 * Removed: YouTube Transcripts
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
import { extractPlainText, deepSearchUrls } from './content-utils.js';

// ─── PDF TEXT EXTRACTION ───────────────────────────────────────────
async function extractPdfText(url: string, filename: string): Promise<string> {
    try {
        console.log(`📄 Downloading PDF: ${filename}`);
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`❌ PDF download failed: ${response.status}`);
            return '';
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`📄 PDF downloaded: ${(buffer.length / 1024).toFixed(1)}KB`);

        // pdf-parse v2 API
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const textResult = await parser.getText();
        await parser.destroy();

        const text = textResult?.text || '';
        console.log(`📄 PDF extracted: ${text.length} chars from ${filename}`);

        return text.substring(0, 4000);
    } catch (err: any) {
        console.error(`⚠️ PDF extraction failed for ${filename}:`, err.message);
        return '';
    }
}

// ─── MAIN HANDLER ──────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

    const { lessonId, lessonTitle, courseName, userNote } = req.body;
    if (!lessonTitle || !courseName) {
        return res.status(400).json({ error: 'lessonTitle and courseName required' });
    }

    const apiKey = process.env.WHOP_API_KEY;
    let lessonContext = "";
    const sources: string[] = [];

    if (lessonId && apiKey) {
        try {
            const lessonRes = await fetch(`https://api.whop.com/api/v1/course_lessons/${lessonId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (lessonRes.ok) {
                const lessonData = await lessonRes.json();

                // v7.0: Scan for attachments & PDFs ONLY
                const allLinks = deepSearchUrls(lessonData);

                if (lessonData.attachments && Array.isArray(lessonData.attachments)) {
                    const fileNames = lessonData.attachments.map((a: any) => a.filename).filter(Boolean).join(', ');
                    if (fileNames) {
                        lessonContext += `\nRAW MATERIALS (Files Attached): ${fileNames}\n`;
                    }
                    // Add attachment URLs to allLinks for scanning
                    lessonData.attachments.forEach((a: any) => {
                        if (a.url) allLinks.push(a.url);
                        if (a.file_url) allLinks.push(a.file_url);
                    });
                }

                // v7.4: Support for "PDF" lesson type (main_pdf field)
                if (lessonData.main_pdf && typeof lessonData.main_pdf === 'string') {
                    console.log(`📄 Found Main PDF: ${lessonData.main_pdf}`);
                    allLinks.push(lessonData.main_pdf);

                    // v7.5: Extract filename from main_pdf
                    const mainPdfName = lessonData.main_pdf.split('/').pop();
                    if (mainPdfName) {
                        lessonContext += `\nMAIN FILE NAME: ${mainPdfName}\n`;
                    }
                }

                if (lessonData.content) {
                    const cleanText = extractPlainText(lessonData.content);
                    lessonContext += `\nLESSON TEXT CONTENT:\n${cleanText.substring(0, 3000)}\n`;
                    sources.push('lesson_text');
                }

                // v7.5: Check for Video Files to use their names
                const videoFiles = allLinks.filter(u => u && (u.match(/\.(mp4|mov|avi|webm)$/i) || u.includes('youtube.com') || u.includes('youtu.be') || u.includes('loom.com')));
                if (videoFiles.length > 0) {
                    const videoNames = videoFiles.map(v => v.split('/').pop()).join(', ');
                    lessonContext += `\nVIDEO FILES DETECTED (Use names as context): ${videoNames}\n`;
                }

                // Check for PDFs (deduplicated)
                const pdfs = Array.from(new Set(allLinks.filter(u => u && u.toLowerCase().endsWith('.pdf'))));

                for (const pdfUrl of pdfs) {
                    const fileName = pdfUrl.split('/').pop() || 'document.pdf';
                    const pdfText = await extractPdfText(pdfUrl, fileName);
                    if (pdfText) {
                        lessonContext += `\nATTACHED PDF CONTENT (${fileName}):\n${pdfText}\n`;
                        sources.push(`pdf:${fileName}`);
                    }
                }

                console.log(`📦 v7.0 Context size: ${lessonContext.length} chars | Sources: ${sources.join(', ')}`);
            }
        } catch (err) {
            console.error('⚠️ Could not fetch lesson details:', err);
        }
    }

    try {
        let systemPrompt = `You are a course content expert. Write a concise, engaging lesson description (2-3 paragraphs max).
 
 FORMAT:
 - Clear, direct language
 - Focus on what students will learn
 - Include 2-3 key takeaways as bullet points
 - End with an encouraging note

 IF TEXT CONTENT IS MISSING:
 - Rely on the Lesson Title and any File Names (e.g. 'Intro.mp4', 'Chapter1.pages') to infer the topic.
 - Do NOT apologize for missing content. Just write the best description possible based on the title and filenames.`;

        if (userNote) {
            systemPrompt += `\n\nIMPORTANT: Adapt for: "${userNote}"`;
        }

        const userMessage = `Course: ${courseName}\nLesson Title: ${lessonTitle}\n\nCONTENT FROM LESSON:\n${lessonContext || 'No specific content, generate based on title.'}`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `AI API Error: ${response.status}` });
        }

        const data = await response.json();
        const description = data.choices?.[0]?.message?.content?.trim() || '';

        return res.status(200).json({
            success: true,
            description,
            sources
        });

    } catch (error: any) {
        console.error('❌ Generate Lesson Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
