import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS İzinleri
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
    // 1. KULLANICI KİMLİĞİNİ AL (Senin şifren değil!)
    const userToken = req.headers.authorization;

    if (!userToken) {
      console.error("❌ Hata: İstekte Authorization token yok.");
      return res.status(401).json({ error: 'Oturum anahtarı (Token) eksik. Lütfen sayfayı yenileyin.' });
    }

    console.log('🔒 Kullanıcı Tokenı ile Whop API sorgulanıyor...');

    // 2. KÖPRÜ OL (Pass-through): Token'ı direkt Whop'a ilet.
    // API sadece o token sahibinin verisini döner. İzolasyon %100 sağlanır.
    const response = await fetch('https://api.whop.com/api/v5/company/products', {
      method: 'GET',
      headers: {
        'Authorization': userToken, // "Bearer ey..." formatında gelir
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Whop API Hatası (${response.status}):`, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Yetkisiz erişim. Token geçersiz.' });
      }
      
      return res.status(response.status).json({
        error: `Whop Veri Hatası: ${response.statusText}`,
        details: errorText
      });
    }

    const productsResponse = await response.json();
    
    // Veriyi olduğu gibi dön.
    return res.status(200).json(productsResponse);

  } catch (error: any) {
    console.error('Sunucu Hatası:', error);
    return res.status(500).json({ 
      error: 'Sunucu hatası',
      message: error.message 
    });
  }
}import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS İzinleri
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
    // 1. KULLANICI KİMLİĞİNİ AL (Senin şifren değil!)
    const userToken = req.headers.authorization;

    if (!userToken) {
      console.error("❌ Hata: İstekte Authorization token yok.");
      return res.status(401).json({ error: 'Oturum anahtarı (Token) eksik. Lütfen sayfayı yenileyin.' });
    }

    console.log('🔒 Kullanıcı Tokenı ile Whop API sorgulanıyor...');

    // 2. KÖPRÜ OL (Pass-through): Token'ı direkt Whop'a ilet.
    // API sadece o token sahibinin verisini döner. İzolasyon %100 sağlanır.
    const response = await fetch('https://api.whop.com/api/v5/company/products', {
      method: 'GET',
      headers: {
        'Authorization': userToken, // "Bearer ey..." formatında gelir
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Whop API Hatası (${response.status}):`, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Yetkisiz erişim. Token geçersiz.' });
      }
      
      return res.status(response.status).json({
        error: `Whop Veri Hatası: ${response.statusText}`,
        details: errorText
      });
    }

    const productsResponse = await response.json();
    
    // Veriyi olduğu gibi dön.
    return res.status(200).json(productsResponse);

  } catch (error: any) {
    console.error('Sunucu Hatası:', error);
    return res.status(500).json({ 
      error: 'Sunucu hatası',
      message: error.message 
    });
  }
}