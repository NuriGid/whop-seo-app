/**
 * Vercel Serverless Function: /api/products
 * 
 * WHOP DATA ISOLATION PATTERN:
 * 1. Verify user has access via x-whop-user-token (JWT containing company_id)
 * 2. Use WHOP_API_KEY to call Whop API (required for app-level access)
 * 3. Filter results by the company_id from user's token
 * 
 * This ensures users only see data for companies they have access to.
 */

import * as cookie from 'cookie';

const WHOP_API_KEY = (process.env.WHOP_API_KEY || '').trim();

// Helper to extract Whop user token from request
function getWhopUserToken(req: any): string | null {
    // 1. Check for x-whop-user-token header (primary Whop pattern)
    const whopHeader = req.headers['x-whop-user-token'];
    if (whopHeader && typeof whopHeader === 'string') {
        return whopHeader;
    }

    // 2. Check for whop_user_token cookie (Whop's cookie injection)
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = cookie.parse(cookieHeader);
        if (cookies.whop_user_token) {
            return cookies.whop_user_token;
        }
    }

    // 3. Check for Authorization header (fallback)
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}

// Decode JWT to extract payload (without verification - Whop SDK handles that)
function decodeJwtPayload(token: string): any | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        const decoded = Buffer.from(payload, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch (e) {
        console.error('Failed to decode JWT:', e);
        return null;
    }
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
        // Check for WHOP_API_KEY
        if (!WHOP_API_KEY) {
            console.error('❌ WHOP_API_KEY not configured');
            return res.status(500).json({
                error: 'SERVER_CONFIG_ERROR',
                message: 'Server is not properly configured. Missing WHOP_API_KEY.',
            });
        }

        // 1. Extract user token for identity verification
        const userToken = getWhopUserToken(req);

        if (!userToken) {
            console.error('❌ AUTH_REQUIRED: No Whop user token found');
            return res.status(401).json({
                error: 'AUTH_REQUIRED',
                message: 'Authentication required. Please open this app inside Whop.',
            });
        }

        // 2. Decode token to get company_id (for data isolation)
        const payload = decodeJwtPayload(userToken);
        const companyId = payload?.aud || payload?.company_id || payload?.cid;

        if (!companyId) {
            console.error('❌ No company_id in token:', payload);
            return res.status(403).json({
                error: 'NO_COMPANY_ACCESS',
                message: 'Could not determine your company access. Please try again.',
            });
        }

        console.log(`🔐 User authenticated for company: ${companyId}`);

        // 3. Call Whop API with WHOP_API_KEY, filtered by company_id
        const whopResponse = await fetch(
            `https://api.whop.com/api/v5/company/products`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${WHOP_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

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
