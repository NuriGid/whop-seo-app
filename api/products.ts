// import type { VercelRequest, VercelResponse } from '@vercel/node'; // Bağımlılık hatasını önlemek için kapalı

export default async function handler(req: any, res: any) {
    // 1. CORS AYARLARI (Tarayıcı İzni)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. KULLANICI TOKEN'INI AL (Admin Şifresi ASLA KULLANILMAZ)
        // Önce authorization header'dan, yoksa x-whop-user-token'dan al
        let userToken = req.headers.authorization;

        if (!userToken && req.headers['x-whop-user-token']) {
            userToken = `Bearer ${req.headers['x-whop-user-token']}`;
        }

        if (!userToken) {
            console.error("❌ Hata: Token yok. Headers:", Object.keys(req.headers));
            return res.status(401).json({ error: 'Token eksik. Whop üzerinden açın.' });
        }

        console.log("✅ Token bulundu");
        // 3. WHOP API İSTEĞİ (Token ile Pass-Through)
        // Sadece bu token sahibinin görebileceği ürünleri getirir.
        const response = await fetch('https://api.whop.com/api/v5/company/products', {
            method: 'GET',
            headers: {
                'Authorization': userToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Token süresi dolmuşsa veya geçersizse
            if (response.status === 401) return res.status(401).json({ error: 'Token geçersiz.' });

            const errorText = await response.text();
            return res.status(response.status).json({ error: `Whop API Hatası`, details: errorText });
        }

        const data = await response.json();
        const allProducts = Array.isArray(data) ? data : (data.data || []);

        // 4. GÜMRÜK (FİLTRELEME)
        // İsmi olmayan, silinmiş veya bozuk verileri listeden atıyoruz.
        const cleanProducts = allProducts.filter((p: any) => {
            // ID'si ve İsmi olmak zorunda
            if (!p.id || !p.name) return false;
            // İsmi boşluktan ibaret olmamalı
            if (p.name.trim() === '') return false;
            return true;
        });

        console.log(`📦 Gelen: ${allProducts.length} -> Temizlenen: ${cleanProducts.length}`);

        return res.status(200).json({ data: cleanProducts });

    } catch (error: any) {
        console.error('Sunucu Hatası:', error);
        return res.status(500).json({ error: error.message });
    }
}
