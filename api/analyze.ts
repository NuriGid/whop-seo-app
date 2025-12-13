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
      throw new Error('Vercel ayarlarinda GROQ_API_KEY eksik!');
    }

    const { prompt } = req.body;
    
    const model = 'llama-3.3-70b-versatile';

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
            content: "You are an expert content marketing assistant. You Output ONLY raw JSON. No markdown, no intro text."
          },
          {
            role: "user",
            content: `Create marketing content for this course.
            
            Strictly return JSON format:
            {
              "twitterThread": "String with emojis",
              "salesEmail": "String",
              "instagramPost": "String"
            }

            Course Description:
            ${prompt}`
          }
        ],
        temperature: 0.1, // Daha kesin sonuç için sıcaklığı düşürdük
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Groq API Hatasi:", errData);
      throw new Error(errData.error?.message || "Groq baglanti hatasi");
    }

    const data = await response.json();
    const textAnswer = data.choices?.[0]?.message?.content;
    
    if (!textAnswer) throw new Error("Groq bos yanit dondurdu.");

    console.log("✅ Ham Yanit:", textAnswer);

    // --- CERRAHİ TEMİZLİK ---
    // Cevabın içindeki ilk '{' ve son '}' arasını alıyoruz.
    // Böylece model "Here is your JSON:" dese bile görmezden geliyoruz.
    const firstBrace = textAnswer.indexOf('{');
    const lastBrace = textAnswer.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("Yapay zeka geçerli bir JSON üretmedi.");
    }

    const cleanJsonString = textAnswer.substring(firstBrace, lastBrace + 1);
    const parsedData = JSON.parse(cleanJsonString);
    
    return res.status(200).json(parsedData);

  } catch (error: any) {
    console.error("❌ Analiz Hatasi:", error.message);
    // Frontend'in anlayacağı formatta hata dön
    return res.status(500).json({ error: error.message || "Analiz sirasinda hata olustu" });
  }
}