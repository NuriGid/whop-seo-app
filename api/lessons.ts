/**
 * CourseRocket - Lessons API
 * 
 * Lists all lessons for a given course.
 * Endpoint: GET /api/lessons?courseId=cors_xxx
 * 
 * Whop API: GET https://api.whop.com/api/v5/course-lessons?course_id=cors_xxx
 * Permission: courses:read
 */

export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'WHOP_API_KEY not configured' });

    const courseId = req.query.courseId;
    if (!courseId) return res.status(400).json({ error: 'courseId query parameter required' });

    console.log(`📚 Fetching lessons for course: ${courseId}`);

    try {
        const response = await fetch(
            `https://api.whop.com/api/v5/course-lessons?course_id=${courseId}&first=50`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const text = await response.text();
        console.log(`📦 Lessons API Response (${response.status}): ${text.substring(0, 200)}`);

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Whop API error: ${response.status}`,
                details: text.substring(0, 200)
            });
        }

        const data = JSON.parse(text);
        const lessons = data.data || [];

        console.log(`✅ Found ${lessons.length} lessons`);

        // Map to simplified format
        const mappedLessons = lessons.map((lesson: any) => ({
            id: lesson.id,
            title: lesson.title || 'Untitled Lesson',
            content: lesson.content || '',
            order: lesson.order || 0,
            lessonType: lesson.lesson_type || 'text',
            visibility: lesson.visibility || 'visible'
        }));

        return res.status(200).json({
            lessons: mappedLessons,
            count: mappedLessons.length,
            courseId
        });

    } catch (error: any) {
        console.error('❌ Lessons API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
