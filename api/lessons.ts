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
        // 1. Fetch Lessons directly
        const lessonsRes = await fetch(
            `https://api.whop.com/api/v5/course-lessons?course_id=${courseId}&first=100`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const lessonsData = lessonsRes.ok ? await lessonsRes.json() : { data: [] };
        const directLessons = lessonsData.data || [];
        console.log(`📦 Found ${directLessons.length} direct lessons`);

        // 2. Fetch Chapters (lessons might be nested here)
        const chaptersRes = await fetch(
            `https://api.whop.com/api/v5/course-chapters?course_id=${courseId}&first=50`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const chaptersData = chaptersRes.ok ? await chaptersRes.json() : { data: [] };
        const chapters = chaptersData.data || [];
        console.log(`📦 Found ${chapters.length} chapters`);

        // 3. Extract lessons from chapters
        const chapterLessons: any[] = [];
        chapters.forEach((chapter: any) => {
            if (chapter.lessons && Array.isArray(chapter.lessons)) {
                chapter.lessons.forEach((lesson: any) => {
                    chapterLessons.push({
                        ...lesson,
                        chapterTitle: chapter.title
                    });
                });
            }
        });
        console.log(`📦 Found ${chapterLessons.length} lessons inside chapters`);

        // 4. Merge and Deduplicate
        const allLessonsMap = new Map();

        // Add direct lessons first
        directLessons.forEach((l: any) => allLessonsMap.set(l.id, l));

        // Add chapter lessons (might have more info or reveal missing ones)
        chapterLessons.forEach((l: any) => {
            if (!allLessonsMap.has(l.id)) {
                allLessonsMap.set(l.id, l);
            } else {
                // Enrich existing lesson with chapter info
                const existing = allLessonsMap.get(l.id);
                allLessonsMap.set(l.id, { ...existing, ...l });
            }
        });

        const allLessons = Array.from(allLessonsMap.values());
        console.log(`✅ Total unique lessons found: ${allLessons.length}`);

        // 5. Map to simplified format
        const mappedLessons = allLessons
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
            courseId
        });

    } catch (error: any) {
        console.error('❌ Lessons API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
