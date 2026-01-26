import WhopSDK from '@whop/sdk';

export default async function handler(req: any, res: any) {
    // 1. CORS & CACHE CONTROL
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token, X-Whop-Company-Id');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. EXTRACT AUTH DATA
        let userToken = req.headers.authorization || req.headers['x-whop-user-token'];

        // Normalize Bearer token
        if (Array.isArray(userToken)) userToken = userToken[0];
        if (userToken && userToken.startsWith('Bearer ')) {
            userToken = userToken.substring(7);
        }

        if (!userToken) {
            console.error("❌ Error: No user token provided.");
            return res.status(401).json({ error: 'Token missing. Please open inside Whop.' });
        }

        // Attempt to extract Company ID from Header (Client-provided) or JWT Payload
        let targetCompanyId = req.headers['x-whop-company-id'];
        if (Array.isArray(targetCompanyId)) targetCompanyId = targetCompanyId[0];

        // Fallback: Try decoding the JWT to find company_id
        if (!targetCompanyId) {
            try {
                const parts = userToken.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    // Common claims: company_id, companyId, or specific custom claim
                    targetCompanyId = payload.company_id || payload.companyId || payload.cid;
                }
            } catch (e) {
                console.warn("⚠️ Could not decode token for company_id check", e);
            }
        }

        if (!targetCompanyId) {
            console.error("❌ Error: Could not identify target Company ID.");
            return res.status(400).json({ error: 'Company scope missing. Please ensure the app is opened within a company context.' });
        }

        // 3. INITIALIZE WHOP SDK (APP MODE)
        // We use the Server-Side App API Key to authenticate as the Application.
        // We strictly scope the request to the targetCompanyId.
        const whop = new WhopSDK({
            apiKey: process.env.WHOP_API_KEY
        });

        console.log(`🔐 Fetching products for Company: ${targetCompanyId} (App Mode)`);

        // 4. CALL WHOP API VIA SDK
        // Based on docs: whop.products.list({ company_id: '...' })
        const productResponse = await whop.products.list({
            company_id: targetCompanyId
        });

        // The SDK likely returns a response object with a .data property or the data directly.
        // We need to handle potential pagination wrapper. 
        // Usually SDK returns { data: [...], page_info: ... } or just [...] depending on version.
        // We'll safely unwrap it.

        // Type guard / Check
        const rawData = (productResponse as any).data ? (productResponse as any).data : productResponse;
        const allProducts = Array.isArray(rawData) ? rawData : [];

        // 5. FILTER GHOST/INVALID DATA
        const cleanProducts = allProducts.filter((p: any) => {
            if (!p.id || !p.title && !p.name) return false; // Support both title (v5) and name (legacy)
            const name = p.title || p.name;
            if (!name || name.trim() === '') return false;
            if (p.visibility === 'archived' || p.visibility === 'hidden') return false;
            return true;
        });

        console.log(`📦 Fetched: ${allProducts.length} -> Cleaned: ${cleanProducts.length}`);

        return res.status(200).json({ data: cleanProducts });

    } catch (error: any) {
        console.error("❌ API Error:", error);
        // SDK errors often have a .message or .response
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
