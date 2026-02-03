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

    const { lessonTitle, courseName, userNote } = req.body;
    if (!lessonTitle || !courseName) {
        return res.status(400).json({ error: 'lessonTitle and courseName required' });
    }

    console.log(`🎯 Generating description for lesson: "${lessonTitle}" in course: "${courseName}"`);

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

        const userMessage = `Write a description for this lesson:

Course: ${courseName}
Lesson Title: ${lessonTitle}

Create an engaging description that tells students what they'll learn and why it matters.`;

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
