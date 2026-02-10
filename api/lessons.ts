/**
 * CourseRocket v6.0 - Lessons API (v1 Standard)
 * 
 * Lists all lessons for a given course.
 * Uses Whop v1 API with underscores.
 */
import { extractPlainText } from './content-utils.js';

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

    console.log(`📚 v6.0 Std: Fetching lessons for course: ${courseId}`);

    const debug: any = { courseId, steps: [] };

    try {
        // 1. Fetch Lessons directly (CORRECT v1 URL)
        const lessonsUrl = `https://api.whop.com/api/v1/course_lessons?course_id=${courseId}&first=100`;
        debug.steps.push({ step: 'lessons_v1', url: lessonsUrl });

        const lessonsRes = await fetch(lessonsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const lessonsRaw = await lessonsRes.text();
        debug.steps.push({ step: 'lessons_response', status: lessonsRes.status });

        let directLessons: any[] = [];
        if (lessonsRes.ok) {
            const lessonsData = JSON.parse(lessonsRaw);
            directLessons = lessonsData.data || [];
        }
        console.log(`📦 Found ${directLessons.length} direct lessons`);

        // 2. Fetch Chapters (lessons might be nested in some cases or we need chapter info)
        const chaptersUrl = `https://api.whop.com/api/v1/course_chapters?course_id=${courseId}&first=50`;
        debug.steps.push({ step: 'chapters_v1', url: chaptersUrl });

        const chaptersRes = await fetch(chaptersUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const chaptersRaw = await chaptersRes.text();
        debug.steps.push({ step: 'chapters_response', status: chaptersRes.status });

        let chapters: any[] = [];
        if (chaptersRes.ok) {
            const chaptersData = JSON.parse(chaptersRaw);
            chapters = chaptersData.data || [];
        }
        console.log(`📦 Found ${chapters.length} chapters`);

        // 3. Extract lessons from chapters (some lessons might only appear here)
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

        // 4. Merge and deduplicate
        const allLessonsMap = new Map();
        directLessons.forEach((l: any) => allLessonsMap.set(l.id, l));
        chapterLessons.forEach((l: any) => {
            if (!allLessonsMap.has(l.id)) {
                allLessonsMap.set(l.id, l);
            }
        });

        const allLessons = Array.from(allLessonsMap.values());
        console.log(`✅ Total unique lessons found: ${allLessons.length}`);

        // 5. Map to simplified format

        const mappedLessons = allLessons
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((lesson: any) => {
                const rawContent = lesson.content || '';
                const previewText = extractPlainText(rawContent);

                return {
                    id: lesson.id,
                    title: lesson.title || 'Untitled Lesson',
                    content: previewText || 'No description',
                    rawContent: rawContent, // Keep for AI
                    order: lesson.order || 0,
                    lessonType: lesson.lesson_type || 'text',
                    visibility: lesson.visibility || 'visible',
                    chapterTitle: lesson.chapterTitle || ''
                };
            });

        return res.status(200).json({
            lessons: mappedLessons,
            count: mappedLessons.length,
            courseId,
            debug
        });

    } catch (error: any) {
        console.error('❌ Lessons API Error:', error);
        return res.status(500).json({ error: error.message, debug });
    }
}
