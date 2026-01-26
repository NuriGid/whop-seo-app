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
        const whop = new WhopSDK({
            apiKey: process.env.WHOP_API_KEY,
            appID: process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID
        });

        // 3. VERIFY USER TOKEN (Get userId from headers)
        // The SDK extracts x-whop-user-token from headers automatically
        const tokenResult = await whop.verifyUserToken(req.headers as any);

        if (!tokenResult || !tokenResult.userId) {
            console.error("❌ Auth Failed: Could not verify user token");
            return res.status(401).json({
                error: 'Authentication failed. Please open this app inside Whop Dashboard.'
            });
        }

        const userId = tokenResult.userId;
        console.log(`✅ User verified: ${userId}`);

        // 4. GET COMPANY ID FROM HEADERS OR TOKEN
        // The company context is passed via headers by the Whop iframe
        const companyId = req.headers['x-whop-company-id'] ||
            (tokenResult as any).companyId ||
            (tokenResult as any).company_id;

        if (!companyId) {
            console.error("❌ No company ID found in request");
            return res.status(403).json({
                error: 'Company ID not found. Please ensure app is installed on your company.'
            });
        }

        // 5. CHECK USER ACCESS TO COMPANY (Security validation) 
        // This confirms the user actually has access to this company
        try {
            const access = await whop.users.checkAccess(companyId, { id: userId });
            console.log(`✅ Access confirmed for user ${userId} to company ${companyId}`);
        } catch (accessError: any) {
            console.error("❌ Access check failed:", accessError.message);
            return res.status(403).json({
                error: 'User does not have access to this company.'
            });
        }

        // 6. FETCH PRODUCTS (Scoped to validated company)
        // Now safe to fetch - we've validated the user has access
        console.log(`📦 Fetching products for company: ${companyId}`);

        const productResponse = await whop.products.list({
            company_id: companyId
        });

        const allProducts = (productResponse as any).data ||
            (Array.isArray(productResponse) ? productResponse : []);

        // 7. FILTER (Remove hidden/archived)
        const cleanProducts = allProducts.filter((p: any) => {
            const name = p.name || p.title;
            if (!name || name.trim() === '') return false;
            if (p.visibility === 'hidden' || p.status === 'archived') return false;
            return true;
        });

        console.log(`✅ Returning ${cleanProducts.length} products`);
        return res.status(200).json(cleanProducts);

    } catch (error: any) {
        console.error("❌ API Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
