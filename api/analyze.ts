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
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-company-id'
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
    
    // HIZLI MODEL: 70B yerine 8B Instant kullaniyoruz ki Vercel timeout'a düşmesin.
    const model = 'llama-3.1-8b-instant';

    console.log(`⚡️ Groq (${model}) ile hizli analiz basliyor...`);
    
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
            content: "You are an expert marketing assistant. You Output ONLY valid JSON. No markdown, no intro text."
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
        temperature: 0.3, 
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

    // --- CERRAHİ TEMİZLİK (GELİŞMİŞ) ---
    const firstBrace = textAnswer.indexOf('{');
    const lastBrace = textAnswer.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("Yapay zeka geçerli bir JSON üretmedi.");
    }

    const cleanJsonString = textAnswer.substring(firstBrace, lastBrace + 1);
    
    try {
        const parsedData = JSON.parse(cleanJsonString);
        return res.status(200).json(parsedData);
    } catch (parseError) {
        console.error("JSON Parse Hatasi:", parseError);
        throw new Error("Yapay zeka çıktısı okunamadı (JSON Format Hatası).");
    }

  } catch (error: any) {
    console.error("❌ Analiz Hatasi:", error.message);
    return res.status(500).json({ error: error.message || "Analiz sirasinda hata olustu" });
  }
}