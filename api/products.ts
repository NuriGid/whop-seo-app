// import type { VercelRequest, VercelResponse } from '@vercel/node'; // SİLİNDİ: Hata kaynağı

export default async function handler(req: any, res: any) {
    // 1. CORS VE CACHE AYARLARI
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token');

    // Önbelleği kapatıyoruz ki sildiğin ürün geri gelmesin
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. TOKEN AL (Güvenlik)
        let userToken = req.headers.authorization || req.headers['x-whop-user-token'];
        if (Array.isArray(userToken)) userToken = userToken[0];

        if (!userToken) {
            console.error("❌ Hata: Token yok.");
            // Eski kod çalışsın diye hata yerine boş liste dönebiliriz ama doğrusu 401'dir.
            // Şimdilik sert çıkış yapıyoruz.
            return res.status(401).json({ error: 'Token eksik. Whop üzerinden açın.' });
        }

        if (!userToken.startsWith('Bearer ')) userToken = `Bearer ${userToken}`;

        // 3. API İSTEĞİ
        const response = await fetch('https://api.whop.com/api/v5/company/products', {
            method: 'GET',
            headers: {
                'Authorization': userToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            // Token hatası ise
            if (response.status === 401) return res.status(401).json({ error: 'Token geçersiz.' });
            return res.status(response.status).json({ error: `Whop API Hatası`, details: errorText });
        }

        const data = await response.json();
        const allProducts = Array.isArray(data) ? data : (data.data || []);

        // 🕵️ AJAN LOG: Ürünlerin detaylarını görelim ki silinenleri tespit edelim
        if (allProducts.length > 0) {
            console.log("🔍 İLK ÜRÜN ÖRNEĞİ:", JSON.stringify(allProducts[0], null, 2));
        }

        // 4. GÜMRÜK KONTROLÜ (FİLTRELEME)
        // İşte burası o "hayalet ürünleri" temizler.
        const cleanProducts = allProducts.filter((p: any) => {
            // İsmi olmayanları at
            if (!p.id || !p.name) return false;
            if (p.name.trim() === '') return false;

            // Gelişmiş Filtre: Eğer ürün "archived" veya "hidden" ise gösterme
            // Whop API genelde 'visibility' alanı döner
            if (p.visibility === 'hidden' || p.visibility === 'archived') {
                console.log(`🗑️ Gizli ürün filtrelendi: ${p.name}`);
                return false;
            }

            return true;
        });

        console.log(`📦 Toplam: ${allProducts.length} -> Temiz: ${cleanProducts.length}`);

        // Frontend beklediği format: { data: [...] }
        return res.status(200).json({ data: cleanProducts });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
