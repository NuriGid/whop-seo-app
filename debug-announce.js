
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.WHOP_API_KEY;
const COMPANY_ID = 'biz_hRcZv2fxhfD0um'; // Extracted from user context

async function debugAnnounce() {
    console.log(`🔍 Debugging Announcements`);
    console.log(`🔑 API Key starts with: ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'MISSING'}`);

    try {
        // 1. Check "Who Am I" (if possible) or Company Info
        console.log('\n--- 1. Checking Company Access (GET /v1/companies) ---');
        // Note: This endpoint might not exist or be accessible, but it's a good probe
        const meRes = await fetch('https://api.whop.com/api/v1/companies', {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        console.log(`Status: ${meRes.status}`);
        if (meRes.ok) {
            const data = await meRes.json();
            console.log('companies:', JSON.stringify(data, null, 2));
        } else {
            console.log('Response:', await meRes.text());
        }

        // 2. Test Notification v2
        console.log('\n--- 2. Testing POST /v2/notifications ---');
        const payload = {
            title: "Debug Notification",
            content: "This is a test from debug script.",
            company_id: COMPANY_ID
        };

        const notifRes = await fetch('https://api.whop.com/api/v2/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${notifRes.status}`);
        console.log(`Response: ${await notifRes.text()}`);

    } catch (err) {
        console.error('Error:', err);
    }
}

debugAnnounce();
