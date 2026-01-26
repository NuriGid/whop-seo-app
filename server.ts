import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Environment configuration
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

console.log('✅ Environment check:');
console.log('   GROQ_API_KEY:', GROQ_API_KEY ? '✓ Set' : '✗ Missing');
const WHOP_API_KEY = (process.env.WHOP_API_KEY || '').trim();
console.log('   WHOP_API_KEY:', WHOP_API_KEY ? '✓ Set' : '✗ Missing');

// Routes - Import Handlers
import productsHandler from './api/products';
import plansHandler from './api/plans';
import paymentsHandler from './api/payments';
import paymentFeesHandler from './api/payment_fees';

// API Route: Get Products
app.get('/api/products', (req, res) => productsHandler(req, res));

// API Route: Get Plans
app.get('/api/plans', (req, res) => plansHandler(req, res));

// API Route: Get Payments
app.get('/api/payments', (req, res) => paymentsHandler(req, res));

// API Route: Get Payment Fees
app.get('/api/payments/:id/fees', (req, res) => paymentFeesHandler(req, res));

// API Route: Analyze Content
app.post('/api/analyze', async (req, res) => {
  try {
    // 🔐 STRICT AUTH ENFORCEMENT - NO FALLBACKS
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      console.error('❌ AUTH_REQUIRED: No Authorization header');
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Authorization header is required. Please open this app inside Whop.',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error('❌ INVALID_TOKEN: Authorization header must be Bearer token');
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Authorization header must be a Bearer token.',
      });
    }

    console.log('✅ Authenticated request for analyze');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is missing in Vercel settings! Please get it from console.groq.com');
    }

    const { prompt } = req.body;
    const model = 'llama-3.1-8b-instant';

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
            content: "You are a marketing content generator. Always output valid JSON with exactly 4 fields: twitterThread, salesEmail, instagramPost, tiktokScript. Each field must be a non-empty string."
          },
          {
            role: "user",
            content: `Generate marketing content in JSON format with these 4 fields:

{
  "twitterThread": "5 tweet thread about the course (separate tweets with ---)",
  "salesEmail": "Sales email with subject and body",
  "instagramPost": "Instagram caption with emojis and hashtags",
  "tiktokScript": "60-second TikTok script with [HOOK], [CONTENT], [CTA]"
}

Course: ${prompt}`
          }
        ],
        temperature: 0.8,  // Higher temperature for more creative and varied content
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

    // Clean response (remove markdown code blocks if present)
    const cleanedText = textAnswer.replace(/```json\n?|```\n?/g, '').trim();

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ JSON parse failed:', cleanedText);
      throw new Error('Failed to parse AI response as JSON. Please try again.');
    }

    // Validate all required fields exist - NO FALLBACKS
    const twitterThread = parsedResult.twitterThread || parsedResult.twitter;
    const salesEmail = parsedResult.salesEmail || parsedResult.email;
    const instagramPost = parsedResult.instagramPost || parsedResult.instagram;
    const tiktokScript = parsedResult.tiktokScript || parsedResult.tiktok;

    if (!twitterThread || !salesEmail || !instagramPost || !tiktokScript) {
      console.error('❌ Incomplete AI response - missing fields');
      throw new Error('AI returned incomplete results. Please try again.');
    }

    const response_data = {
      // Primary keys (used by frontend)
      twitterThread,
      salesEmail,
      instagramPost,
      tiktokScript,
      // Alias keys (for compatibility)
      twitter: twitterThread,
      email: salesEmail,
      instagram: instagramPost,
      tiktok: tiktokScript,
    };

    console.log('✅ Analysis complete with all fields');
    return res.status(200).json(response_data);

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
