/**
 * CourseRocket - Marketing Content Engine v4.8 (SURGICAL REFACTOR)
 * 
 * "ACIMASIZ MOD" - Kids Safety Override, Super-Aggressive Cleaning, Revenue Focus.
 * 
 * CRITICAL FIXES:
 * 1. KIDS SAFETY: Forbidden keywords (ghost, spirit, death, scary) when kids mode detected.
 * 2. SUPER REGEX: ALL label:value patterns stripped. No exceptions.
 * 3. TEMPERATURE 0.3: Structural rigidity with tonal flexibility.
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const SEP = '###NEXT_PART###';

// FORBIDDEN KEYWORDS for kids audiences
const KIDS_FORBIDDEN = ['ghost', 'spirit', 'death', 'die', 'dead', 'paranormal', 'scary', 'horror', 'trapped', 'haunted', 'creepy', 'terrifying', 'nightmare', 'demon', 'evil', 'kill', 'murder'];

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

  if (prompt.includes("Additional notes:")) {
    const parts = prompt.split("Additional notes:");
    prompt = parts[0].trim();
    userNote = parts[1].trim();
  }

  // --- 2. DETECT KIDS MODE ---
  const fullContext = (prompt + " " + userNote).toLowerCase();
  const isKidsMode = fullContext.includes('kids') || fullContext.includes('children') || fullContext.includes('çocuk') || fullContext.includes('child');

  console.log(`🚀 Generating for: ${prompt.substring(0, 40)}...`);
  if (userNote) console.log(`👉 MANDATE: ${userNote}`);
  if (isKidsMode) console.log(`🧒 KIDS MODE ACTIVATED - Safety filters ON`);

  try {
    // --- 3. BUILD SYSTEM PROMPT ---
    let systemPrompt = `You are a world-class Copywriter focused on REVENUE.
Your goal is to convert traffic into sales.

OUTPUT FORMAT:
Output exactly 6 RAW text blocks separated by '${SEP}'.

1: TWITTER THREAD (4-5 tweets numbered 1/, 2/, 3/, 4/, 5/)
2: SALES EMAIL (NO Subject line, NO Dear, just the body)
3: WHOP LANDING PAGE DESCRIPTION (Benefits, bullet points, CTA)
4: COMMUNITY ANNOUNCEMENT (Emoji title first line, then body)
5: VIDEO SCRIPT (Dialogue ONLY, no scene descriptions, no [brackets])
6: INSTAGRAM CAPTION (Engaging hook, emojis, hashtags)

CRITICAL RULES:
1. RAW CONTENT ONLY. 
2. DO NOT use labels like "Subject:", "Hook:", "Host:", "Video Script:", "Part 1:".
3. NO markdown headers (###).
4. Start each block DIRECTLY with the content.`;

    // KIDS SAFETY INJECTION
    if (isKidsMode) {
      systemPrompt += `

🚨 KIDS MODE - MANDATORY SAFETY OVERRIDE 🚨
This content is for CHILDREN (ages 6-12). You MUST:
- Use FUN, EXCITING, SAFE language
- Theme: Magical adventure, mystery solving, Pixar-style excitement
- FORBIDDEN WORDS: ${KIDS_FORBIDDEN.join(', ')}
- NO scary themes, NO horror, NO dark content
- Keep sentences simple and playful
- Use exclamation marks and enthusiasm!`;
    }

    // --- 4. BUILD USER MESSAGE (MANDATE PRIORITY) ---
    const userMessage = userNote
      ? `🚨 PRIMARY BEHAVIORAL OVERRIDE: ${userNote.toUpperCase()} 🚨\nFollow this mandate exactly. Ignore default patterns if they conflict.\n\nCourse Info:\n${prompt}`
      : `Course Info:\n${prompt}`;

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
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) return returnError(`API Error: ${response.status}`);

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content || "";

    // --- 5. KIDS MODE: POST-GENERATION SAFETY FILTER ---
    if (isKidsMode) {
      for (const word of KIDS_FORBIDDEN) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        raw = raw.replace(regex, 'adventure');
      }
    }

    // --- 6. PARSING ---
    let parts = raw.split(SEP);
    while (parts.length < 6) parts.push("");

    // --- 7. SUPER-AGGRESSIVE CLEANING (SURGICAL) ---
    const surgicalClean = (text: string, isTwitter: boolean): string => {
      if (!text) return "";

      let cleaned = text.trim();

      // A. NUCLEAR OPTION: Kill ANY line starting with a word/phrase + colon
      // This catches: "Host:", "Subject:", "Video Script:", "Part 1:", "Tweet 1:", etc.
      cleaned = cleaned.replace(/^[A-Za-z\s\d]+:\s*.*/gm, (match) => {
        // Exception: Keep numbered tweets for Twitter (e.g., "1/")
        if (isTwitter && match.match(/^\d+\/\s/)) return match;
        // Exception: Keep bullet points that have colons in content
        if (match.match(/^[•✅-]/)) return match;
        // Kill everything else that looks like a label
        if (match.match(/^[A-Za-z\s]+(:|:)\s/i)) return '';
        return match;
      });

      // B. Kill specific known garbage patterns
      cleaned = cleaned.replace(/^(Host|Subject|Hook|Intro|Body|Conclusion|CTA|Caption|Post|Script|Title|Video Script|Part \d+|Tweet \d+|Email|Twitter Thread|Landing Page|Announcement|Instagram|TikTok):\s*/gim, '');

      // C. Kill markdown headers
      cleaned = cleaned.replace(/^#+\s*/gm, '');

      // D. Kill double asterisks at block start
      cleaned = cleaned.replace(/^\*\*[^*]+\*\*\s*/gm, '');

      // E. Kill [Bracketed] instructions
      cleaned = cleaned.replace(/^\[.*?\]\s*/gm, '');
      cleaned = cleaned.replace(/\[.*?\]/g, '');

      // F. NUMBERING ISOLATION (Twitter only)
      if (!isTwitter) {
        cleaned = cleaned.replace(/^\d+[\.\/\)]\s*/gm, '');
      }

      // G. Final polish
      return cleaned.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n').trim();
    };

    const twitter = surgicalClean(parts[0], true);
    const email = surgicalClean(parts[1], false);
    const description = surgicalClean(parts[2], false);
    const announcement = surgicalClean(parts[3], false);
    const tiktok = surgicalClean(parts[4], false);
    const instagram = surgicalClean(parts[5], false);

    // Announcement Title
    const annLines = announcement.split('\n').filter(l => l.trim());
    const announcementTitle = annLines[0] || "🚀 Exciting Update!";
    const announcementBody = annLines.slice(1).join('\n').trim() || announcement;

    console.log(`✅ v4.8 Cleaned: T:${twitter.length} E:${email.length} D:${description.length}`);

    // Validation
    const fb = (t: string, n: string) => t.length > 10 ? t : `[${n} - Content Empty]`;

    return res.status(200).json({
      twitterThread: fb(twitter, "Twitter"),
      salesEmail: fb(email, "Email"),
      whopSalesDescription: fb(description, "Description"),
      announcementTitle,
      announcementBody: announcementBody || "Check out our latest update!",
      tiktokScript: fb(tiktok, "TikTok"),
      instagramPost: fb(instagram, "Instagram"),
      // Legacy compatibility
      twitter, email, instagram, tiktok
    });

  } catch (error: any) {
    return returnError(`Error: ${error.message}`);
  }
}