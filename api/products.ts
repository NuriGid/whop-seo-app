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
        // We send the token as 'x-whop-user-token' which is how the Proxy expects user identity.
        // We DO NOT use 'Authorization' because that expects a static API Key.
        const response = await fetch('https://api.whop.com/api/v5/company/products', {
            method: 'GET',
            headers: {
                'x-whop-user-token': userToken.replace('Bearer ', ''),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            // If 401/403, it means the token isn't allowed to see this company's data. Good.
            if (response.status === 401 || response.status === 403) {
                return res.status(401).json({ error: 'Unauthorized: User does not have access to this company.' });
            }
            return res.status(response.status).json({ error: `Whop API Error: ${response.status}`, details: errorText });
        }

        const data = await response.json();
        const allProducts = Array.isArray(data) ? data : (data.data || []);

        // 4. FILTER GHOST/INVALID DATA
        const cleanProducts = allProducts.filter((p: any) => {
            if (!p.id || !p.name) return false;
            if (p.name.trim() === '') return false;
            if (p.status === 'archived' || p.visibility === 'hidden') return false;
            return true;
        });

        console.log(`📦 Fetched: ${allProducts.length} -> Cleaned: ${cleanProducts.length}`);

        return res.status(200).json(cleanProducts);

    } catch (error: any) {
        console.error("❌ API Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
