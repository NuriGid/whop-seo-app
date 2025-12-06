import type { VercelRequest, VercelResponse } from '@vercel/node';

// API Key kontrolü ve TIRAŞLAMA (Trim) - Boşlukları temizler
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS Ayarları
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
     return res.status(405).json({ error: 'Sadece POST istegi atilabilir.' });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Vercel ayarlarinda GEMINI_API_KEY eksik!');
    }

    const { prompt } = req.body;
    
    console.log("⚡️ Gemini 1.5 Flash ile analiz basliyor...");
    
    // URL oluşturulurken temizlenmiş key kullanılır
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
      console.error("Google API Hatasi:", errData);
      throw new Error(errData.error?.message || `Google Hatasi: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const textAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textAnswer) throw new Error("Google boş yanıt döndürdü.");

    const cleanedText = textAnswer.replace(/```json\n?|```\n?/g, '').trim();
    
    return res.status(200).json(JSON.parse(cleanedText));

  } catch (error: any) {
    console.error("❌ Analiz Hatasi:", error.message);
    return res.status(500).json({ error: error.message || "Bilinmeyen sunucu hatasi" });
  }
}
