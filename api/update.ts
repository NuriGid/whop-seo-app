/**
 * Whop Product Update API
 * 
 * This endpoint allows the app to directly update a product's description on Whop.
 * This provides the "Native Utility" required for Whop App Store approval.
 */

export default async function handler(req: any, res: any) {
    // 1. CORS HEADERS
    const allowedOrigins = [
        'https://whop.com',
        'https://www.whop.com',
        'https://apps.whop.com',
    ];

    const origin = req.headers.origin || '';
    const isAllowedOrigin = allowedOrigins.some(allowed => origin.includes(allowed)) ||
        origin.includes('.vercel.app');

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin ? origin : '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token, x-whop-company-id');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        // 2. VALIDATE REQUEST BODY
        const { productId, newDescription } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Missing required field: productId' });
        }

        if (!newDescription || typeof newDescription !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid field: newDescription' });
        }

        // 3. CHECK API KEY
        const apiKey = process.env.WHOP_API_KEY;
        if (!apiKey) {
            console.error('❌ WHOP_API_KEY is not set in environment variables');
            return res.status(500).json({
                error: 'Server configuration error: API key not configured.',
                hint: 'Ensure WHOP_API_KEY is set in Vercel Environment Variables with Write/Update permissions.'
            });
        }

        // 4. UPDATE PRODUCT VIA WHOP API V5
        console.log(`📝 Updating product ${productId} description...`);

        const whopResponse = await fetch(`https://api.whop.com/api/v5/company/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: newDescription
            })
        });

        // 5. HANDLE WHOP API RESPONSE
        const responseText = await whopResponse.text();
        let responseData;

        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText };
        }

        if (!whopResponse.ok) {
            console.error(`❌ Whop API Error (${whopResponse.status}):`, responseData);

            // Provide clear error messages for common issues
            if (whopResponse.status === 401) {
                return res.status(401).json({
                    error: 'Invalid API Key. Check that WHOP_API_KEY has write permissions.',
                    details: responseData
                });
            }

            if (whopResponse.status === 403) {
                return res.status(403).json({
                    error: 'Access denied. Ensure the API key has permission to modify this product.',
                    details: responseData
                });
            }

            if (whopResponse.status === 404) {
                return res.status(404).json({
                    error: 'Product not found. The product ID may be invalid or deleted.',
                    details: responseData
                });
            }

            return res.status(whopResponse.status).json({
                error: `Whop API error: ${responseData.message || responseData.error || 'Unknown error'}`,
                details: responseData
            });
        }

        // 6. SUCCESS
        console.log(`✅ Product ${productId} updated successfully`);

        return res.status(200).json({
            success: true,
            message: 'Product description updated successfully on Whop!',
            productId,
            updatedProduct: responseData
        });

    } catch (error: any) {
        console.error('❌ Update API Error:', error.message);
        console.error('Stack:', error.stack);

        return res.status(500).json({
            error: error.message || 'Internal Server Error',
            hint: 'Check server logs for more details.'
        });
    }
}
