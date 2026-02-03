/**
 * CourseRocket - Update Lesson API
 * 
 * Updates a lesson's content on Whop.
 * Endpoint: PUT /api/update-lesson
 * Body: { lessonId, content }
 * 
 * Whop API: PUT https://api.whop.com/api/v5/course-lessons/{lessonId}
 * Permission: courses:update
 */

export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'PUT') return res.status(405).json({ error: 'PUT only' });

    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'WHOP_API_KEY not configured' });

    const { lessonId, content, title } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lessonId required' });

    console.log(`✏️ Updating lesson: ${lessonId}`);

    try {
        const updatePayload: any = {};
        if (content) updatePayload.content = content;
        if (title) updatePayload.title = title;

        const response = await fetch(
            `https://api.whop.com/api/v5/course-lessons/${lessonId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatePayload)
            }
        );

        const text = await response.text();
        console.log(`📦 Update Response (${response.status}): ${text.substring(0, 200)}`);

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Whop API error: ${response.status}`,
                details: text.substring(0, 200)
            });
        }

        const data = JSON.parse(text);
        console.log(`✅ Lesson updated: ${lessonId}`);

        return res.status(200).json({
            success: true,
            lesson: {
                id: data.id,
                title: data.title,
                content: data.content
            }
        });

    } catch (error: any) {
        console.error('❌ Update Lesson Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
