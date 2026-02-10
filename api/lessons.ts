/**
 * CourseRocket v6.0 - Lessons API (Auto-Discovery Mode)
 * 
 * Lists all lessons for a given course.
 * Automatically tries different URL patterns to find the correct v5 endpoint.
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

    console.log(`📚 v6.0 Discovery: Fetching lessons for course: ${courseId}`);

    const debug: any = { courseId, steps: [] };

    // Common Whop v5 patterns for lessons
    const patterns = [
        `https://api.whop.com/v5/course_lessons?course_id=${courseId}&first=100`, // Underscore, No prefix
        `https://api.whop.com/api/v5/course_lessons?course_id=${courseId}&first=100`, // Underscore, With /api/
        `https://api.whop.com/v5/course-lessons?course_id=${courseId}&first=100`, // Hyphen, No prefix
        `https://api.whop.com/api/v5/course-lessons?course_id=${courseId}&first=100`, // Hyphen, With /api/
    ];

    let foundData = null;

    for (const url of patterns) {
        try {
            console.log(`📡 Trying URL: ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const text = await response.text();
            debug.steps.push({ step: 'trial', url: url.split('?')[0], status: response.status, bodyPreview: text.substring(0, 60) });

            if (response.ok) {
                const data = JSON.parse(text);
                if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                    console.log(`✅ Success with URL: ${url}`);
                    foundData = data.data;
                    break; // Found the one!
                }
            }
        } catch (err) {
            debug.steps.push({ step: 'error', url: url.split('?')[0], error: (err as Error).message });
        }
    }

    // Try Chapter Logic if direct lessons failed but chapters might work
    let chapterLessons: any[] = [];
    if (!foundData) {
        const chapterPatterns = [
            `https://api.whop.com/v5/course_chapters?course_id=${courseId}&first=50`,
            `https://api.whop.com/api/v5/course_chapters?course_id=${courseId}&first=50`,
            `https://api.whop.com/v5/course-chapters?course_id=${courseId}&first=50`,
            `https://api.whop.com/api/v5/course-chapters?course_id=${courseId}&first=50`,
        ];

        for (const url of chapterPatterns) {
            try {
                console.log(`📡 Trying Chapters URL: ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    const chapters = data.data || [];
                    if (chapters.length > 0) {
                        debug.chapters_success_url = url;
                        // For each chapter, try to find lessons
                        for (const chapter of chapters) {
                            // Try underscore vs hyphen for chapter lessons
                            const clUrl = url.includes('course_chapters')
                                ? url.replace('course_chapters', 'course_lessons').split('?')[0] + `?chapter_id=${chapter.id}&first=50`
                                : url.replace('course-chapters', 'course-lessons').split('?')[0] + `?chapter_id=${chapter.id}&first=50`;

                            const clRes = await fetch(clUrl, {
                                method: 'GET',
                                headers: { 'Authorization': `Bearer ${apiKey}` }
                            });
                            if (clRes.ok) {
                                const clData = await clRes.json();
                                (clData.data || []).forEach((l: any) => {
                                    chapterLessons.push({ ...l, chapterTitle: chapter.title });
                                });
                            }
                        }
                        if (chapterLessons.length > 0) break;
                    }
                }
            } catch (e) { }
        }
    }

    const finalLessons = foundData || chapterLessons;

    const mappedLessons = finalLessons
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((lesson: any) => ({
            id: lesson.id,
            title: lesson.title || 'Untitled Lesson',
            content: lesson.content || '',
            order: lesson.order || 0,
            lessonType: lesson.lesson_type || 'text',
            visibility: lesson.visibility || 'visible',
            chapterTitle: lesson.chapterTitle || ''
        }));

    return res.status(200).json({
        lessons: mappedLessons,
        count: mappedLessons.length,
        courseId,
        debug
    });
}
