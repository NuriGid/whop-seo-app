/**
 * CourseRocket - Generate Lesson Description API
 * 
 * Uses AI to generate a description for a specific lesson.
 * Endpoint: POST /api/generate-lesson
 * Body: { lessonTitle, courseName, userNote }
 * 
 * Returns: { description }
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

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

    // --- 1. OPTIONAL DEEP ANALYSIS: Fetch lesson details if lessonId is provided ---
    if (lessonId && apiKey) {
        console.log(`🔍 Deep Analyzing lesson: ${lessonId}`);
        try {
            const lessonRes = await fetch(`https://api.whop.com/api/v5/course-lessons/${lessonId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (lessonRes.ok) {
                const lessonData = await lessonRes.json();

                // Extract text content
                if (lessonData.content) {
                    lessonContext += `\nLESSON CONTENT:\n${lessonData.content.substring(0, 3000)}\n`;
                }

                // Extract attachment names
                if (lessonData.attachments && Array.isArray(lessonData.attachments) && lessonData.attachments.length > 0) {
                    const filenames = lessonData.attachments.map((a: any) => a.filename).join(', ');
                    lessonContext += `\nATTACHMENTS: ${filenames}\n`;
                }

                // Video info
                if (lessonData.video_asset) {
                    lessonContext += `\nVIDEO LESSON: This lesson contains a video asset.\n`;
                }

                console.log(`📦 Fetched context size: ${lessonContext.length} chars`);
            }
        } catch (err) {
            console.error('⚠️ Could not fetch lesson details for deep analysis:', err);
            // Non-blocking error, we continue with just title
        }
    }

    console.log(`🎯 Generating description for lesson: "${lessonTitle}" | Deep Analysis: ${lessonContext ? 'YES' : 'NO'}`);

    try {
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

        const userMessage = `Detailed information about this lesson:

Course: ${courseName}
Lesson Title: ${lessonTitle}
${lessonContext ? `\nCONTEXT FROM LESSON CONTENT/FILES:\n${lessonContext}\n` : ""}

Based on the title ${lessonContext ? "and the content provided above" : "only"}, create an engaging, high-converting description for this lesson. Tell students exactly what they'll learn and why this specific lesson is valuable for them.`;

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

        console.log(`✅ Generated ${description.length} chars for: ${lessonTitle}`);

        return res.status(200).json({
            success: true,
            description,
            lessonTitle,
            courseName
        });

    } catch (error: any) {
        console.error('❌ Generate Lesson Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
