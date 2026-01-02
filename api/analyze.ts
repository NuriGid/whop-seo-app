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

  // Helper function to return 200 with error message in fields
  // This bypasses Frontend's generic error handling and shows the real error in UI
  const returnErrorAsSuccess = (msg: string) => {
    console.error("❌ Hata (UI'a iletiliyor):", msg);
    return res.status(200).json({
      twitter: `⚠️ HATA: ${msg}`,
      email: `⚠️ HATA: ${msg}`,
      instagram: `⚠️ HATA: ${msg}`,
      tiktok: `⚠️ HATA: ${msg}`,
      // Eski formatlar için
      twitterThread: `⚠️ HATA: ${msg}`,
      salesEmail: `⚠️ HATA: ${msg}`,
      instagramPost: `⚠️ HATA: ${msg}`,
      tiktokScript: `⚠️ HATA: ${msg}`
    });
  };

  if (req.method !== 'POST') {
    return returnErrorAsSuccess('Sadece POST isteği atılabilir.');
  }

  try {
    // 1. API KEY KONTROLÜ
    if (!GROQ_API_KEY) {
      return returnErrorAsSuccess('Vercel ayarlarında GROQ_API_KEY eksik!');
    }

    if (!req.body || !req.body.prompt) {
      return returnErrorAsSuccess('Prompt verisi gelmedi (req.body boş).');
    }

    const { prompt } = req.body;
    const model = 'llama-3.1-8b-instant';

    console.log(`⚡️ Groq (${model}) çalışıyor... Prompt: ${prompt.substring(0, 50)}...`);

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
        // response_format: { type: "json_object" } // Kaldırıldı, manuel parse daha güvenli
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      const errMsg = errData.error?.message || `Groq Hatası: ${response.status}`;
      return returnErrorAsSuccess(errMsg);
    }

    const data = await response.json();
    const textAnswer = data.choices?.[0]?.message?.content || "{}";

    // 3. JSON PARSE VE GARANTİLEME
    let parsedData: any = {};
    try {
      const firstBrace = textAnswer.indexOf('{');
      const lastBrace = textAnswer.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        parsedData = JSON.parse(textAnswer.substring(firstBrace, lastBrace + 1));
      } else {
        // JSON bulunamadıysa ham metni basmaya çalış
        console.warn("JSON parantezleri bulunamadı.");
      }
    } catch (e) {
      console.error("JSON Parse Hatası");
    }

    // Frontend ne beklerse beklesin dolu gönderiyoruz
    const fallback = "Generating content...";

    // Eğer parse başarısız olduysa ve data boşsa, hata mesajı dön
    if (Object.keys(parsedData).length === 0) {
      // Belki JSON değil düz metin döndü?
      return returnErrorAsSuccess("Yapay zeka JSON üretemedi. Tekrar deneyin.");
    }

    const safeResponse = {
      twitter: parsedData.twitter || parsedData.twitterThread || fallback,
      email: parsedData.email || parsedData.salesEmail || fallback,
      instagram: parsedData.instagram || parsedData.instagramPost || fallback,
      tiktok: parsedData.tiktok || parsedData.tiktokScript || fallback,

      twitterThread: parsedData.twitter || parsedData.twitterThread || fallback,
      salesEmail: parsedData.email || parsedData.salesEmail || fallback,
      instagramPost: parsedData.instagram || parsedData.instagramPost || fallback,
      tiktokScript: parsedData.tiktok || parsedData.tiktokScript || fallback
    };

    return res.status(200).json(safeResponse);

  } catch (error: any) {
    console.error("❌ Kritik Hata:", error.message);
    return returnErrorAsSuccess(error.message || "Bilinmeyen Sunucu Hatası");
  }
}