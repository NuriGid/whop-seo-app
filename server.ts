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
      console.log('⚠️ No x-whop-user-token - Fallback: fetching all products');
      
      // Fallback: return all products
      const response = await fetch('https://api.whop.com/api/v5/company/products', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Whop API Error:', errorText);
        return res.status(response.status).json({
          error: `Whop API Error: ${response.statusText}`,
          details: errorText
        });
      }

      const productsResponse = await response.json();
      console.log(`📦 Fallback: Returning ${productsResponse.data?.length || 0} products`);
      return res.status(200).json({ data: productsResponse.data || [] });
    }

    // 2) Get companyId from query params (sent from frontend)
    const { companyId } = req.query;

    // If no companyId, use fallback approach
    if (!companyId || typeof companyId !== 'string') {
      console.log('⚠️ No companyId in query - Fallback: fetching all products');
      
      const response = await fetch('https://api.whop.com/api/v5/company/products', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: 'Whop API error',
          details: errorText,
        });
      }

      const data = await response.json();
      console.log(`📦 Fallback: Returning ${data.data?.length || 0} products`);
      return res.status(200).json({ data: data.data || [] });
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

    // Clean response (remove markdown code blocks if present)
    const cleanedText = textAnswer.replace(/```json\n?|```\n?/g, '').trim();
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedText);
    } catch (parseError) {
      // If JSON parsing fails, try to extract fields manually
      console.warn('⚠️ JSON parse failed, attempting manual extraction...');
      console.log('Raw response:', cleanedText);
      
      // Check if response is already an object (sometimes Groq returns it directly)
      if (typeof cleanedText === 'object') {
        parsedResult = cleanedText;
      } else {
        throw new Error('Failed to parse Groq response as JSON');
      }
    }
    
    // Ensure all required fields exist - add fallbacks if missing
    if (!parsedResult.twitterThread) {
      parsedResult.twitterThread = 'Twitter content generation failed. Please try again.';
    }
    if (!parsedResult.salesEmail) {
      parsedResult.salesEmail = 'Email content generation failed. Please try again.';
    }
    if (!parsedResult.instagramPost) {
      parsedResult.instagramPost = 'Instagram content generation failed. Please try again.';
    }
    if (!parsedResult.tiktokScript) {
      console.warn('⚠️ tiktokScript missing, generating fallback...');
      parsedResult.tiktokScript = `[HOOK] 🎬 Want to learn more about this amazing course?

[MAIN CONTENT] Discover everything you need to know with our comprehensive guide. Perfect for beginners and experts alike!

[CTA] 📲 Click the link in bio to enroll now! #Course #Learning #Education`;
    }
    
    console.log('✅ Final response with all fields:', Object.keys(parsedResult));
    return res.status(200).json(parsedResult);

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
