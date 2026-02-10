/**
 * CourseRocket v6.0 - Generate Lesson Description API
 * 
 * WORKFLOW DEPTH: PDF Reading + YouTube Transcript + AI Generation
 * 
 * Uses AI to generate a rich description for a specific lesson by:
 * 1. Fetching lesson data from Whop API (content, attachments, video)
 * 2. Extracting text from PDF attachments via pdf-parse
 * 3. Fetching YouTube/Loom transcripts
 * 4. Feeding all context to AI for high-quality description generation
 * 
 * Endpoint: POST /api/generate-lesson
 * Body: { lessonId, lessonTitle, courseName, userNote }
 * Returns: { description, sources }
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
import { extractPlainText, extractLinksFromContent, deepSearchUrls, forensicSearch } from './content-utils.js';

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

        // Limit to 4000 chars to avoid token overflow
        return text.substring(0, 4000);
    } catch (err: any) {
        console.error(`⚠️ PDF extraction failed for ${filename}:`, err.message);
        return '';
    }
}

// ─── YOUTUBE / LOOM TRANSCRIPT ─────────────────────────────────────
function extractVideoId(url: string): string | null {
    // YouTube patterns
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch) return ytMatch[1];
    return null;
}

function findVideoUrls(text: string): string[] {
    const urlRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|loom\.com\/share\/)[^\s"'<>]+/gi;
    return text.match(urlRegex) || [];
}

async function fetchYouTubeTranscript(videoUrl: string): Promise<string> {
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            console.log(`⚠️ Could not extract video ID from: ${videoUrl}`);
            return '';
        }

        console.log(`🎬 Fetching transcript for video: ${videoId}`);
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);

        if (!transcript || transcript.length === 0) {
            console.log(`⚠️ No transcript available for: ${videoId}`);
            return '';
        }

        const fullText = transcript.map((t: any) => t.text).join(' ');
        console.log(`🎬 Transcript fetched: ${fullText.length} chars`);

        // Limit to 3000 chars
        return fullText.substring(0, 3000);
    } catch (err: any) {
        console.error(`⚠️ Transcript fetch failed:`, err.message);
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
    const sources: string[] = []; // Track what content sources were used

    // ─── 1. DEEP ANALYSIS: Fetch lesson details ────────────────────
    if (lessonId && apiKey) {
        console.log(`🔍 v6.0 Deep Analyzing lesson: ${lessonId}`);
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

                // v6.3: Aggressive Deep Scan for ALL URLs in lessonData
                const allLinks = deepSearchUrls(lessonData);
                if (allLinks.length > 0) {
                    console.log(`🔍 v6.3 Deep Scan found ${allLinks.length} URLs:`, allLinks);
                }

                // v6.0 Metadata: Extract attachment names as hammadde (raw materials)
                if (lessonData.attachments && Array.isArray(lessonData.attachments)) {
                    const fileNames = lessonData.attachments.map((a: any) => a.filename).filter(Boolean).join(', ');
                    if (fileNames) {
                        lessonContext += `\nRAW MATERIALS (Files Attached): ${fileNames}\n`;
                    }
                }

                // ── A: Extract text content (Standardize TipTap) ──
                if (lessonData.content) {
                    const cleanText = extractPlainText(lessonData.content);
                    lessonContext += `\nLESSON TEXT CONTENT:\n${cleanText.substring(0, 3000)}\n`;
                    sources.push('lesson_text');
                }

                // ── C: YouTube/Loom transcript (v6.5 Universal Scavenger) ──
                let videoUrl = '';

                // 1. Check explicit fields (Multimedia preference)
                if (lessonData.multimedia?.url) {
                    videoUrl = lessonData.multimedia.url;
                } else if (lessonData.video_url) {
                    videoUrl = lessonData.video_url;
                } else if (lessonData.video?.url) {
                    videoUrl = lessonData.video.url;
                } else if (lessonData.multimedia_url) {
                    videoUrl = lessonData.multimedia_url;
                }

                // 2. Fallback to deep scan if explicit fields are empty
                if (!videoUrl) {
                    videoUrl = allLinks.find(u =>
                        u.includes('youtube.com') ||
                        u.includes('youtu.be') ||
                        u.includes('loom.com')
                    ) || '';
                }

                if (videoUrl) {
                    console.log(`🎬 Found candidate video URL: ${videoUrl}`);
                    const transcript = await fetchYouTubeTranscript(videoUrl);
                    if (transcript) {
                        lessonContext += `\nVIDEO TRANSCRIPT:\n${transcript}\n`;
                        sources.push('youtube_transcript');
                    } else {
                        // v6.5 Diagnosis: Found the video, but couldn't get text
                        sources.push('youtube_transcript_unavailable');
                        lessonContext += `\nVIDEO LESSON: This lesson contains a video (${videoUrl}).\n`;
                    }
                } else if (lessonData.video_asset || lessonData.multimedia) {
                    lessonContext += `\nVIDEO LESSON: This lesson contains a video/multimedia asset.\n`;
                    sources.push('video_asset_detected');
                }

                // Check for PDFs found in deep scan that weren't in attachments
                const deepPdfs = allLinks.filter(u => u.toLowerCase().endsWith('.pdf'));
                for (const pdfUrl of deepPdfs) {
                    if (!sources.some(s => s.startsWith('pdf:'))) {
                        const fileName = pdfUrl.split('/').pop() || 'embedded.pdf';
                        const pdfText = await extractPdfText(pdfUrl, fileName);
                        if (pdfText) {
                            lessonContext += `\nEMBEDDED PDF CONTENT (${fileName}):\n${pdfText}\n`;
                            sources.push(`pdf:${fileName}`);
                        }
                    }
                }

                console.log(`📦 v6.5 Context size: ${lessonContext.length} chars | Sources: ${sources.join(', ')}`);

                // ── D: v6.6 Forensic Reporting ──
                const keys = Object.keys(lessonData).join(', ');
                sources.push(`diagnostic:keys:[${keys}]`);

                if (!sources.includes('youtube_transcript')) {
                    const forensicFindings = forensicSearch(lessonData, 'youtube');
                    if (forensicFindings.length > 0) {
                        console.log(`🕵️ Forensic hunt found:`, forensicFindings);
                        sources.push(`diagnostic:found:[${forensicFindings[0].substring(0, 30)}]`);
                    }
                }
            }
        } catch (err) {
            console.error('⚠️ Could not fetch lesson details:', err);
        }
    }

    console.log(`🎯 v6.0 Generating for: "${lessonTitle}" | Sources: ${sources.length > 0 ? sources.join(', ') : 'title_only'}`);

    try {
        // ─── 2. BUILD AI PROMPT ────────────────────────────────────
        let systemPrompt = `You are a course content expert. Write a concise, engaging lesson description (2-3 paragraphs max).

FORMAT:
- Clear, direct language
- No fluff or filler
- Focus on what students will learn
- Include 2-3 key takeaways as bullet points
- End with an encouraging note`;

        if (userNote) {
            systemPrompt += `\n\nIMPORTANT: Adapt the tone and perspective for: "${userNote}"`;
        }

        // Dynamic prompt based on available sources
        const hasRichContent = sources.some(s => s.startsWith('pdf:') || s === 'youtube_transcript' || s === 'lesson_text');

        const userMessage = hasRichContent
            ? `You have DETAILED CONTENT from this lesson. Use it to write a highly specific, accurate description.

Course: ${courseName}
Lesson Title: ${lessonTitle}

RICH CONTENT FROM LESSON:
${lessonContext}

CRITICAL: Your description must reference SPECIFIC concepts, terms, and ideas from the content above. Do NOT write generic descriptions. The student should feel that this description was hand-crafted for THIS exact lesson.`
            : `Based on the lesson title only, create an engaging description.

Course: ${courseName}
Lesson Title: ${lessonTitle}
${lessonContext ? `\nAvailable context:\n${lessonContext}` : ''}

Create an engaging, high-converting description for this lesson. Tell students exactly what they'll learn and why this specific lesson is valuable.`;

        // ─── 3. CALL AI ────────────────────────────────────────────
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

        console.log(`✅ v6.0 Generated ${description.length} chars for: ${lessonTitle} | Sources used: ${sources.join(', ') || 'title_only'}`);

        return res.status(200).json({
            success: true,
            description,
            lessonTitle,
            courseName,
            sources // Return sources so frontend can show feedback
        });

    } catch (error: any) {
        console.error('❌ Generate Lesson Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
