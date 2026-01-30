/**
 * Whop Courses API
 * 
 * Lists courses for the company.
 * Endpoint: GET https://api.whop.com/api/v1/courses
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
            return res.status(500).json({ error: 'API key not configured' });
        }

        // 3. GET COMPANY ID FROM HEADERS
        const companyId = req.headers['x-whop-company-id'];
        console.log(`🏢 Company ID: ${companyId || 'NOT FOUND'}`);

        // 4. CALL WHOP API v1 (CORRECT ENDPOINT!)
        const apiUrl = `https://api.whop.com/api/v1/courses${companyId ? `?company_id=${companyId}` : ''}`;
        console.log(`📡 Fetching: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log(`📦 Response (${response.status}): ${responseText.substring(0, 300)}`);

        if (!response.ok) {
            console.error(`❌ Whop API Error (${response.status}):`, responseText);
            return res.status(response.status).json({
                error: `Whop API error: ${response.status}`,
                details: responseText.substring(0, 200)
            });
        }

        const data = JSON.parse(responseText);
        const courses = data.data || data || [];

        // 5. MAP COURSES
        const mappedCourses = Array.isArray(courses) ? courses.map((course: any) => ({
            id: course.id,
            name: course.title || course.name || 'Untitled',
            title: course.title,
            description: course.description,
            visibility: course.visibility,
            tagline: course.tagline
        })) : [];

        console.log(`✅ Returning ${mappedCourses.length} courses`);
        return res.status(200).json(mappedCourses);

    } catch (error: any) {
        console.error('❌ API Error:', error.message);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
