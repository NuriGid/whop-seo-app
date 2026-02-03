/**
 * CourseRocket - Marketing Content Engine v4.0 (REVENUE HARDENED)
 * 
 * "ACIMASIZ MOD" - Ruthless Cleaning, User Mandate Priority, Revenue Focus.
 * 
 * CRITICAL LOGIC:
 * 1. User Note = SUPREME LAW. (Overrides default tone).
 * 2. Label Defense = ZERO TOLERANCE for "Hook:", "Subject:", "Part X".
 * 3. Twitter = ONLY place for numbering (1/5).
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

  // --- 1. USER CONTEXT EXTRACTION ---
  let { prompt } = req.body;
  let userNote = "";

  if (prompt.includes("Additional notes:")) {
    const parts = prompt.split("Additional notes:");
    prompt = parts[0].trim();
    userNote = parts[1].trim();
  }

  console.log(`🚀 Generating for: ${prompt.substring(0, 40)}...`);
  if (userNote) console.log(`👉 MANDATE: ${userNote}`);

  try {
    // --- 2. SYSTEM INSTRUCTION ---
    const systemPrompt = `You are a world-class Copywriter focused on REVENUE.
Your goal is to convert traffic into sales.

OUTPUT FORMAT:
Output exactly 6 RAW text blocks separated by '${SEP}'.

1: TWITTER CHREAD (The only place using 1/, 2/...)
2: SALES EMAIL
3: WHOP LANDING PAGE
4: COMMUNITY ANNOUNCEMENT
5: VIDEO SCRIPT (Dialogue only)
6: INSTAGRAM CAPTION

CRITICAL RULES:
1. RAW CONTENT ONLY. NO labels like "Subject:", "Hook:", "Part 1:".
2. NO ACADEMIC FLUFF. Direct-Response only.
3. ADAPT TONE: If user says "kids", simplify everything. If "aggressive", use FOMO.`;

    // --- 3. PROMPT CONSTRUCTION (MANDATE PRIORITY) ---
    // We inject the user note at the very top as a SYSTEM OVERRIDE to ensure strict adherence.
    const userMessage = userNote
      ? `🚨 PRIMARY BEHAVIORAL OVERRIDE: ${userNote.toUpperCase()} 🚨\n\nIGNORE default tone if it conflicts. Follow this mandate exactly.\n\nCourse Info:\n${prompt}`
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
        temperature: 0.4, // User requested 0.4 for flexibility
        max_tokens: 4000
      })
    });

    if (!response.ok) return returnError(`API Error: ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // --- 4. PARSING & CLEANING ---
    let parts = raw.split(SEP);

    // Fallback: padding
    while (parts.length < 6) parts.push("");

    // RUTHLESS CLEANER
    const killGarbage = (text: string, isTwitter: boolean): string => {
      if (!text) return "";

      let cleaned = text.trim();

      // A. Kill Label Lines (Start of line + Label + Colon)
      // Removes: "Subject: ...", "Hook: ...", "TikTok: ...", "Host: ..."
      cleaned = cleaned.replace(/^(Subject|Hook|Host|TikTok|Instagram|Email|Twitter|Part \d+|intro|body|conclusion|cta):.*/gim, '');

      // B. Kill Generic Headers
      cleaned = cleaned.replace(/^TWITTER THREAD:?/gim, '');
      cleaned = cleaned.replace(/^SALES EMAIL:?/gim, '');

      // C. Kill Markdown Headers
      cleaned = cleaned.replace(/^#+\s*/gm, '');

      // D. NUMBERING ISOLATION (The Bleeding Fix)
      if (isTwitter) {
        // Twitter keeps numbering.
      } else {
        // DESTROY ALL NUMBERING for non-twitter.
        // Removes: "1.", "1/", "1)", "[1]" at start of lines
        cleaned = cleaned.replace(/^\d+[\.\/\)]\s*/gm, '');
        cleaned = cleaned.replace(/^\[\d+\]\s*/gm, '');
      }

      // E. Remove bracketed instructions [Music fades]
      cleaned = cleaned.replace(/^\[.*?\]/gm, '');

      // F. Final Polish
      return cleaned.replace(/^\n+/, '').replace(/\n+$/, '').trim();
    };

    const twitter = killGarbage(parts[0], true);
    const email = killGarbage(parts[1], false);
    const description = killGarbage(parts[2], false);
    const announcement = killGarbage(parts[3], false);
    const tiktok = killGarbage(parts[4], false);
    const instagram = killGarbage(parts[5], false);

    // Announcement Title Helper
    const annLines = announcement.split('\n').filter(l => l.trim());
    const announcementTitle = annLines[0] || "🚀 Update";
    const announcementBody = annLines.slice(1).join('\n').trim() || announcement;

    console.log(`✅ Cleaned Sizes: T:${twitter.length} E:${email.length} D:${description.length}`);

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
      // Legacy
      twitter: twitter,
      email: email,
      instagram: instagram,
      tiktok: tiktok
    });

  } catch (error: any) {
    return returnError(`Error: ${error.message}`);
  }
}