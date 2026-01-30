/**
 * Whop Courses API
 * 
 * Lists courses for the company using Whop SDK.
 * Uses courses:read permission.
 */

import WhopServerSdk from '@whop/sdk';

export default async function handler(req: any, res: any) {
    // 1. CORS & CACHE CONTROL
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-whop-user-token, x-whop-company-id');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. INITIALIZE SDK
        const whop = new WhopServerSdk({
            apiKey: process.env.WHOP_API_KEY!,
        });

        // 3. CONVERT HEADERS TO WEB API FORMAT
        const webHeaders = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') {
                webHeaders.set(key, value);
            } else if (Array.isArray(value)) {
                webHeaders.set(key, value[0]);
            }
        }

        // Debug: Log important headers
        console.log('🔍 x-whop-user-token:', webHeaders.get('x-whop-user-token') ? 'Present' : 'MISSING');
        console.log('🔍 x-whop-company-id:', webHeaders.get('x-whop-company-id') ? 'Present' : 'MISSING');

        // 4. VERIFY USER TOKEN
        const tokenResult = await whop.verifyUserToken(webHeaders);

        if (!tokenResult || !tokenResult.userId) {
            console.error("❌ Auth Failed: No userId in token result");
            return res.status(401).json({
                error: 'Authentication failed. Please open this app inside Whop Dashboard.'
            });
        }

        const userId = tokenResult.userId;
        console.log(`✅ User verified: ${userId}`);

        // 5. GET COMPANY ID
        const companyId = webHeaders.get('x-whop-company-id');
        console.log(`🏢 Company ID from header: ${companyId || 'NOT FOUND'}`);

        if (!companyId) {
            console.error("❌ No x-whop-company-id header");
            return res.status(403).json({
                error: 'Company ID not found. Ensure app is accessed from Whop Dashboard.'
            });
        }

        // 6. FETCH COURSES
        console.log(`📡 Fetching courses for company: ${companyId}`);

        const allCourses: any[] = [];

        // Use async iterator pattern from SDK docs
        for await (const course of whop.courses.list({ company_id: companyId })) {
            allCourses.push({
                id: course.id,
                name: course.title || 'Untitled Course',
                title: course.title,
                description: course.description,
                visibility: course.visibility,
                tagline: course.tagline
            });
        }

        console.log(`✅ Returning ${allCourses.length} courses`);
        return res.status(200).json(allCourses);

    } catch (error: any) {
        console.error('❌ API Error:', error.message);
        console.error('Stack:', error.stack);
        return res.status(500).json({
            error: error.message || 'Internal Server Error'
        });
    }
}
