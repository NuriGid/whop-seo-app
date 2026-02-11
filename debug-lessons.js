
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.WHOP_API_KEY;
const COURSE_ID = 'cors_bS4tvrK3Imtpb';

async function checkLessons() {
    console.log(`🔍 Checking Lessons for Course: ${COURSE_ID}`);
    console.log(`🔑 API Key: ${API_KEY ? 'Present' : 'Missing'}`);

    const url = `https://api.whop.com/api/v1/course_lessons?course_id=${COURSE_ID}&first=10`;
    console.log(`Request URL: ${url}`);

    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log('Response Body:', text.substring(0, 500)); // Print first 500 chars

    } catch (err) {
        console.error('Error:', err);
    }
}

checkLessons();
