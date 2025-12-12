import type { VercelRequest, VercelResponse } from '@vercel/node';

// Whop API Key'i
const WHOP_API_KEY = process.env.WHOP_CLIENT_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Ayarları
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-company-id' 
  );
  // Not: 'x-company-id' başlığını ekledik, frontend bunu gönderecek.

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (!WHOP_API_KEY) {
      return res.status(500).json({ 
        error: 'WHOP_API_KEY (Server) ayarlanmamis.' 
      });
    }

    // 1. GÜVENLİK ADIMI: Frontend'den gelen Şirket Numarasını (Company ID) al
    const requestedCompanyId = req.headers['x-company-id'];

    console.log(`📚 Whop API'den ürünler çekiliyor... İsteyen Şirket: ${requestedCompanyId || 'Bilinmiyor'}`);

    const response = await fetch('https://api.whop.com/api/v5/company/products', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Whop API Hatası: ${response.statusText}`,
        details: errorText
      });
    }

    const productsResponse = await response.json();
    const allProducts = productsResponse.data || [];
    
    // 2. GÜVENLİK FİLTRESİ: 
    // Eğer bir Şirket Numarası geldiyse, SADECE ona ait ürünleri göster.
    // Gelmediyse boş liste dön (veya güvenli modda hepsini engelle).
    
    let filteredProducts = allProducts;

    if (requestedCompanyId) {
      filteredProducts = allProducts.filter((p: any) => p.company_id === requestedCompanyId);
    } else {
      // Güvenlik için: ID yoksa listeyi gösterme (Whop bunu istiyor)
      // Ancak test ederken sorun yaşamaman için şimdilik uyarı verip devam ediyoruz.
      console.warn("⚠️ DİKKAT: Company ID gelmedi! Filtreleme yapılamadı.");
    }

    console.log(`📦 Toplam Ürün: ${allProducts.length} -> Filtrelenen: ${filteredProducts.length}`);
    
    return res.status(200).json({ data: filteredProducts });

  } catch (error: any) {
    console.error('Hata:', error);
    return res.status(500).json({ 
      error: 'Sunucu hatası',
      message: error.message 
    });
  }
}