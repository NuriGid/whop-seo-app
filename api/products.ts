import type { VercelRequest, VercelResponse } from '@vercel/node';

// Whop API Key'i
const WHOP_API_KEY = process.env.WHOP_CLIENT_SECRET || '';

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
    if (!WHOP_API_KEY) {
      return res.status(500).json({ 
        error: 'WHOP_API_KEY (Server) ayarlanmamış.' 
      });
    }

    // 1. GÜVENLİK: Company ID zorunlu (multi-tenancy)
    const requestedCompanyId = (req.query.companyId as string) || req.headers['x-company-id'];

    console.log(`📚 Whop API'den ürünler çekiliyor... İsteyen Şirket: ${requestedCompanyId || 'Bilinmiyor'}`);
    
    // 🔒 CRITICAL SECURITY: Company ID is REQUIRED for multi-tenancy
    if (!requestedCompanyId) {
      console.error('❌ SECURITY ERROR: No company ID provided!');
      return res.status(403).json({
        error: 'Forbidden: Company ID is required',
        message: 'Access denied. Please provide a valid company ID.'
      });
    }

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
    
    // 2. GÜVENLİK FİLTRESİ: SADECE bu company'nin ürünlerini göster!
    const filteredProducts = allProducts.filter((p: any) => p.company_id === requestedCompanyId);

    console.log(`📦 Toplam Ürün: ${allProducts.length} -> ${requestedCompanyId} için Filtrelenen: ${filteredProducts.length}`);
    
    // 🔒 SECURITY LOG: Show which company's data is being returned
    console.log(`✅ Returning ${filteredProducts.length} products for company: ${requestedCompanyId}`);
    
    return res.status(200).json({ data: filteredProducts });

  } catch (error: unknown) {
    // Hata tipini güvenli hale getir
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen Hata';
    console.error('Sunucu Hatası:', errorMessage);
    
    return res.status(500).json({ 
      error: 'Sunucu hatası',
      message: errorMessage 
    });
  }
}