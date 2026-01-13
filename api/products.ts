
export default async function handler(req: any, res: any) {
    // 1. CORS VE CACHE
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // 2. TOKEN ÇIKARMA
        const envApiKey = process.env.WHOP_API_KEY;
        let authHeader = req.headers.authorization || req.headers['x-whop-user-token'];

        // Cookie Fallback
        if (!authHeader && req.headers.cookie) {
            const match = req.headers.cookie.match(/whop_user_token=([^;]+)/);
            if (match) authHeader = match[1];
        }

        if (Array.isArray(authHeader)) authHeader = authHeader[0];

        // KARAR ANI: API Key mi, User Token mı?
        let finalToken = '';

        if (envApiKey) {
            console.log("🔑 Using Server API Key (Priority)");
            finalToken = envApiKey.startsWith('Bearer ') ? envApiKey : `Bearer ${envApiKey}`;
        } else if (authHeader) {
            console.log("👤 Using User Token (Client)");
            finalToken = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
        } else {
            return res.status(401).json({ error: 'Token eksik. API Key veya User Token yok.' });
        }

        // 3. API İSTEĞİ (MANUEL FETCH)
        const response = await fetch('https://api.whop.com/api/v5/company/products', {
            method: 'GET',
            headers: {
                'Authorization': finalToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Whop API Error:", response.status, errorText);

            if (response.status === 401) {
                return res.status(401).json({
                    error: 'Authentication Failed (401)',
                    details: 'Check WHOP_API_KEY or User Permissions.'
                });
            }
            return res.status(response.status).json({ error: `API ERROR V-KEY`, details: errorText });
        }

        const data = await response.json();
        const allProducts = Array.isArray(data) ? data : (data.data || []);

        // 4. FİLTRELEME
        const cleanProducts = Array.isArray(allProducts) ? allProducts.filter((p: any) => {
            if (!p.id || !p.name) return false;
            const name = p.name.trim().toLowerCase();
            const blacklistedTerms = ['benim uygulamam', 'seo assistant'];
            if (blacklistedTerms.some(term => name.includes(term))) return false;
            if (p.visibility === 'hidden' || p.visibility === 'archived' || p.status === 'deleted') return false;
            return true;
        }) : [];

        return res.status(200).json({ data: cleanProducts });

    } catch (error: any) {
        console.error("Handler Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
