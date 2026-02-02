/**
 * CourseRocket - Marketing Content Engine v3.0 (Production Hardened)
 * 
 * "ACIMASIZ MOD" - Aggressive cleaning, Direct-Response focus, High-Conversion.
 * 
 * FEATURES:
 * - Prioritizes User Notes as MANDATORY.
 * - Aggressive Regex Defense against label leakage.
 * - Strict Numbering Isolation (Twitter only).
 * - Viral/FOMO Tone.
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

  // Extract User Note if present in the prompt string
  // The frontend sends: `Course: Name\n\nDesc\n\nAdditional notes: user_note`
  let { prompt } = req.body;
  let userNote = "";

  if (prompt.includes("Additional notes:")) {
    const parts = prompt.split("Additional notes:");
    prompt = parts[0].trim();
    userNote = parts[1].trim();
  }

  console.log(`🚀 Generating for: ${prompt.substring(0, 40)}...`);
  if (userNote) console.log(`👉 USER NOTE: ${userNote}`);

  try {
    const systemPrompt = `You are a world-class Direct-Response Copywriter (ACIMASIZ MOD).
Your job is to SELL courses using psychology, FOMO, and viral hooks.

TONE: High-energy, Persuasive, Action-Oriented. NO academic fluff. NO boring intros.

INSTRUCTIONS:
Output exactly 6 RAW text blocks separated by '${SEP}'.

BLOCK 1: VIRAL TWITTER THREAD
- 4-5 tweets.
- NUMBERED 1/, 2/, 3/, 4/, 5/ (Mandatory for this section ONLY).
- Start with a scroll-stopping hook.

BLOCK 2: SALES EMAIL
- Direct-response style.
- Start immediately with the hook.
- NO "Subject:" line. NO "Dear [Name]".
- Focus on the PAIN POINT and the TRANSFORMATION.

BLOCK 3: WHOP LANDING PAGE
- High-conversion description.
- Use bullet points (✅) for benefits.
- "What You'll Get" section.
- Strong Call-To-Action.

BLOCK 4: COMMUNITY ANNOUNCEMENT
- First line: Exciting Title with Emoji (e.g. 🚀 LAUNCH DAY!).
- Body: Hype the community. Create FOMO.

BLOCK 5: TIKTOK SCRIPT
- 30-60 seconds.
- Dialogue ONLY. No "[Scene]" descriptions.
- Fast-paced.

BLOCK 6: INSTAGRAM CAPTION
- 2-3 sentences.
- Engaging question or hook.
- 5-10 Hashtags.

CRITICAL RULES:
- DO NOT use labels like "Part 1:", "Hook:", "Email:", "Subject:".
- RAW CONTENT ONLY.
- User Notes are MANDATORY constraints.`;

    const userMessage = userNote
      ? `CRITICAL INSTRUCTION - PRIORITY #1: ${userNote.toUpperCase()}\n\nCourse Info:\n${prompt}`
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
        temperature: 0.3, // Increased for creativity/adaptability
        max_tokens: 4000
      })
    });

    if (!response.ok) return returnError(`API Error: ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    console.log(`📝 Response: ${raw.length} chars`);

    // --- PARSING ---
    let parts = raw.split(SEP);

    // Fallback if separator fails
    if (parts.length < 6) {
      console.warn("⚠️ Separator failed. Trying fallback splitting.");
      // Try double newline with heuristics (risky but better than fail)
      const lines = raw.split('\n\n');
      // Rough re-assembly if needed, but usually Llama 3.1 follows instructions well.
      // If it fails heavily, we just pad with empty strings.
      while (parts.length < 6) parts.push("");
    }

    // --- AGGRESSIVE CLEANING ---
    const clean = (text: string, isTwitter: boolean): string => {
      if (!text) return "";

      let cleaned = text.trim();

      // 1. Remove "Part X", "Block X" labels
      cleaned = cleaned.replace(/^(Part|Block|Section)\s*\d+[:\-\.]?\s*/gim, '');

      // 2. Remove Common Headers (Aggressive colon removal at start of line)
      // Removes "Subject:", "Hook:", "Email:", "Title:", "Host:"
      cleaned = cleaned.replace(/^[A-Z][a-zA-Z\s]+:\s*/gm, (match) => {
        // Allow specific things if needed, but mostly destroy all headers
        // We might want to keep "1/" for twitter, so be careful.
        if (match.match(/^\d+\//)) return match; // Keep 1/ 2/
        return "";
      });

      // 3. Remove Markdown headers
      cleaned = cleaned.replace(/^#+\s*/gm, '');

      // 4. Remove [Bracketed] instructions like [Intro Music]
      cleaned = cleaned.replace(/^\[.*?\]/gm, '');

      // 5. Remove "TWEET THREAD" specific garbage
      cleaned = cleaned.replace(/TWITTER THREAD:?/gim, '');

      // 6. NUMBERING ISOLATION
      if (isTwitter) {
        // Ensure standard 1/, 2/ format if possible
      } else {
        // DESTROY Numbering for non-Twitter
        cleaned = cleaned.replace(/^\d+[\/\)\.]\s*/gm, '');
        cleaned = cleaned.replace(/^Tweet \d+:?/gim, '');
      }

      // 7. Final whitespace cleanup
      return cleaned.replace(/^\n+/, '').replace(/\n+$/, '');
    };

    const twitter = clean(parts[0] || "", true);
    const email = clean(parts[1] || "", false);
    const description = clean(parts[2] || "", false);
    const announcement = clean(parts[3] || "", false);
    const tiktok = clean(parts[4] || "", false);
    const instagram = clean(parts[5] || "", false);

    // Announcement Title Extraction (First line)
    const annLines = announcement.split('\n').filter(l => l.trim());
    const announcementTitle = annLines[0] || "🚀 Update";
    const announcementBody = annLines.slice(1).join('\n').trim() || announcement;

    console.log(`✅ Parsed sizes: T:${twitter.length} E:${email.length} D:${description.length} A:${announcement.length} TK:${tiktok.length} I:${instagram.length}`);

    // Validation
    const fb = (t: string, n: string) => t.length > 10 ? t : `[${n} - Try regenerating]`;

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