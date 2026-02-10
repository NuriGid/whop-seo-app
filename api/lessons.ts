/**
 * CourseRocket v6.0 - Lessons API (with diagnostics)
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

    console.log(`📚 v6.0 Fetching lessons for course: ${courseId}`);

    const debug: any = { courseId, steps: [] };

    try {
        // ─── STEP 1: Try direct lessons fetch ───
        const lessonsUrl = `https://api.whop.com/api/v5/course-lessons?course_id=${courseId}&first=100`;
        debug.steps.push({ step: 'direct_lessons', url: lessonsUrl });

        const lessonsRes = await fetch(lessonsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const lessonsRaw = await lessonsRes.text();
        debug.steps.push({ step: 'direct_lessons_response', status: lessonsRes.status, bodyPreview: lessonsRaw.substring(0, 300) });
        console.log(`📦 Direct lessons response (${lessonsRes.status}): ${lessonsRaw.substring(0, 200)}`);

        let directLessons: any[] = [];
        try {
            const lessonsData = JSON.parse(lessonsRaw);
            directLessons = lessonsData.data || [];
        } catch (e) {
            debug.steps.push({ step: 'direct_lessons_parse_error', error: 'Could not parse JSON' });
        }
        console.log(`📦 Found ${directLessons.length} direct lessons`);

        // ─── STEP 2: Fetch chapters (lessons might be nested) ───
        const chaptersUrl = `https://api.whop.com/api/v5/course-chapters?course_id=${courseId}&first=50`;
        debug.steps.push({ step: 'chapters', url: chaptersUrl });

        const chaptersRes = await fetch(chaptersUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const chaptersRaw = await chaptersRes.text();
        debug.steps.push({ step: 'chapters_response', status: chaptersRes.status, bodyPreview: chaptersRaw.substring(0, 300) });
        console.log(`📦 Chapters response (${chaptersRes.status}): ${chaptersRaw.substring(0, 200)}`);

        let chapters: any[] = [];
        try {
            const chaptersData = JSON.parse(chaptersRaw);
            chapters = chaptersData.data || [];
        } catch (e) {
            debug.steps.push({ step: 'chapters_parse_error', error: 'Could not parse JSON' });
        }
        console.log(`📦 Found ${chapters.length} chapters`);

        // ─── STEP 3: Extract lessons from chapters ───
        const chapterLessons: any[] = [];
        chapters.forEach((chapter: any) => {
            debug.steps.push({ step: 'chapter_inspect', chapterId: chapter.id, title: chapter.title, hasLessons: !!(chapter.lessons), lessonCount: chapter.lessons?.length || 0, keys: Object.keys(chapter).join(',') });

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

        // ─── STEP 4: If chapters exist but no lessons found in them, try fetching lessons per chapter ───
        if (chapters.length > 0 && chapterLessons.length === 0 && directLessons.length === 0) {
            console.log(`🔍 Chapters exist but no lessons found. Trying per-chapter lesson fetch...`);
            debug.steps.push({ step: 'per_chapter_fetch', reason: 'Chapters found but no nested lessons' });

            for (const chapter of chapters) {
                const chapterLessonsUrl = `https://api.whop.com/api/v5/course-lessons?chapter_id=${chapter.id}&first=100`;
                debug.steps.push({ step: 'chapter_lessons_fetch', chapterId: chapter.id, url: chapterLessonsUrl });

                try {
                    const clRes = await fetch(chapterLessonsUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const clRaw = await clRes.text();
                    debug.steps.push({ step: 'chapter_lessons_response', chapterId: chapter.id, status: clRes.status, bodyPreview: clRaw.substring(0, 300) });
                    console.log(`📦 Chapter ${chapter.id} lessons (${clRes.status}): ${clRaw.substring(0, 200)}`);

                    try {
                        const clData = JSON.parse(clRaw);
                        const cl = clData.data || [];
                        cl.forEach((lesson: any) => {
                            chapterLessons.push({
                                ...lesson,
                                chapterTitle: chapter.title
                            });
                        });
                    } catch (e) { /* skip parse errors */ }
                } catch (e) { /* skip fetch errors */ }
            }
            console.log(`📦 After per-chapter fetch: ${chapterLessons.length} lessons`);
        }

        // ─── STEP 5: Merge and deduplicate ───
        const allLessonsMap = new Map();
        directLessons.forEach((l: any) => allLessonsMap.set(l.id, l));
        chapterLessons.forEach((l: any) => {
            if (!allLessonsMap.has(l.id)) {
                allLessonsMap.set(l.id, l);
            } else {
                const existing = allLessonsMap.get(l.id);
                allLessonsMap.set(l.id, { ...existing, ...l });
            }
        });

        const allLessons = Array.from(allLessonsMap.values());
        console.log(`✅ Total unique lessons found: ${allLessons.length}`);
        debug.totalLessons = allLessons.length;

        // ─── STEP 6: Map to simplified format ───
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
            courseId,
            debug // v6.0: Include debug info for troubleshooting
        });

    } catch (error: any) {
        console.error('❌ Lessons API Error:', error);
        return res.status(500).json({ error: error.message, debug });
    }
}
