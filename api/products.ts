export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Token'ı birden fazla yerden ara
        let userToken = req.headers.authorization;

        // x-whop-user-token header'dan da kontrol et
        if (!userToken && req.headers['x-whop-user-token']) {
            userToken = `Bearer ${req.headers['x-whop-user-token']}`;
        }

        if (!userToken) {
            console.error("❌ Token yok.");
            return res.status(401).json({ error: 'Token eksik. Whop üzerinden açın.' });
        }

        console.log("✅ Token bulundu, Whop API'ye istek gönderiliyor...");

        const response = await fetch('https://api.whop.com/api/v5/company/products', {
            method: 'GET',
            headers: {
                'Authorization': userToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) return res.status(401).json({ error: 'Token geçersiz.' });
            const errorText = await response.text();
            console.error("❌ Whop API hatası:", response.status, errorText);
            return res.status(response.status).json({ error: `Whop API Hatası`, details: errorText });
        }

        const data = await response.json();
        console.log("✅ Ürünler alındı:", data.data?.length || 0);
        return res.status(200).json(data);

    } catch (error: any) {
        console.error("❌ Sunucu hatası:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
