/**
 * Whop Courses API
 * 
 * Lists courses for the company using direct Whop API call.
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

        // 4. TRY DIFFERENT ENDPOINTS
        const endpoints = [
            `https://api.whop.com/api/v5/company/courses${companyId ? `?company_id=${companyId}` : ''}`,
            `https://api.whop.com/api/v5/courses${companyId ? `?company_id=${companyId}` : ''}`,
            'https://api.whop.com/api/v5/company/courses',
        ];

        let courses: any[] = [];
        let successEndpoint = '';
        let lastError = '';

        for (const endpoint of endpoints) {
            console.log(`📡 Trying: ${endpoint}`);

            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                const responseText = await response.text();
                console.log(`📦 Response (${response.status}): ${responseText.substring(0, 200)}`);

                if (response.ok) {
                    const data = JSON.parse(responseText);
                    courses = data.data || data || [];
                    successEndpoint = endpoint;
                    console.log(`✅ Success with: ${endpoint}`);
                    break;
                } else {
                    lastError = `${endpoint}: ${response.status} - ${responseText.substring(0, 100)}`;
                }
            } catch (e: any) {
                lastError = `${endpoint}: ${e.message}`;
                console.error(`❌ Error with ${endpoint}:`, e.message);
            }
        }

        if (courses.length === 0 && !successEndpoint) {
            console.error('❌ All endpoints failed. Last error:', lastError);
            // Return empty array instead of error to allow UI to load
            return res.status(200).json([]);
        }

        // 5. MAP COURSES
        const mappedCourses = Array.isArray(courses) ? courses.map((course: any) => ({
            id: course.id,
            name: course.title || course.name || 'Untitled',
            title: course.title,
            description: course.description,
            visibility: course.visibility,
            tagline: course.tagline
        })) : [];

        console.log(`✅ Returning ${mappedCourses.length} courses from ${successEndpoint}`);
        return res.status(200).json(mappedCourses);

    } catch (error: any) {
        console.error('❌ API Error:', error.message);
        // Return empty array instead of 500 to allow UI to load
        return res.status(200).json([]);
    }
}
