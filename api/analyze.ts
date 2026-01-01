import * as cookie from 'cookie';

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

// Helper to extract Whop user token from request
function getWhopToken(req: any): string | null {
  // 1. Check for Authorization header (fallback for direct API calls)
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
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
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-company-id, Authorization, Cookie, x-whop-user-token'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed.' });
  }

  try {
    // 🔐 Extract Whop user token
    const token = getWhopToken(req);

    if (!token) {
      console.error('❌ AUTH_REQUIRED: No Whop token found in cookies or headers');
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Authentication required. Please open this app inside Whop.'
      });
    }

    console.log('✅ Authenticated request for analyze');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is missing in Vercel settings!');
    }

    const { prompt } = req.body;
    // HIZLI MODEL
    const model = 'llama-3.1-8b-instant';

    console.log(`⚡️ Groq (${model}) ile analiz basliyor...`);

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
            content: "You are an expert marketing assistant. You Output ONLY valid JSON."
          },
          {
            role: "user",
            content: `Create marketing content for this course.
            
            Strictly return JSON format with these EXACT keys:
            {
              "twitter": "5 tweets separated by newlines",
              "email": "Subject and Body",
              "instagram": "Caption with hashtags",
              "tiktok": "Short video script"
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
      throw new Error(errData.error?.message || "Groq baglanti hatasi");
    }

    const data = await response.json();
    const textAnswer = data.choices?.[0]?.message?.content || "{}";

    console.log("✅ Ham Yanit:", textAnswer);

    // --- CERRAHİ TEMİZLİK ---
    let parsedData: any = {};

    try {
      const firstBrace = textAnswer.indexOf('{');
      const lastBrace = textAnswer.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const cleanJsonString = textAnswer.substring(firstBrace, lastBrace + 1);
        parsedData = JSON.parse(cleanJsonString);
      }
    } catch (e) {
      console.error("JSON Parse Hatasi");
    }

    // --- GARANTİ (POLYMORPHIC RESPONSE) ---
    // Frontend ne beklerse beklesin (eski isimler veya yeni isimler), hepsini dolduruyoruz.
    // Böylece "Invalid Structure" hatası imkansız hale gelir.
    const twitterContent = parsedData.twitter || parsedData.twitterThread || "Generating...";
    const emailContent = parsedData.email || parsedData.salesEmail || "Generating...";
    const instaContent = parsedData.instagram || parsedData.instagramPost || "Generating...";
    const tiktokContent = parsedData.tiktok || parsedData.tiktokScript || "Generating...";

    const safeResponse = {
      // Yeni İsimler
      twitter: twitterContent,
      email: emailContent,
      instagram: instaContent,
      tiktok: tiktokContent,

      // Eski İsimler (Yedek)
      twitterThread: twitterContent,
      salesEmail: emailContent,
      instagramPost: instaContent,
      tiktokScript: tiktokContent
    };

    return res.status(200).json(safeResponse);

  } catch (error: any) {
    console.error("❌ Hata:", error.message);
    return res.status(500).json({ error: error.message });
  }
}