
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Helper to return error visible in UI fields
  const returnError = (msg: string, details: string = '') => {
    console.error(`❌ HATA: ${msg}`, details);
    return res.status(200).json({
      twitter: `🔴 HATA: ${msg}`,
      email: `🔴 HATA: ${msg}\n\nDetay: ${details}`,
      instagram: `🔴 HATA: ${msg}`,
      tiktok: `🔴 HATA: ${msg}`,
      twitterThread: `🔴 HATA: ${msg}`,
      salesEmail: `🔴 HATA: ${msg}\n\nDetay: ${details}`,
      instagramPost: `🔴 HATA: ${msg}`,
      tiktokScript: `🔴 HATA: ${msg}`
    });
  };

  if (req.method !== 'POST') return returnError('Sadece POST isteği.');

  try {
    if (!GROQ_API_KEY) {
      return returnError('GROQ_API_KEY EKSİK', 'Vercel Env Variables kontrol edin.');
    }

    if (!req.body || !req.body.prompt) {
      return returnError('Prompt verisi gelmedi');
    }

    const { prompt } = req.body;
    const model = 'llama-3.1-8b-instant';

    console.log(`⚡️ Groq İsteği: ${model}`);

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
            content: `You are a marketing content generator. Generate marketing content and return ONLY a valid JSON object (no markdown, no code blocks). 
            
            Return exactly this structure:
            {"twitter": "tweet text here", "email": "email text here", "instagram": "instagram caption here", "tiktok": "tiktok script here"}`
          },
          {
            role: "user",
            content: `Generate marketing content for this course. Return ONLY JSON, no markdown:
            
            ${prompt}`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return returnError(`Groq API Hatası (${response.status})`, errText);
    }

    const data = await response.json();
    let textAnswer = data.choices?.[0]?.message?.content || "{}";

    console.log("📝 Ham Yanıt:", textAnswer.substring(0, 200));

    // Clean markdown code blocks if present
    textAnswer = textAnswer
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Find JSON object
    let parsedData: any = {};
    try {
      const firstBrace = textAnswer.indexOf('{');
      const lastBrace = textAnswer.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = textAnswer.substring(firstBrace, lastBrace + 1);
        parsedData = JSON.parse(jsonString);
        console.log("✅ JSON Parse Başarılı");
      } else {
        return returnError("JSON Bulunamadı", textAnswer.substring(0, 100));
      }
    } catch (e) {
      return returnError("JSON Parse Hatası", textAnswer.substring(0, 100));
    }

    // Extract content - handle both flat and nested structures
    const extractText = (obj: any, key: string): string => {
      if (!obj) return "İçerik üretilemedi.";

      const value = obj[key];
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value !== null) {
        // Check for nested text property
        return value.text || value.content || value.message || JSON.stringify(value);
      }
      return "İçerik üretilemedi.";
    };

    const finalResponse = {
      twitter: extractText(parsedData, 'twitter'),
      email: extractText(parsedData, 'email'),
      instagram: extractText(parsedData, 'instagram'),
      tiktok: extractText(parsedData, 'tiktok'),
      twitterThread: extractText(parsedData, 'twitter'),
      salesEmail: extractText(parsedData, 'email'),
      instagramPost: extractText(parsedData, 'instagram'),
      tiktokScript: extractText(parsedData, 'tiktok')
    };

    return res.status(200).json(finalResponse);

  } catch (error: any) {
    return returnError("Sunucu Hatası", error.message);
  }
}