/**
 * Whop Courses API
 * 
 * Lists courses for the company using direct API call.
 * Uses courses:read permission.
 */

export default async function handler(req: any, res: any) {
    // 1. CORS & CACHE CONTROL
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token, x-whop-company-id');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. GET API KEY
        const apiKey = process.env.WHOP_API_KEY;
        if (!apiKey) {
            console.error('❌ WHOP_API_KEY is not set');
            return res.status(500).json({ error: 'Server configuration error: API key not configured.' });
        }

        // 3. GET COMPANY ID FROM HEADERS
        const companyId = req.headers['x-whop-company-id'];
        console.log(`🏢 Company ID from header: ${companyId || 'NOT FOUND'}`);

        // 4. FETCH COURSES DIRECTLY FROM WHOP API
        let apiUrl = 'https://api.whop.com/api/v5/courses';
        if (companyId) {
            apiUrl += `?company_id=${companyId}`;
        }

        console.log(`📡 Fetching courses from: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Whop API Error (${response.status}):`, errorText);
            return res.status(response.status).json({
                error: `Whop API error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();
        console.log(`📦 Raw API response:`, JSON.stringify(data, null, 2));

        // Extract courses from response
        const courses = data.data || data || [];

        // Map courses to match expected format (id, name/title)
        const mappedCourses = Array.isArray(courses) ? courses.map((course: any) => ({
            id: course.id,
            name: course.title || course.name,
            title: course.title,
            description: course.description,
            visibility: course.visibility,
            tagline: course.tagline
        })) : [];

        console.log(`✅ Returning ${mappedCourses.length} courses`);
        return res.status(200).json(mappedCourses);

    } catch (error: any) {
        console.error('❌ API Error:', error.message);
        console.error('Stack:', error.stack);
        return res.status(500).json({
            error: error.message || 'Internal Server Error'
        });
    }
}
