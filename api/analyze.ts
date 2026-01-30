
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

const DELIMITER = '|||PART|||';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Helper to return error
  const returnError = (msg: string) => {
    console.error(`❌ HATA: ${msg}`);
    return res.status(200).json({
      twitter: `⚠️ Hata: ${msg}`,
      email: `⚠️ Hata: ${msg}`,
      instagram: `⚠️ Hata: ${msg}`,
      tiktok: `⚠️ Hata: ${msg}`,
      twitterThread: `⚠️ Hata: ${msg}`,
      salesEmail: `⚠️ Hata: ${msg}`,
      instagramPost: `⚠️ Hata: ${msg}`,
      tiktokScript: `⚠️ Hata: ${msg}`
    });
  };

  if (req.method !== 'POST') return returnError('Sadece POST isteği.');

  try {
    if (!GROQ_API_KEY) {
      return returnError('GROQ_API_KEY eksik. Vercel ayarlarını kontrol edin.');
    }

    if (!req.body || !req.body.prompt) {
      return returnError('Prompt verisi gelmedi.');
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
            content: `You are a marketing content generator for online courses. Generate content in plain text format.
            
IMPORTANT: Separate each section with exactly: ${DELIMITER}

Format your response EXACTLY like this (6 sections total):
[Twitter content here - 3-5 tweet thread]
${DELIMITER}
[Email content here - professional sales email]
${DELIMITER}
[Instagram caption here with hashtags]
${DELIMITER}
[TikTok script here - engaging video script]
${DELIMITER}
[Whop Course Description - SEO-optimized, compelling sales description for the course landing page, 2-3 paragraphs]
${DELIMITER}
[Announcement Title]|||[Announcement Body - exciting community announcement about this course, 1-2 paragraphs]

Do NOT use JSON. Do NOT use markdown code blocks. Just plain text with the delimiter between sections.`
          },
          {
            role: "user",
            content: `Generate marketing content for this course:
            
${prompt}

Remember: Use ${DELIMITER} between each section (Twitter, Email, Instagram, TikTok, Whop Description, Announcement).`
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return returnError(`Groq API Hatası (${response.status}): ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    const textAnswer = data.choices?.[0]?.message?.content || "";

    console.log("📝 Ham Yanıt Uzunluğu:", textAnswer.length);

    // Split by delimiter
    const parts = textAnswer.split(DELIMITER).map((p: string) => p.trim());

    // Fallback for partial responses
    const twitter = parts[0] || "İçerik oluşturulamadı. Lütfen tekrar deneyin.";
    const email = parts[1] || "İçerik oluşturulamadı. Lütfen tekrar deneyin.";
    const instagram = parts[2] || "İçerik oluşturulamadı. Lütfen tekrar deneyin.";
    const tiktok = parts[3] || "İçerik oluşturulamadı. Lütfen tekrar deneyin.";
    const whopDescription = parts[4] || email;  // Fallback to email if missing

    // Parse announcement (format: Title|||Body)
    const announcementRaw = parts[5] || "";
    const announcementParts = announcementRaw.split('|||');
    const announcementTitle = announcementParts[0]?.trim() || "🚀 New Course Available!";
    const announcementBody = announcementParts[1]?.trim() || email;

    console.log(`✅ Parsed ${parts.length} sections`);

    return res.status(200).json({
      twitter,
      email,
      instagram,
      tiktok,
      twitterThread: twitter,
      salesEmail: email,
      instagramPost: instagram,
      tiktokScript: tiktok,
      // Whop-specific content
      whopSalesDescription: whopDescription,
      announcementTitle,
      announcementBody
    });

  } catch (error: any) {
    return returnError(`Sunucu hatası: ${error.message}`);
  }
}