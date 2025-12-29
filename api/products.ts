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
    // 🔐 STRICT AUTH ENFORCEMENT
    const isDev = process.env.NODE_ENV === 'development';
    
    // 1️⃣ Get token from Authorization header (preferred)
    let userToken = req.headers.authorization;
    if (Array.isArray(userToken)) userToken = userToken[0];
    
    // DEBUG LOGS
    console.log('Authorization header:', req.headers.authorization);
    console.log('Parsed token:', userToken);
    
    // 2️⃣ Development fallback: allow query param token
    if (!userToken && isDev) {
      userToken = req.query.token;
      if (userToken) {
        console.log('🚧 DEV MODE: Using token from query param');
      }
    }

    // 🚧 LOCAL DEV MODE: Return mock data for mock token
    if (userToken && (userToken === 'Bearer mock_token_for_local_dev' || userToken === 'mock_token_for_local_dev')) {
      console.log('🚧 DEV MODE: Using mock data');
      return res.status(200).json({
        company_id: 'mock_company_123',
        products: [
          {
            id: 'prod_mock_1',
            name: 'Sample Course 1',
            description: 'This is a sample course for local development testing.'
          },
          {
            id: 'prod_mock_2',
            name: 'Sample Course 2',
            description: 'Another sample course with more content for testing.'
          }
        ]
      });
    }

    // 3️⃣ Production: NO token = hard fail
    if (!userToken) {
      console.error('❌ AUTH_REQUIRED: No token provided');
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Authentication token required. Please open this app inside Whop.'
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
