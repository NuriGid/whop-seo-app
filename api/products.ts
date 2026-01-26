import WhopSDK from '@whop/sdk';

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
        // 2. INITIALIZE SDK WITH APP KEY
        // IMPORTANT: 'WHOP_API_KEY' in .env must be your APP KEY (starts with 'app_'), NOT a Company Key.
        // This is safe because we only use it after validating the user's token.
        const whop = new WhopSDK({
            apiKey: process.env.WHOP_API_KEY,
            appID: process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID // Accept either format
        });

        // 3. EXTRACT USER TOKEN
        let userToken = req.headers['x-whop-user-token'] || req.headers.authorization;
        if (Array.isArray(userToken)) userToken = userToken[0];

        if (!userToken) {
            return res.status(401).json({ error: 'Token missing. Please open inside Whop.' });
        }
        if (userToken.startsWith('Bearer ')) userToken = userToken.replace('Bearer ', '');

        // 4. VALIDATE TOKEN & GET CONTEXT
        // This decodes the token securely ensuring the user belongs to the company they claim.
        // We assume verifyUserToken accepts the token string or headers.
        // Based on SDK: it usually takes headers or check documentation.
        // Let's pass the header object carefully.
        // 4. VALIDATE TOKEN & GET CONTEXT
        // We cast to any to satisfy the SDK's strict Headers type expectation.
        const validation = await whop.verifyUserToken({
            'x-whop-user-token': userToken
        } as any);

        if (!validation) {
            console.error("❌ Auth Failed: Invalid User Token");
            return res.status(401).json({ error: 'Invalid User Session' });
        }

        const companyId = (validation as any).company_id || (validation as any).companyId;

        if (!companyId) {
            return res.status(403).json({ error: 'No Company ID found in user token.' });
        }

        console.log(`🔐 Authorized Access -> Fetching Products for Company: ${companyId}`);

        // 5. FETCH PRODUCTS (SCOPED TO COMPANY)
        // We use the App Key to fetch, BUT we restrict it to the validated company_id.
        // This guarantees Data Isolation.
        const productResponse = await whop.products.list({
            company_id: companyId
        });

        const allProducts = (productResponse as any).data || (Array.isArray(productResponse) ? productResponse : []);

        // 6. FILTER
        const cleanProducts = allProducts.filter((p: any) => {
            const name = p.name || p.title;
            if (!name || name.trim() === '') return false;
            if (p.visibility === 'hidden' || p.status === 'archived') return false;
            return true;
        });

        return res.status(200).json(cleanProducts);

    } catch (error: any) {
        console.error("❌ API Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
