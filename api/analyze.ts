/**
 * CourseRocket - Marketing Content Engine v2.1
 * 
 * SIMPLE & RELIABLE parsing approach.
 * Uses explicit section markers for bulletproof extraction.
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const returnError = (msg: string) => {
    console.error(`❌ ${msg}`);
    return res.status(200).json({
      twitterThread: `⚠️ ${msg}`,
      salesEmail: `⚠️ ${msg}`,
      instagramPost: `⚠️ ${msg}`,
      tiktokScript: `⚠️ ${msg}`,
      whopSalesDescription: `⚠️ ${msg}`,
      announcementTitle: 'Error',
      announcementBody: msg
    });
  };

  if (req.method !== 'POST') return returnError('POST only.');
  if (!GROQ_API_KEY) return returnError('GROQ_API_KEY missing.');
  if (!req.body?.prompt) return returnError('No prompt.');

  const { prompt } = req.body;
  console.log(`🚀 Generating for: ${prompt.substring(0, 60)}...`);

  try {
    // SIMPLE PROMPT with clear markers
    const systemPrompt = `You are an expert marketing copywriter. Generate content for an online course.

Write exactly these 6 sections with EXACT markers:

---TWITTER---
Write a 4-5 tweet thread. Number each tweet 1/, 2/, 3/, 4/, 5/. Include hashtags.

---EMAIL---
Write a sales email. Start with a hook. NO "Subject:" or "Dear". Just the email body.

---DESCRIPTION---
Write a course landing page description. Use bullet points for benefits. Include a call-to-action.

---ANNOUNCEMENT---
Write an exciting community announcement. First line is the title with emoji. Then the body.

---TIKTOK---
Write a 30-60 second video script. Hook viewer immediately. End with CTA.

---INSTAGRAM---
Write a caption with emojis and hashtags.

IMPORTANT: Use the exact markers ---TWITTER---, ---EMAIL---, etc. to separate sections.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Course: ${prompt}` }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      return returnError(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    console.log(`📝 Response: ${raw.length} chars`);

    // EXTRACT sections by markers
    const extract = (content: string, startMarker: string, endMarkers: string[]): string => {
      const startIdx = content.indexOf(startMarker);
      if (startIdx === -1) return "";

      let endIdx = content.length;
      for (const endMarker of endMarkers) {
        const idx = content.indexOf(endMarker, startIdx + startMarker.length);
        if (idx !== -1 && idx < endIdx) {
          endIdx = idx;
        }
      }

      return content.substring(startIdx + startMarker.length, endIdx).trim();
    };

    const allMarkers = ['---TWITTER---', '---EMAIL---', '---DESCRIPTION---', '---ANNOUNCEMENT---', '---TIKTOK---', '---INSTAGRAM---'];

    let twitter = extract(raw, '---TWITTER---', allMarkers.filter(m => m !== '---TWITTER---'));
    let email = extract(raw, '---EMAIL---', allMarkers.filter(m => m !== '---EMAIL---'));
    let description = extract(raw, '---DESCRIPTION---', allMarkers.filter(m => m !== '---DESCRIPTION---'));
    let announcement = extract(raw, '---ANNOUNCEMENT---', allMarkers.filter(m => m !== '---ANNOUNCEMENT---'));
    let tiktok = extract(raw, '---TIKTOK---', allMarkers.filter(m => m !== '---TIKTOK---'));
    let instagram = extract(raw, '---INSTAGRAM---', allMarkers.filter(m => m !== '---INSTAGRAM---'));

    // Clean garbage labels
    const clean = (text: string): string => {
      if (!text) return "";
      return text
        .replace(/^\[?(INTRO|OUTRO)\s*(MUSIC|HOOK)?\]?.*$/gim, '')
        .replace(/^\[.*?\]\s*/gm, '')
        .replace(/^(Hook|CTA|Intro|Body|Conclusion):\s*/gim, '')
        .replace(/^(Caption|Post|Script):\s*/gim, '')
        .replace(/^Subject:.*$/gim, '')
        .replace(/^Dear\s*\w*,?\s*/gim, '')
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*/g, '')
        .replace(/^\n+/, '')
        .trim();
    };

    twitter = clean(twitter);
    email = clean(email);
    description = clean(description);
    announcement = clean(announcement);
    tiktok = clean(tiktok);
    instagram = clean(instagram);

    // Parse announcement title
    const annLines = announcement.split('\n').filter(l => l.trim());
    const announcementTitle = annLines[0] || "🚀 New Course!";
    const announcementBody = annLines.slice(1).join('\n').trim() || announcement;

    console.log(`✅ T:${twitter.length} E:${email.length} D:${description.length} A:${announcement.length} TK:${tiktok.length} I:${instagram.length}`);

    // Return with fallbacks
    const fb = (t: string, n: string) => t && t.length > 20 ? t : `[${n} - Try regenerating]`;

    return res.status(200).json({
      twitterThread: fb(twitter, "Twitter"),
      salesEmail: fb(email, "Email"),
      whopSalesDescription: fb(description, "Description"),
      announcementTitle,
      announcementBody: announcementBody || "Check out our latest!",
      tiktokScript: fb(tiktok, "TikTok"),
      instagramPost: fb(instagram, "Instagram"),
      twitter: fb(twitter, "Twitter"),
      email: fb(email, "Email"),
      instagram: fb(instagram, "Instagram"),
      tiktok: fb(tiktok, "TikTok")
    });

  } catch (error: any) {
    return returnError(`Error: ${error.message}`);
  }
}