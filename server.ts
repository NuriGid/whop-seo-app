import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { whopsdk } from './lib/whop-sdk';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Whop API configuration
const WHOP_API_KEY = process.env.WHOP_API_KEY || ''; // For Bearer token (products API)
const WHOP_CLIENT_ID = process.env.WHOP_CLIENT_ID || '';
const WHOP_CLIENT_SECRET = process.env.WHOP_CLIENT_SECRET || ''; // For OAuth
const WHOP_REDIRECT_URI = process.env.WHOP_REDIRECT_URI || '';
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

console.log('✅ Environment check:');
console.log('   WHOP_CLIENT_ID:', WHOP_CLIENT_ID ? '✓ Set' : '✗ Missing');
console.log('   WHOP_CLIENT_SECRET:', WHOP_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
console.log('   WHOP_API_KEY:', WHOP_API_KEY ? '✓ Set' : '✗ Missing');
console.log('   GROQ_API_KEY:', GROQ_API_KEY ? '✓ Set' : '✗ Missing');
console.log('   SESSION_SECRET:', process.env.SESSION_SECRET ? '✓ Set' : '✗ Missing');

// API Route: Get Products (Whop iframe pattern with x-whop-user-token)
app.get('/api/products', async (req, res) => {
  try {
    // 1) Get user token from Whop iframe header
    const userTokenHeader = req.headers['x-whop-user-token'];

    if (!userTokenHeader || typeof userTokenHeader !== 'string') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing x-whop-user-token header. This app must be run within Whop Dashboard.',
        needsAuth: true
      });
    }

    // 2) Get companyId from query params (sent from frontend)
    const { companyId } = req.query;

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Missing companyId parameter' });
    }

    console.log(`🔐 Verifying user token for company: ${companyId}`);

    // 3) Verify token and get userId
    const { userId } = await whopsdk.verifyUserToken(userTokenHeader);
    console.log(`✅ User verified: ${userId}`);

    // 4) Check if user has admin access to this company
    const access = await whopsdk.users.checkAccess(companyId, { id: userId });

    if (access.access_level !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'You do not have permission to access this company\'s products' 
      });
    }

    console.log(`🔒 Admin access confirmed for company: ${companyId}`);

    // 5) Fetch products ONLY for this company
    const response = await fetch(
      `https://api.whop.com/api/v5/products?company_id=${companyId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHOP_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: 'Whop API error',
        details: errorText,
      });
    }

    const data = await response.json();
    console.log(`📦 Returning ${data.data?.length || 0} products for company ${companyId}`);

    return res.status(200).json({ data: data.data || [] });

  } catch (error: any) {
    console.error('❌ Products API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
    });
  }
});

// API Route: Analyze Content
app.post('/api/analyze', async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is missing in Vercel settings! Please get it from console.groq.com');
    }

    const { prompt } = req.body;
    const model = 'llama-3.3-70b-versatile';

    console.log(`⚡️ Starting analysis with Groq (${model})...`);
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are an expert content marketing assistant. You create engaging marketing content for online courses. You output ONLY valid JSON."
          },
          {
            role: "user",
            content: `Create marketing content for this course. Return ONLY valid JSON in this exact format:
{
  "twitterThread": "A compelling Twitter thread (5-7 tweets) about this course. Separate each tweet with '\\n\\n---\\n\\n'. Make it engaging and use relevant hashtags.",
  "salesEmail": "A persuasive sales email (subject + body) promoting this course. Include a clear call-to-action.",
  "instagramPost": "An eye-catching Instagram caption with emojis and relevant hashtags. Keep it concise but impactful.",
  "tiktokScript": "A 60-second TikTok video script with: [HOOK] (first 3 seconds to grab attention), [MAIN CONTENT] (key points with trending transitions), [CTA] (strong call-to-action). Include suggested text overlays and trending sounds/music suggestions."
}

Course Description:
${prompt}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Groq API Error:", errData);
      throw new Error(errData.error?.message || `Groq Error: ${response.status}`);
    }

    const data = await response.json();
    const textAnswer = data.choices?.[0]?.message?.content;
    
    if (!textAnswer) throw new Error("Groq returned empty response.");

    console.log("✅ Groq Response:", textAnswer);

    const cleanedText = textAnswer.replace(/```json\n?|```\n?/g, '').trim();
    
    return res.status(200).json(JSON.parse(cleanedText));

  } catch (error: any) {
    console.error("❌ Analysis Error:", error.message);
    return res.status(500).json({ error: error.message || "Unknown server error" });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   - POST http://localhost:${PORT}/api/analyze`);
  console.log(`   - GET  http://localhost:${PORT}/api/products`);
  console.log(`   - GET  http://localhost:${PORT}/health`);
  console.log(`🔐 Whop iframe authentication enabled`);
});
