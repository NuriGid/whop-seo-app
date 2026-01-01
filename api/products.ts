/**
 * Vercel Serverless Function: /api/products
 * 
 * WHOP IFRAME PASS-THROUGH AUTHENTICATION
 * - Extracts whop_user_token from cookies (Whop's injection pattern)
 * - Falls back to Authorization header if present
 * - Forwards token to Whop API
 * - Returns 401 if no token provided
 */

import * as cookie from 'cookie';

// Helper to extract Whop user token from request
function getWhopToken(req: any): string | null {
    // 1. Check for Authorization header (fallback for direct API calls)
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // 2. Check for whop_user_token cookie (Whop's iframe injection)
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = cookie.parse(cookieHeader);
        if (cookies.whop_user_token) {
            return cookies.whop_user_token;
        }
    }

    // 3. Check for x-whop-user-token header (alternative Whop pattern)
    const whopHeader = req.headers['x-whop-user-token'];
    if (whopHeader && typeof whopHeader === 'string') {
        return whopHeader;
    }

    return null;
}

export default async function handler(req: any, res: any) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, Accept, Cookie, x-whop-user-token'
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
        // Extract Whop user token
        const token = getWhopToken(req);

        if (!token) {
            console.error('❌ AUTH_REQUIRED: No Whop token found in cookies or headers');
            return res.status(401).json({
                error: 'AUTH_REQUIRED',
                message: 'Authentication required. Please open this app inside Whop.',
            });
        }

        console.log('🔐 Pass-through auth: forwarding user token to Whop API...');

        // Forward token to Whop API
        const whopResponse = await fetch('https://api.whop.com/api/v5/company/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const responseData = await whopResponse.json();

        if (!whopResponse.ok) {
            console.error('❌ Whop API error:', whopResponse.status, responseData);
            return res.status(whopResponse.status).json({
                error: responseData.error || 'Whop API request failed',
                message: responseData.message || `Status: ${whopResponse.status}`,
            });
        }

        console.log(`✅ Products fetched: ${responseData.data?.length || 0} items`);
        return res.status(200).json(responseData);

    } catch (error: any) {
        console.error('❌ Server error:', error);
        return res.status(500).json({
            error: 'SERVER_ERROR',
            message: error?.message || 'Internal server error',
        });
    }
}
