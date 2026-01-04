import { WhopSDK } from '@whop/sdk';

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
        let userToken = req.headers.authorization || req.headers['x-whop-user-token'];

        if (!userToken && req.headers.cookie) {
            const match = req.headers.cookie.match(/whop_user_token=([^;]+)/);
            if (match) userToken = match[1];
        }

        if (Array.isArray(userToken)) userToken = userToken[0];

        if (!userToken) {
            return res.status(401).json({ error: 'Token eksik (SDK).' });
        }

        // Token temizliği (SDK Bearer isteyebilir)
        if (!userToken.startsWith('Bearer ')) userToken = `Bearer ${userToken}`;

        // 3. SDK BAŞLATMA
        // SDK Kullanımı:
        const whop = new WhopSDK({ token: userToken });

        // 4. API ÇAĞRISI
        const response = await whop.companyProducts.list({
            visibility: 'visible',
            limit: 100
        });

        // SDK dönüş tipine göre data'yı al
        // Genelde response.data veya direkt array döner
        const allProducts = (response as any).data || response || [];

        // 5. FİLTRELEME
        const cleanProducts = Array.isArray(allProducts) ? allProducts.filter((p: any) => {
            if (!p.id || !p.name) return false;
            const name = p.name.trim().toLowerCase();
            const blacklistedTerms = ['benim uygulamam', 'seo assistant', 'crypto trading fu'];
            if (blacklistedTerms.some(term => name.includes(term))) return false;
            if (p.visibility === 'hidden' || p.visibility === 'archived' || p.status === 'deleted') return false;
            return true;
        }) : [];

        return res.status(200).json({ data: cleanProducts });

    } catch (error: any) {
        console.error("SDK Error:", error);
        return res.status(500).json({
            error: `SDK ERROR V1`,
            details: error.message
        });
    }
}
