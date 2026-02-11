/**
 * Whop Community Announcement API
 * 
 * Posts a marketing announcement to the Whop community.
 * Uses POST https://api.whop.com/api/v5/company/announcements
 * 
 * Required permission: announcements:create (or similar)
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
        const { title, body, companyId } = req.body;

        // Validate input
        if (!title || typeof title !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid field: title' });
        }

        if (!body || typeof body !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid field: body' });
        }

        // Get Admin API Key
        const apiKey = process.env.WHOP_API_KEY;
        if (!apiKey) {
            console.error('❌ WHOP_API_KEY is not set');
            return res.status(500).json({
                error: 'Server configuration error: API key not configured.'
            });
        }

        // POST to Whop API v2 - Notifications (Broadcast)
        console.log(`📢 Sending notification: "${title}"...`);

        // Note: Notifications API requires 'content' instead of 'body'
        const response = await fetch('https://api.whop.com/api/v2/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                content: body, // Map 'body' to 'content'
                ...(companyId && { company_id: companyId }),
                // Optional: Link to open when clicked
                rest_path: '/home'
            })
        });

        const text = await response.text();
        console.log(`📦 Whop Announce Response (${response.status}): ${text.substring(0, 200)}`);

        let data: any = {};
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.warn("Could not parse Whop announce response as JSON, but status was OK");
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

        console.log(`✅ Announcement created successfully`);
        return res.status(200).json({
            success: true,
            message: 'Announcement published on Whop!',
            data
        });

    } catch (error: any) {
        console.error('❌ Announce API Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        });
    }
}
