/**
 * CourseRocket - Marketing Content Engine v5.0 (CONTEXTUAL FRAMING)
 * BUILD: 2026-02-03-05:05
 * 
 * PHILOSOPHY:
 * - User Note = PRIMARY LENS (100% weight)
 * - Course Content = RAW MATERIAL (10% weight)
 * - No hardcoded keywords. Universal synchronization.
 * 
 * "AI is not a marketing bot for the course.
 *  AI is a marketing bot for the USER'S NOTE, using course data as material."
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const SEP = '###NEXT_PART###';

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

  // --- 1. EXTRACT USER CONTEXT ---
  let { prompt } = req.body;
  let userNote = "";

  console.log('📥 v5.0 RAW PROMPT:', prompt.substring(0, 150));

  if (prompt.includes("Additional notes:")) {
    const parts = prompt.split("Additional notes:");
    prompt = parts[0].trim();
    userNote = parts[1]?.trim() || "";
  }

  console.log('🎯 USER LENS:', userNote || '(No lens - default marketing)');

  try {
    // --- 2. BUILD CONTEXTUAL FRAMING PROMPT ---
    // This is the key innovation: User note DEFINES the AI's identity

    let systemPrompt: string;

    if (userNote) {
      // CONTEXTUAL FRAMING: User note is the PRIMARY LENS
      systemPrompt = `You are a world-class marketing expert specialized in: "${userNote}"

YOUR PRIMARY MISSION: Create content that perfectly targets "${userNote}".

The course information below is ONLY raw material. Your job is to TRANSFORM it through the lens of "${userNote}".

INSTRUCTION HIERARCHY (STRICT):
1. User's Note ("${userNote}") = YOUR IDENTITY. This is WHO you are writing for. (100% priority)
2. Course Content = Raw material to adapt. (10% priority - just use the topic/theme)

EXAMPLE THINKING:
- If note says "kids": You are a children's book author making everything fun, simple, exciting
- If note says "retirees": You are a senior lifestyle expert with calm, clear, nostalgic tone
- If note says "aggressive sales": You are a hard-sell copywriter with urgency and FOMO
- If note says "luxury": You are a premium brand strategist with sophisticated language

OUTPUT FORMAT:
Output exactly 6 RAW text blocks separated by '${SEP}'.

1: TWITTER THREAD (4-5 tweets, numbered 1/, 2/, 3/, 4/, 5/)
2: SALES EMAIL (Direct hook, no Subject: line, no Dear)
3: WHOP LANDING PAGE (Benefits, bullet points, CTA)
4: COMMUNITY ANNOUNCEMENT (Emoji title first, then body)
5: VIDEO SCRIPT (Dialogue ONLY, no brackets or scene descriptions)
6: INSTAGRAM CAPTION (Engaging hook, emojis, hashtags)

CRITICAL RULES:
- RAW content only. No labels like "Subject:", "Hook:", "Part 1:"
- No markdown syntax
- Adapt EVERYTHING to the "${userNote}" perspective`;

    } else {
      // DEFAULT MODE: Standard marketing (no user lens)
      systemPrompt = `You are a world-class Direct-Response Copywriter.

Your job is to create high-converting marketing content.

OUTPUT FORMAT:
Output exactly 6 RAW text blocks separated by '${SEP}'.

1: TWITTER THREAD (4-5 tweets, numbered 1/, 2/, 3/, 4/, 5/)
2: SALES EMAIL (Direct hook, no Subject: line, no Dear)
3: WHOP LANDING PAGE (Benefits, bullet points, CTA)
4: COMMUNITY ANNOUNCEMENT (Emoji title first, then body)
5: VIDEO SCRIPT (Dialogue ONLY, no brackets)
6: INSTAGRAM CAPTION (Engaging hook, emojis, hashtags)

CRITICAL RULES:
- RAW content only. No labels like "Subject:", "Hook:", "Part 1:"
- No markdown syntax
- Focus on conversion and engagement`;
    }

    // --- 3. BUILD USER MESSAGE ---
    // Course content is provided as "material to work with"
    const userMessage = userNote
      ? `REMEMBER: You are writing for "${userNote}". Transform the following course material through that lens:\n\n${prompt}`
      : `Create marketing content for:\n\n${prompt}`;

    console.log('📤 Sending to AI with lens:', userNote || 'default');

    // --- 4. CALL AI ---
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
          { role: "user", content: userMessage }
        ],
        temperature: 0.2,  // Low for consistency/loyalty to instructions
        max_tokens: 4000
      })
    });

    if (!response.ok) return returnError(`API Error: ${response.status}`);

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content || "";

    console.log('📥 AI Response length:', raw.length);

    // --- 5. PARSING ---
    let parts = raw.split(SEP);
    while (parts.length < 6) parts.push("");

    // --- 6. REGEX SHIELD (Universal Cleaning) ---
    const regexShield = (text: string, isTwitter: boolean): string => {
      if (!text) return "";

      let cleaned = text.trim();

      // A. Delete lines where first 3 words contain a colon
      // This kills: "Subject: ...", "Hook: ...", "Part 1: ...", "Tweet 1: ..."
      cleaned = cleaned.split('\n').filter(line => {
        const firstFewWords = line.trim().split(/\s+/).slice(0, 3).join(' ');
        // If colon exists in first 3 words, it's likely a label - delete the line
        if (firstFewWords.includes(':') && !line.trim().match(/^[0-9]+\//)) {
          return false; // Delete this line
        }
        return true;
      }).join('\n');

      // B. Remove markdown syntax
      cleaned = cleaned.replace(/\*\*/g, '');  // Bold
      cleaned = cleaned.replace(/^#+\s*/gm, '');  // Headers
      cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');  // Links
      cleaned = cleaned.replace(/\[.*?\]/g, '');  // Bracketed content

      // C. Numbering isolation (only Twitter keeps 1/, 2/)
      if (!isTwitter) {
        cleaned = cleaned.replace(/^\d+[\.\/\)]\s*/gm, '');
      }

      // D. Clean up whitespace
      return cleaned.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n').trim();
    };

    const twitter = regexShield(parts[0], true);
    const email = regexShield(parts[1], false);
    const description = regexShield(parts[2], false);
    const announcement = regexShield(parts[3], false);
    const tiktok = regexShield(parts[4], false);
    const instagram = regexShield(parts[5], false);

    // Announcement title extraction
    const annLines = announcement.split('\n').filter(l => l.trim());
    const announcementTitle = annLines[0] || "🚀 Exciting Update!";
    const announcementBody = annLines.slice(1).join('\n').trim() || announcement;

    console.log(`✅ v5.0 Output: T:${twitter.length} E:${email.length} D:${description.length}`);

    // Fallback for empty content
    const fb = (t: string, n: string) => t.length > 10 ? t : `[${n} - Content Empty]`;

    return res.status(200).json({
      twitterThread: fb(twitter, "Twitter"),
      salesEmail: fb(email, "Email"),
      whopSalesDescription: fb(description, "Description"),
      announcementTitle,
      announcementBody: announcementBody || "Check out our latest update!",
      tiktokScript: fb(tiktok, "TikTok"),
      instagramPost: fb(instagram, "Instagram"),
      twitter, email, instagram, tiktok
    });

  } catch (error: any) {
    return returnError(`Error: ${error.message}`);
  }
}