/**
 * Whop Course Update API
 * 
 * This endpoint allows the app to directly update a course's description on Whop.
 * This provides the "Native Utility" required for Whop App Store approval.
 * 
 * Uses Whop SDK with courses:update permission.
 */

import WhopSDK from '@whop/sdk';

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
            return res.status(400).json({ error: 'Missing required field: productId (course ID)' });
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
                hint: 'Ensure WHOP_API_KEY is set in Vercel Environment Variables.'
            });
        }

        // 4. INITIALIZE WHOP SDK
        const whop = new WhopSDK({
            apiKey: apiKey,
            appID: process.env.WHOP_APP_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID
        });

        // 5. UPDATE COURSE USING SDK (matches courses:update permission)
        console.log(`📝 Updating course ${productId} description...`);

        const updatedCourse = await whop.courses.update(productId, {
            description: newDescription
        });

        // 6. SUCCESS
        console.log(`✅ Course ${productId} updated successfully`);

        return res.status(200).json({
            success: true,
            message: 'Course description updated successfully on Whop!',
            courseId: productId,
            updatedCourse: updatedCourse
        });

    } catch (error: any) {
        console.error('❌ Update API Error:', error.message);
        console.error('Stack:', error.stack);

        // Handle specific Whop API errors
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            return res.status(401).json({
                error: 'Invalid API Key. Check that WHOP_API_KEY has courses:update permission.',
            });
        }

        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
            return res.status(403).json({
                error: 'Access denied. Ensure the API key has permission to modify this course.',
            });
        }

        if (error.message?.includes('404') || error.message?.includes('Not Found')) {
            return res.status(404).json({
                error: 'Course not found. The course ID may be invalid or deleted.',
            });
        }

        return res.status(500).json({
            error: error.message || 'Internal Server Error',
            hint: 'Check server logs for more details.'
        });
    }
}
