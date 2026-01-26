import WhopSDK from '@whop/sdk';

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
        // 2. INITIALIZE SDK
        const whop = new WhopSDK({
            apiKey: process.env.WHOP_API_KEY,
            appID: process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID
        });

        // 3. CONVERT HEADERS TO WEB API FORMAT
        // Whop SDK expects Headers (Web API) format, not Node.js IncomingHttpHeaders
        const webHeaders = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') {
                webHeaders.set(key, value);
            } else if (Array.isArray(value)) {
                webHeaders.set(key, value[0]);
            }
        }

        // Debug: Log important headers
        console.log('🔍 x-whop-user-token:', webHeaders.get('x-whop-user-token') ? 'Present' : 'MISSING');
        console.log('🔍 x-whop-company-id:', webHeaders.get('x-whop-company-id') ? 'Present' : 'MISSING');

        // 4. VERIFY USER TOKEN
        const tokenResult = await whop.verifyUserToken(webHeaders);

        if (!tokenResult || !tokenResult.userId) {
            console.error("❌ Auth Failed: No userId in token result");
            return res.status(401).json({
                error: 'Authentication failed. Please open this app inside Whop Dashboard.'
            });
        }

        const userId = tokenResult.userId;
        console.log(`✅ User verified: ${userId}`);

        // 5. GET COMPANY ID
        const companyId = webHeaders.get('x-whop-company-id');

        if (!companyId) {
            console.error("❌ No x-whop-company-id header");
            return res.status(403).json({
                error: 'Company ID not found. Ensure app is accessed from Whop Dashboard.'
            });
        }

        // 6. CHECK ACCESS
        const access = await whop.users.checkAccess(companyId, { id: userId });

        if (!access.has_access) {
            console.error("❌ User does not have access to company");
            return res.status(403).json({ error: 'Access denied to this company.' });
        }

        console.log(`✅ Access confirmed for company: ${companyId}`);

        // 7. FETCH PRODUCTS
        const productResponse = await whop.products.list({ company_id: companyId });
        const allProducts = (productResponse as any).data ||
            (Array.isArray(productResponse) ? productResponse : []);

        // 8. FILTER
        const cleanProducts = allProducts.filter((p: any) => {
            const name = p.name || p.title;
            if (!name || name.trim() === '') return false;
            if (p.visibility === 'hidden' || p.status === 'archived') return false;
            return true;
        });

        console.log(`✅ Returning ${cleanProducts.length} products`);
        return res.status(200).json(cleanProducts);

    } catch (error: any) {
        console.error("❌ API Error:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
            error: error.message || 'Internal Server Error',
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
