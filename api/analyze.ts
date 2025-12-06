import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Ayarları
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Sadece POST isteğini kabul et
  if (req.method !== 'POST') {
     return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log("⚡️ Analiz isteği geldi. Gemini modelleri deneniyor...");
  
  try {
    const { prompt } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY eksik!' });
    }

    // Yedekli model stratejisi
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`🔍 Deneniyor: ${modelName}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

        const aiResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expert in marketing and SEO for online courses on Whop.com.

Analyze this course description and return ONLY valid JSON in this exact format:
{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "categories": ["Category 1", "Category 2", "Category 3"]
}

Choose categories from: Trading & Investing, E-commerce, Software & Tools, Fitness & Health, Education, Gaming, Crypto & NFTs, Social Media Marketing, Cooking, Music Production

Course Description:
${prompt}` 
              }]
            }]
          })
        });

        if (!aiResponse.ok) {
          const errData = await aiResponse.json();
          if (aiResponse.status === 404) {
             continue; // Model bulunamadı, sonrakine geç
          }
          throw new Error(errData.error?.message || "Unknown API Error");
        }

        const data = await aiResponse.json();
        const textAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textAnswer) throw new Error("Boş yanıt döndü.");

        const cleanedText = textAnswer.replace(/```json\n?|```\n?/g, '').trim();
        
        return res.status(200).json(JSON.parse(cleanedText));

      } catch (error: any) {
        lastError = error.message;
      }
    }

    throw new Error(`Hiçbir model çalışmadı. Son hata: ${lastError}`);

  } catch (error: any) {
    console.error("❌ Hata:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
