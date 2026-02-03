/**
 * CourseRocket - Marketing Content Engine v4.9 (NUCLEAR SAFETY)
 * 
 * FIXES:
 * 1. NUCLEAR KIDS FILTER: Complete content rewrite if kids mode detected
 * 2. POST-GENERATION SANITIZATION: Replace ALL forbidden words after AI response
 * 3. EXTENDED LOGGING: Track every step for debugging
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const SEP = '###NEXT_PART###';

// EXTENDED Forbidden list for kids
const KIDS_FORBIDDEN = [
  'ghost', 'ghosts', 'ghostly', 'spirit', 'spirits', 'spiritual',
  'death', 'die', 'dead', 'dying', 'deceased',
  'paranormal', 'supernatural', 'psychic',
  'scary', 'horror', 'terrifying', 'frightening', 'creepy', 'spooky',
  'trapped', 'haunted', 'haunt', 'haunting',
  'nightmare', 'nightmares',
  'demon', 'demons', 'demonic', 'evil', 'malevolent',
  'kill', 'murder', 'blood', 'curse', 'cursed',
  'communicate with the dead', 'spirit world', 'afterlife',
  'occult', 'séance', 'ouija', 'possession', 'exorcism'
];

// Safe replacements for kids
const KIDS_REPLACEMENTS: Record<string, string> = {
  'ghost': 'friendly character',
  'ghosts': 'friendly characters',
  'spirit': 'magical friend',
  'spirits': 'magical friends',
  'death': 'adventure',
  'dead': 'sleeping',
  'paranormal': 'magical',
  'supernatural': 'amazing',
  'scary': 'exciting',
  'horror': 'adventure',
  'haunted': 'enchanted',
  'nightmare': 'dream',
  'demon': 'mischievous creature',
  'evil': 'tricky',
  'malevolent': 'playful',
  'psychic': 'special',
  'communicate with': 'learn about',
  'spirit world': 'magical world',
  'afterlife': 'magical realm'
};

export default async function handler(req: any, res: any) {
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

  // --- 1. EXTRACT AND LOG EVERYTHING ---
  let { prompt } = req.body;
  let userNote = "";

  console.log('📥 RAW PROMPT RECEIVED:', prompt.substring(0, 200));

  if (prompt.includes("Additional notes:")) {
    const parts = prompt.split("Additional notes:");
    prompt = parts[0].trim();
    userNote = parts[1]?.trim() || "";
  }

  console.log('📝 EXTRACTED USER NOTE:', userNote || '(EMPTY)');

  // --- 2. DETECT KIDS MODE (Check BOTH prompt and note) ---
  const fullContext = (prompt + " " + userNote).toLowerCase();
  const isKidsMode =
    fullContext.includes('kids') ||
    fullContext.includes('children') ||
    fullContext.includes('çocuk') ||
    fullContext.includes('child') ||
    fullContext.includes('kid') ||
    userNote.toLowerCase().includes('kids') ||
    userNote.toLowerCase().includes('focus on kids');

  console.log('🧒 KIDS MODE:', isKidsMode ? 'ACTIVATED ✅' : 'OFF');

  try {
    // --- 3. BUILD SYSTEM PROMPT ---
    let systemPrompt = `You are a world-class Copywriter focused on REVENUE.

OUTPUT FORMAT:
Output exactly 6 RAW text blocks separated by '${SEP}'.

1: TWITTER THREAD (4-5 tweets numbered 1/, 2/, 3/, 4/, 5/)
2: SALES EMAIL (NO Subject line, NO Dear, NO [Name], just start with hook)
3: WHOP LANDING PAGE DESCRIPTION (Benefits, bullet points, CTA)
4: COMMUNITY ANNOUNCEMENT (Emoji title first line, then body)
5: VIDEO SCRIPT (Dialogue ONLY, no brackets, no scene descriptions)
6: INSTAGRAM CAPTION (Hook, emojis, hashtags)

CRITICAL RULES:
- RAW CONTENT ONLY
- NO labels like "Subject:", "Hook:", "Host:", "Video Script:", "Part 1:"
- NO markdown headers
- NO "Dear [Name]" or placeholder names`;

    // NUCLEAR KIDS OVERRIDE
    if (isKidsMode) {
      systemPrompt = `You are a FUN, EXCITING copywriter for KIDS CONTENT (ages 6-12).

🚨 ABSOLUTE RULES - VIOLATING THESE IS FORBIDDEN:
- NEVER use: ghost, spirit, death, scary, horror, paranormal, haunted, demon, evil
- Theme MUST be: FUN ADVENTURE, MYSTERY SOLVING, PIXAR-STYLE EXCITEMENT
- Language: SIMPLE, PLAYFUL, USE EXCLAMATION MARKS!
- Make everything sound like a FUN GAME or ADVENTURE

OUTPUT FORMAT:
Output exactly 6 RAW text blocks separated by '${SEP}'.

1: TWITTER THREAD (4-5 fun tweets, numbered 1/, 2/, 3/, 4/, 5/)
2: SALES EMAIL (FUN, exciting, NO Subject/Dear, just start with fun hook)
3: LANDING PAGE (Adventure-themed, bullet points with emojis)
4: ANNOUNCEMENT (Exciting emoji title + fun body)
5: VIDEO SCRIPT (Fun dialogue, no brackets)
6: INSTAGRAM (Fun caption, kid-friendly emojis, hashtags)

REMEMBER: This is for KIDS! Make it FUN and SAFE!`;
    }

    const userMessage = userNote
      ? `🚨 PRIORITY INSTRUCTION: ${userNote.toUpperCase()} 🚨\n\nCourse: ${prompt}`
      : `Course: ${prompt}`;

    console.log('📤 SENDING TO AI...');

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

    console.log('📥 AI RESPONSE LENGTH:', raw.length);

    // --- 4. NUCLEAR POST-GENERATION SANITIZATION FOR KIDS ---
    if (isKidsMode) {
      console.log('🧹 APPLYING KIDS SANITIZATION...');

      // Replace forbidden phrases first (longer matches)
      for (const [bad, good] of Object.entries(KIDS_REPLACEMENTS)) {
        const regex = new RegExp(bad, 'gi');
        raw = raw.replace(regex, good);
      }

      // Then replace remaining single words
      for (const word of KIDS_FORBIDDEN) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        raw = raw.replace(regex, 'adventure');
      }

      console.log('✅ SANITIZATION COMPLETE');
    }

    // --- 5. PARSING ---
    let parts = raw.split(SEP);
    while (parts.length < 6) parts.push("");

    // --- 6. AGGRESSIVE CLEANING ---
    const surgicalClean = (text: string, isTwitter: boolean): string => {
      if (!text) return "";

      let cleaned = text.trim();

      // Kill ALL label patterns
      cleaned = cleaned.replace(/^(Host|Subject|Hook|Intro|Body|Conclusion|CTA|Caption|Post|Script|Title|Video Script|Part \d+|Tweet \d+|Email|Twitter|Landing Page|Announcement|Instagram|TikTok|Dear|To|From):\s*/gim, '');

      // Kill "Dear [Name]," patterns
      cleaned = cleaned.replace(/^Dear\s*\[?[^\]]*\]?,?\s*/gim, '');
      cleaned = cleaned.replace(/\[Name\]/gi, 'friend');

      // Kill markdown headers
      cleaned = cleaned.replace(/^#+\s*/gm, '');

      // Kill double asterisks
      cleaned = cleaned.replace(/\*\*/g, '');

      // Kill bracketed content
      cleaned = cleaned.replace(/\[.*?\]/g, '');

      // Numbering isolation
      if (!isTwitter) {
        cleaned = cleaned.replace(/^\d+[\.\/\)]\s*/gm, '');
      }

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

    console.log(`✅ v4.9 Output: T:${twitter.length} E:${email.length} D:${description.length}`);

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