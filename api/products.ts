export default async function handler(req, res) {
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
    // 1. KULLANICI TOKEN'INI AL (Pass-Through Auth)
    const authHeader = req.headers.authorization;
    const userToken = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!userToken) {
      console.error("❌ Hata: İstekte Authorization token yok.");
      return res.status(401).json({ 
        error: 'Oturum anahtarı (Token) eksik. Lütfen sayfayı yenileyin.' 
      });
    }

    console.log('🔒 Kullanıcı Token ile Whop API sorgulanıyor...');

    // 2. PASS-THROUGH: User token'ı direkt Whop'a ilet
    // Whop API otomatik olarak sadece o user'ın company'sine ait veriyi döner
    const response = await fetch('https://api.whop.com/api/v5/company/products', {
      method: 'GET',
      headers: {
        'Authorization': userToken,  // User token'ı olduğu gibi ilet
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Whop API Hatası (${response.status}):`, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Yetkisiz erişim. Token geçersiz.' 
        });
      }
      
      return res.status(response.status).json({
        error: `Whop API Hatası: ${response.statusText}`,
        details: errorText
      });
    }

    const productsResponse = await response.json();
    
    // 3. Veriyi olduğu gibi dön (Whop zaten filtreledi)
    return res.status(200).json(productsResponse);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen Hata';
    console.error('Sunucu Hatası:', errorMessage);
    
    return res.status(500).json({ 
      error: 'Sunucu hatası',
      message: errorMessage 
    });
  }
}