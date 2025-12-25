export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1️⃣ USER TOKEN
    const authHeader = req.headers.authorization;
    const userToken = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!userToken) {
      return res.status(401).json({
        error: 'Authorization token missing'
      });
    }

    // 2️⃣ USER INFO → ACTIVE COMPANY
    const meRes = await fetch('https://api.whop.com/api/v5/me', {
      headers: {
        Authorization: userToken,
        'Content-Type': 'application/json'
      }
    });

    if (!meRes.ok) {
      return res.status(401).json({
        error: 'Failed to fetch user info'
      });
    }

    const meData = await meRes.json();
    const companyId = meData?.active_company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'active_company_id not found'
      });
    }

    // 3️⃣ PRODUCTS → COMPANY SCOPED
    const productsRes = await fetch(
      `https://api.whop.com/api/v5/company/products?company_id=${companyId}`,
      {
        headers: {
          Authorization: userToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!productsRes.ok) {
      const txt = await productsRes.text();
      return res.status(productsRes.status).json({
        error: 'Failed to fetch products',
        details: txt
      });
    }

    const products = await productsRes.json();

    // 4️⃣ SADECE BU COMPANY
    return res.status(200).json({
      company_id: companyId,
      products
    });

  } catch (err) {
    console.error('SERVER ERROR:', err);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
