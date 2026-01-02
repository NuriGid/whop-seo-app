// import type { VercelRequest, VercelResponse } from '@vercel/node'; // SİLİNDİ: Bağımlılık hatası riski

export default async function handler(req: any, res: any) {
    // 1. CORS VE CACHE AYARLARI (Önbellek Tutma!)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token');

    // ÖNEMLİ: Cache (Önbellek) kapatıldı. Her istekte taze veri çekilecek.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. KULLANICI TOKEN'INI AL (Çift Kontrol)
        let userToken = req.headers.authorization || req.headers['x-whop-user-token'];

        if (Array.isArray(userToken)) userToken = userToken[0];

        if (!userToken) {
            console.error("❌ Hata: Token bulunamadı.");
            return res.status(401).json({ error: 'Token eksik. Whop üzerinden açın.' });
        }

        // Token "Bearer " ile başlamıyorsa ekle
        if (!userToken.startsWith('Bearer ')) {
            userToken = `Bearer ${userToken}`;
        }

        console.log('🔒 Token ile Whop API sorgulanıyor...');

        // 3. WHOP API İSTEĞİ (Pass-Through)
        // Sadece bu token sahibinin görebileceği ürünleri getirir.
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
            return res.status(response.status).json({ error: `Whop API Hatası`, details: errorText });
        }

        const data = await response.json();
        const allProducts = Array.isArray(data) ? data : (data.data || []);

        // 4. TEMİZLİK (Gereksiz veriyi at)
        const cleanProducts = allProducts.filter((p: any) => {
            return p.id && p.name && p.name.trim() !== '';
        });

        console.log(`📦 Taze Veri: ${cleanProducts.length} ürün bulundu.`);

        return res.status(200).json(cleanProducts);

    } catch (error: any) {
        console.error('Sunucu Hatası:', error);
        return res.status(500).json({ error: error.message });
    }
}
