
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.WHOP_API_KEY;
const COURSE_ID = 'cors_bS4tvrK3Imtpb';

async function checkCourse() {
    console.log(`🔍 Checking Course: ${COURSE_ID}`);
    console.log(`🔑 API Key: ${API_KEY ? 'Present' : 'Missing'}`);

    try {
        // Try v1 GET
        console.log('\n--- Attempting v1 GET ---');
        const res = await fetch(`https://api.whop.com/api/v1/courses/${COURSE_ID}`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Course Found!');
            console.log('Name:', data.name);
            console.log('Description:', data.description);
        } else {
            console.log('❌ Course Not Found (or no read/write access)');
            console.log('Response:', await res.text());
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

checkCourse();
