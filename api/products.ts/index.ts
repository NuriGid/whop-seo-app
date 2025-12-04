import type { VercelRequest, VercelResponse } from '@vercel/node';

// Whop API Key'i buradan alacak
const WHOP_API_KEY = process.env.WHOP_CLIENT_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Ayarları (Tarayıcıdan erişim izni)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Tarayıcı ön kontrol (OPTIONS) isteği atarsa "Tamam" de
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (!WHOP_API_KEY) {
      return res.status(500).json({ 
        error: 'WHOP_API_KEY (Server) ayarlanmamis. Vercel ayarlarini kontrol et.' 
      });
    }

    console.log('📚 Whop API üzerinden ürünler çekiliyor...');

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
    console.log('📦 Bulunan ürün sayısı:', productsResponse.data?.length || 0);
    
    // Başarılı yanıtı döndür
    return res.status(200).json(productsResponse);

  } catch (error: any) {
    console.error('Ürünleri çekerken hata:', error);
    return res.status(500).json({ 
      error: 'Sunucu hatası',
      message: error.message 
    });
  }
}
