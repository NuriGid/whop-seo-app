/**
 * Whop Course Update API
 * 
 * Updates a course's description on Whop.
 * Uses PUT https://api.whop.com/api/v5/courses/{courseId}
 * 
 * Required permission: courses:update
 */

export default async function handler(req: any, res: any) {
    // CORS Headers - ALLOWALL
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token, x-whop-company-id');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { courseId, newDescription } = req.body;

        // Validate input
        if (!courseId) {
            return res.status(400).json({ error: 'Missing required field: courseId' });
        }

        if (!newDescription || typeof newDescription !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid field: newDescription' });
        }

        // Get Admin API Key
        const apiKey = process.env.WHOP_API_KEY;
        if (!apiKey) {
            console.error('❌ WHOP_API_KEY is not set');
            return res.status(500).json({
                error: 'Server configuration error: API key not configured.'
            });
        }

        // PATCH to Whop API v5
        console.log(`📝 Updating course ${courseId} description via PATCH...`);

        const response = await fetch(`https://api.whop.com/api/v5/courses/${courseId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'x-whop-api-version': '2024-12-05'
            },
            body: JSON.stringify({ description: newDescription })
        });

        const text = await response.text();
        console.log(`📦 Whop Update Response (${response.status}): ${text.substring(0, 200)}`);

        let data: any = {};
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.warn("Could not parse Whop update response as JSON, but status was OK");
            }
        }

        if (!response.ok) {
            console.error(`❌ Whop API Error (${response.status}):`, data);
            return res.status(response.status).json({
                success: false,
                error: (data && data.message) || (data && data.error) || `Whop API Error ${response.status}`,
                details: data
            });
        }

        console.log(`✅ Course ${courseId} updated successfully`);
        return res.status(200).json({
            success: true,
            message: 'Course description updated on Whop!',
            data
        });

    } catch (error: any) {
        console.error('❌ Update API Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        });
    }
}
