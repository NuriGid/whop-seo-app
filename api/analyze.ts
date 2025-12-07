import type { VercelRequest, VercelResponse } from '@vercel/node';

// Groq API Key kontrolü
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Ayarları
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
    if (!GROQ_API_KEY) {
      throw new Error('Vercel ayarlarinda GROQ_API_KEY eksik! Lütfen console.groq.com adresinden alin.');
    }

    const { prompt } = req.body;
    
    // Groq üzerinde çalışan en güçlü ve dengeli model: Llama 3.3 70B Versatile
    const model = 'llama-3.3-70b-versatile';

    console.log(`⚡️ Groq (${model}) ile analiz basliyor...`);
    
    // Groq OpenAI uyumlu API kullanır
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
            content: "You are an expert in marketing and SEO for online courses on Whop.com. You output ONLY valid JSON."
          },
          {
            role: "user",
            content: `Analyze this course description and return ONLY valid JSON in this exact format:
{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "categories": ["Category 1", "Category 2", "Category 3"]
}

Choose categories from: Trading & Investing, E-commerce, Software & Tools, Fitness & Health, Education, Gaming, Crypto & NFTs, Social Media Marketing, Cooking, Music Production

Course Description:
${prompt}`
          }
        ],
        temperature: 0.3, // Daha tutarlı sonuçlar için düşük sıcaklık
        response_format: { type: "json_object" } // Groq'un JSON modu
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Groq API Hatasi:", errData);
      throw new Error(errData.error?.message || `Groq Hatasi: ${response.status}`);
    }

    const data = await response.json();
    const textAnswer = data.choices?.[0]?.message?.content;
    
    if (!textAnswer) throw new Error("Groq boş yanıt döndürdü.");

    console.log("✅ Groq Yaniti:", textAnswer);

    // JSON temizliği
    const cleanedText = textAnswer.replace(/```json\n?|```\n?/g, '').trim();
    
    return res.status(200).json(JSON.parse(cleanedText));

  } catch (error: any) {
    console.error("❌ Analiz Hatasi:", error.message);
    return res.status(500).json({ error: error.message || "Bilinmeyen sunucu hatasi" });
  }
}
