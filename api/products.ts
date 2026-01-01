/**
 * Vercel Serverless Function: /api/products
 * 
 * STRICT PASS-THROUGH AUTHENTICATION
 * - Extracts Authorization header from incoming request
 * - Forwards EXACT token to Whop API
 * - Returns 401 if no token provided
 * - NO FALLBACK DATA - NO MOCK DATA
 */

export default async function handler(req: any, res: any) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, Accept'
    );

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    try {
        // 1️⃣ STRICT AUTH: Extract Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || typeof authHeader !== 'string') {
            console.error('❌ AUTH_REQUIRED: No Authorization header');
            return res.status(401).json({
                error: 'AUTH_REQUIRED',
                message: 'Authorization header is required. Please open this app inside Whop.',
            });
        }

        // Ensure it's a Bearer token
        if (!authHeader.startsWith('Bearer ')) {
            console.error('❌ INVALID_TOKEN: Authorization header must be Bearer token');
            return res.status(401).json({
                error: 'INVALID_TOKEN',
                message: 'Authorization header must be a Bearer token.',
            });
        }

        console.log('🔐 Pass-through auth: forwarding user token to Whop API...');

        // 2️⃣ PASS-THROUGH: Forward EXACT token to Whop API
        const whopResponse = await fetch('https://api.whop.com/api/v5/company/products', {
            method: 'GET',
            headers: {
                'Authorization': authHeader, // Forward exact token
                'Content-Type': 'application/json',
            },
        });

        // 3️⃣ Forward response status and data
        const responseData = await whopResponse.json();

        if (!whopResponse.ok) {
            console.error('❌ Whop API error:', whopResponse.status, responseData);
            return res.status(whopResponse.status).json({
                error: responseData.error || 'Whop API request failed',
                message: responseData.message || `Status: ${whopResponse.status}`,
            });
        }

        console.log(`✅ Products fetched: ${responseData.data?.length || 0} items`);

        // Return Whop API response directly (no transformation)
        return res.status(200).json(responseData);

    } catch (error: any) {
        console.error('❌ Server error:', error);
        return res.status(500).json({
            error: 'SERVER_ERROR',
            message: error?.message || 'Internal server error',
        });
    }
}
