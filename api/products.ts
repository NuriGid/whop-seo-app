export default async function handler(req: any, res: any) {
    // 1. CORS & CACHE CONTROL
    // We disable caching to ensure the user always sees their current, real-time product list.
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
        // We use the user's token instead of a static API key to ensure strict data isolation.
        let userToken = req.headers.authorization || req.headers['x-whop-user-token'];
        if (Array.isArray(userToken)) userToken = userToken[0];

        if (!userToken) {
            console.error("❌ Error: No token provided.");
            return res.status(401).json({ error: 'Token missing. Please open inside Whop.' });
        }

        if (!userToken.startsWith('Bearer ')) userToken = `Bearer ${userToken}`;

        // 3. CALL WHOP API (Using User Token)
        const response = await fetch('https://api.whop.com/api/v5/company/products', {
            method: 'GET',
            headers: {
                'Authorization': userToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 401) return res.status(401).json({ error: 'Invalid Token.' });
            return res.status(response.status).json({ error: `Whop API Error`, details: errorText });
        }

        const data = await response.json();
        const allProducts = Array.isArray(data) ? data : (data.data || []);

        // 4. FILTER GHOST/INVALID DATA
        // We filter out incomplete or archived items to ensure the UI only shows actionable products.
        const cleanProducts = allProducts.filter((p: any) => {
            if (!p.id || !p.name) return false;
            if (p.name.trim() === '') return false;
            if (p.status === 'archived' || p.visibility === 'hidden') return false;
            return true;
        });

        console.log(`📦 Fetched: ${allProducts.length} -> Cleaned: ${cleanProducts.length}`);

        return res.status(200).json(cleanProducts);

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
