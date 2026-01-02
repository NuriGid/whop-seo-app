// import type { VercelRequest, VercelResponse } from '@vercel/node'; // SİLİNDİ: 500 Hatası Kaynağı

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. API KEY KONTROLÜ
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY eksik! Vercel ayarlarını kontrol et.');

    const { prompt } = req.body;
    const model = 'llama-3.1-8b-instant';

    console.log(`⚡️ Groq (${model}) çalışıyor...`);

    // 2. GROQ İSTEĞİ
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
            content: `Create marketing content. Return JSON keys: twitter, email, instagram, tiktok.
            Course: ${prompt}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Groq Hatası");
    }

    const data = await response.json();
    const textAnswer = data.choices?.[0]?.message?.content || "{}";

    // 3. JSON PARSE VE GARANTİLEME
    let parsedData: any = {};
    try {
      const firstBrace = textAnswer.indexOf('{');
      const lastBrace = textAnswer.lastIndexOf('}');
      if (firstBrace !== -1) {
        parsedData = JSON.parse(textAnswer.substring(firstBrace, lastBrace + 1));
      }
    } catch (e) { console.error("JSON Parse Hatası"); }

    // Frontend ne beklerse beklesin dolu gönderiyoruz
    const fallback = "Generating content...";
    const safeResponse = {
      twitter: parsedData.twitter || parsedData.twitterThread || fallback,
      email: parsedData.email || parsedData.salesEmail || fallback,
      instagram: parsedData.instagram || parsedData.instagramPost || fallback,
      tiktok: parsedData.tiktok || parsedData.tiktokScript || fallback
    };

    return res.status(200).json(safeResponse);

  } catch (error: any) {
    console.error("❌ Analiz Hatası:", error.message);
    return res.status(500).json({ error: error.message });
  }
}