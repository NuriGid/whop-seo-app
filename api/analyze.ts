
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let debugLogs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    debugLogs.push(msg); // Logs to return in response
  };

  log("🚀 API /api/analyze Tetiklendi");

  // Helper to return error visible in UI fields
  const returnErrorAsSuccess = (msg: string, details: string = '') => {
    log(`❌ HATA DÖNÜLÜYOR: ${msg} - ${details}`);
    return res.status(200).json({
      debug_error: msg,
      debug_details: details,
      logs: debugLogs,
      // Frontend Inputs
      twitter: `🔴 HATA: ${msg}`,
      email: `🔴 HATA: ${msg}`,
      instagram: `🔴 HATA: ${msg}`,
      tiktok: `🔴 HATA: ${msg}`,
      twitterThread: `🔴 HATA: ${msg}`,
      salesEmail: `🔴 HATA: ${msg} \n\nDetay: ${details}`,
      instagramPost: `🔴 HATA: ${msg}`,
      tiktokScript: `🔴 HATA: ${msg}`
    });
  };

  if (req.method !== 'POST') return returnErrorAsSuccess('Sadece POST isteği atılabilir.');

  try {
    // 1. API KEY KONTROLÜ
    if (!GROQ_API_KEY) {
      return returnErrorAsSuccess('GROQ_API_KEY EKSİK', 'Vercel Env Variables kontrol edin.');
    }

    if (!req.body || !req.body.prompt) {
      return returnErrorAsSuccess('Prompt verisi gelmedi', 'req.body.prompt boş');
    }

    const { prompt } = req.body;
    const model = 'llama-3.1-8b-instant';
    log(`⚡️ Groq İsteği: ${model} - Uzunluk: ${prompt.length}`);

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
        temperature: 0.3
      })
    });

    log(`📡 Groq HTTP Status: ${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      return returnErrorAsSuccess(`Groq API Hatası (${response.status})`, errText);
    }

    const data = await response.json();
    const textAnswer = data.choices?.[0]?.message?.content || "{}";
    log(`📝 Ham Yanıt Uzunluğu: ${textAnswer.length}`);

    // 3. JSON PARSE
    let parsedData: any = {};
    try {
      const firstBrace = textAnswer.indexOf('{');
      const lastBrace = textAnswer.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        parsedData = JSON.parse(textAnswer.substring(firstBrace, lastBrace + 1));
        log("✅ JSON Parse Başarılı");
      } else {
        log("⚠️ JSON Parantezleri Bulunamadı! Ham yanıt dönülüyor.");
        return returnErrorAsSuccess("JSON Bulunamadı", textAnswer.substring(0, 100));
      }
    } catch (e) {
      log("❌ JSON Parse Hatası");
      return returnErrorAsSuccess("JSON Parse Hatası", textAnswer.substring(0, 50));
    }

    // Başarılı Dönüş
    const fallback = "İçerik üretilemedi.";

    return res.status(200).json({
      logs: debugLogs,
      twitter: parsedData.twitter || parsedData.twitterThread || fallback,
      email: parsedData.email || parsedData.salesEmail || fallback,
      instagram: parsedData.instagram || parsedData.instagramPost || fallback,
      tiktok: parsedData.tiktok || parsedData.tiktokScript || fallback,
      // Yedekler
      twitterThread: parsedData.twitter || parsedData.twitterThread || fallback,
      salesEmail: parsedData.email || parsedData.salesEmail || fallback,
      instagramPost: parsedData.instagram || parsedData.instagramPost || fallback,
      tiktokScript: parsedData.tiktok || parsedData.tiktokScript || fallback
    });

  } catch (error: any) {
    return returnErrorAsSuccess("Sunucu İçi Hata", error.message);
  }
}