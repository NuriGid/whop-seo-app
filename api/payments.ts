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
        // 2. INITIALIZE WHOP SDK
        const whop = new WhopSDK({
            apiKey: process.env.WHOP_API_KEY
        });

        // 3. VERIFY USER TOKEN (SECURE)
        const validation = await whop.verifyUserToken(req.headers);

        if (!validation) {
            console.error("❌ Auth Failed: verifyUserToken returned null");
            return res.status(401).json({ error: 'Authentication failed' });
        }

        // Map the secure validation result to targetCompanyId
        const targetCompanyId = (validation as any).companyId || (validation as any).company_id;

        if (!targetCompanyId) {
            console.error("❌ Error: Could not identify target Company ID from secure token.");
            return res.status(400).json({ error: 'Company scope missing. Please ensure the app is opened within a company context.' });
        }

        console.log(`🔐 Fetching payments for Company: ${targetCompanyId} (App Mode)`);

        // 4. CALL WHOP API VIA SDK
        // Docs: whop.payments.list({ company_id: '...' })
        const response = await whop.payments.list({
            company_id: targetCompanyId
        });

        const rawData = (response as any).data ? (response as any).data : response;
        const allPayments = Array.isArray(rawData) ? rawData : [];

        console.log(`📦 Fetched: ${allPayments.length} Payments`);

        return res.status(200).json({ data: allPayments });

    } catch (error: any) {
        console.error("❌ API Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
