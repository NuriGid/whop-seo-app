export default async function handler(req: any, res: any) {
    // 1. CORS & CACHE CONTROL
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. EXTRACT USER TOKEN (Pass-Through)
        let userToken = req.headers.authorization || req.headers['x-whop-user-token'];
        if (Array.isArray(userToken)) userToken = userToken[0];

        if (!userToken) {
            console.error("❌ Error: No token provided.");
            return res.status(401).json({ error: 'Token missing. Please open inside Whop.' });
        }

        if (!userToken.startsWith('Bearer ')) userToken = `Bearer ${userToken}`;

        // 3. CALL WHOP API (Using User Token)
        const response = await fetch('https://api.whop.com/api/v5/company/plans', {
            method: 'GET',
            headers: {
                'Authorization': userToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            // 401 means the user isn't authorized for this company => Data Isolation success
            if (response.status === 401) return res.status(401).json({ error: 'Invalid Token.' });
            return res.status(response.status).json({ error: `Whop API Error`, details: errorText });
        }

        const data = await response.json();
        const allPlans = Array.isArray(data) ? data : (data.data || []);

        console.log(`📦 Fetched: ${allPlans.length} Plans`);

        return res.status(200).json(allPlans);

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
