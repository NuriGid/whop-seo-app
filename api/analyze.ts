/**
 * CourseRocket - Marketing Content Engine v5.1 (STRICT BLOCKS)
 * BUILD: 2026-02-03-05:22
 * 
 * PHILOSOPHY:
 * - User Note = PRIMARY LENS (100% weight)
 * - Course Content = RAW MATERIAL (10% weight)
 * - No hardcoded keywords. Universal synchronization.
 * 
 * v5.1 FIX: Using numbered block markers for reliable parsing
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

// Block markers for reliable parsing
const BLOCK_MARKERS = ['[BLOCK_1]', '[BLOCK_2]', '[BLOCK_3]', '[BLOCK_4]', '[BLOCK_5]', '[BLOCK_6]'];

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

  console.log('📥 v5.1 RAW PROMPT:', prompt.substring(0, 150));

  if (prompt.includes("Additional notes:")) {
    const parts = prompt.split("Additional notes:");
    prompt = parts[0].trim();
    userNote = parts[1]?.trim() || "";
  }

  console.log('🎯 USER LENS:', userNote || '(No lens - default marketing)');

  try {
    // --- 2. BUILD CONTEXTUAL FRAMING PROMPT ---
    const outputFormat = `
OUTPUT FORMAT (CRITICAL - FOLLOW EXACTLY):
You MUST output exactly 6 blocks, each starting with a marker.
DO NOT add any text before [BLOCK_1] or between blocks except the content itself.

[BLOCK_1]
Twitter thread here (4-5 tweets, numbered 1/, 2/, 3/, 4/, 5/)

[BLOCK_2]
Sales email here (Direct hook, no Subject line, no Dear)

[BLOCK_3]
Whop landing page description here (Benefits, bullet points, CTA)

[BLOCK_4]
Community announcement here (Emoji title on first line, then body)

[BLOCK_5]
TikTok/Video script here (Dialogue ONLY, no brackets or scene descriptions)

[BLOCK_6]
Instagram caption here (Engaging hook, emojis, hashtags)

RULES:
- Each block MUST start exactly with [BLOCK_X] marker
- NO labels like "Subject:", "Hook:", "Tweet 1:", "Part 1:" inside blocks
- RAW content only, no markdown
- Keep each block focused on its purpose`;

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

Adapt EVERYTHING to the "${userNote}" perspective.
${outputFormat}`;

    } else {
      // DEFAULT MODE: Standard marketing (no user lens)
      systemPrompt = `You are a world-class Direct-Response Copywriter.

Your job is to create high-converting marketing content.

Focus on conversion, engagement, and clear value propositions.
${outputFormat}`;
    }

    // --- 3. BUILD USER MESSAGE ---
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
        temperature: 0.2,
        max_tokens: 4000
      })
    });

    if (!response.ok) return returnError(`API Error: ${response.status}`);

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content || "";

    console.log('📥 AI Response length:', raw.length);

    // --- 5. PARSE BLOCKS BY MARKERS ---
    const parseBlocks = (text: string): string[] => {
      const blocks: string[] = ['', '', '', '', '', ''];

      for (let i = 0; i < 6; i++) {
        const currentMarker = BLOCK_MARKERS[i];
        const nextMarker = BLOCK_MARKERS[i + 1];

        const startIdx = text.indexOf(currentMarker);
        if (startIdx === -1) continue;

        const contentStart = startIdx + currentMarker.length;
        let contentEnd: number;

        if (nextMarker) {
          const nextIdx = text.indexOf(nextMarker);
          contentEnd = nextIdx !== -1 ? nextIdx : text.length;
        } else {
          contentEnd = text.length;
        }

        blocks[i] = text.substring(contentStart, contentEnd).trim();
      }

      return blocks;
    };

    const blocks = parseBlocks(raw);
    console.log('📦 Parsed blocks:', blocks.map((b, i) => `B${i + 1}:${b.length}`).join(' '));

    // --- 6. CLEAN CONTENT ---
    const cleanContent = (text: string, isTwitter: boolean): string => {
      if (!text) return "";

      let cleaned = text.trim();

      // Remove any lingering labels
      cleaned = cleaned.replace(/^(Subject|Hook|Tweet \d+|Part \d+|Email|Caption|Script|Title|Intro|Body|CTA):\s*/gim, '');

      // Remove markdown
      cleaned = cleaned.replace(/\*\*/g, '');
      cleaned = cleaned.replace(/^#+\s*/gm, '');
      cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
      cleaned = cleaned.replace(/\[.*?\]/g, '');

      // Numbering isolation (only Twitter keeps 1/, 2/)
      if (!isTwitter) {
        cleaned = cleaned.replace(/^\d+[\.\/\)]\s*/gm, '');
      }

      return cleaned.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n').trim();
    };

    const twitter = cleanContent(blocks[0], true);
    const email = cleanContent(blocks[1], false);
    const description = cleanContent(blocks[2], false);
    const announcement = cleanContent(blocks[3], false);
    const tiktok = cleanContent(blocks[4], false);
    const instagram = cleanContent(blocks[5], false);

    // Announcement title extraction
    const annLines = announcement.split('\n').filter(l => l.trim());
    const announcementTitle = annLines[0] || "🚀 Exciting Update!";
    const announcementBody = annLines.slice(1).join('\n').trim() || announcement;

    console.log(`✅ v5.1 Output: T:${twitter.length} E:${email.length} D:${description.length} A:${announcement.length} TK:${tiktok.length} I:${instagram.length}`);

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