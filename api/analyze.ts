/**
 * Marketing Content Generator API - CourseRocket
 * 
 * Uses Groq AI to generate HIGH-CONVERTING marketing content.
 * Direct-Response Copywriting style with comprehensive cleanup.
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
    console.error(`❌ ERROR: ${msg}`);
    return res.status(200).json({
      twitter: `⚠️ Error: ${msg}`,
      email: `⚠️ Error: ${msg}`,
      instagram: `⚠️ Error: ${msg}`,
      tiktok: `⚠️ Error: ${msg}`,
      whopSalesDescription: `⚠️ Error: ${msg}`,
      announcementTitle: 'Error',
      announcementBody: msg
    });
  };

  if (req.method !== 'POST') return returnError('POST only.');

  try {
    if (!GROQ_API_KEY) {
      return returnError('GROQ_API_KEY missing.');
    }

    if (!req.body || !req.body.prompt) {
      return returnError('No prompt provided.');
    }

    const { prompt } = req.body;

    console.log(`⚡️ Groq Request: llama-3.1-8b-instant`);

    // DIRECT-RESPONSE COPYWRITING PROMPT - Ultra strict format
    const systemMessage = `You are a world-class Direct-Response Copywriter. Your job is to SELL courses.

CRITICAL FORMAT RULES:
- Output EXACTLY 6 text blocks
- Separate each block with EXACTLY: ${SEP}
- NO headers, NO labels, NO "Part 1:", NO section titles
- Start each block DIRECTLY with the content

CONTENT ORDER (separated by ${SEP}):

BLOCK 1 - X/TWITTER THREAD:
4-5 tweets in flood format with 1/5, 2/5, 3/5, 4/5, 5/5 numbering
Include hashtags. First tweet = powerful hook.

${SEP}

BLOCK 2 - SALES EMAIL:
Professional, persuasive sales email. NO "Subject:" line. NO "Dear". 
Start directly with a compelling hook. End with CTA.

${SEP}

BLOCK 3 - COURSE DESCRIPTION:
High-converting landing page style. Include:
- Powerful hook
- Bullet points with benefits (use ✅)
- "What You'll Learn" section
- Strong CTA

${SEP}

BLOCK 4 - COMMUNITY ANNOUNCEMENT:
First line = exciting title with emoji
Body = enthusiastic, FOMO-inducing message

${SEP}

BLOCK 5 - TIKTOK SCRIPT:
30-60 second video script. Hook in first 3 seconds. CTA at end.

${SEP}

BLOCK 6 - INSTAGRAM CAPTION:
Start with emoji. 2-3 engaging sentences. CTA. End with 5-8 hashtags.

REMEMBER: Separate with ${SEP}. Raw content only.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: `Create marketing content for: ${prompt}` }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return returnError(`Groq API Error (${response.status}): ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    console.log("📝 Raw Response Length:", rawContent.length);
    console.log("📝 Raw Content Preview:", rawContent.substring(0, 500));

    // ROBUST PARSING: Try multiple separator patterns
    let parts: string[] = [];

    // Try main separator first
    if (rawContent.includes(SEP)) {
      parts = rawContent.split(SEP);
    }
    // Fallback: Try variations
    else if (rawContent.includes('###NEXT PART###')) {
      parts = rawContent.split('###NEXT PART###');
    }
    else if (rawContent.includes('---')) {
      parts = rawContent.split(/\n---+\n/);
    }
    else if (rawContent.includes('BLOCK')) {
      // Parse by BLOCK labels
      parts = rawContent.split(/BLOCK\s*\d+[:\-\s]*/i).filter(p => p.trim());
    }
    else {
      // Last resort: Split by double newlines and group
      console.warn("⚠️ No separator found, using fallback parsing");
      const lines = rawContent.split('\n\n');
      // Take first section as twitter, estimate others
      parts = [
        lines.slice(0, 5).join('\n\n'),  // Twitter
        lines.slice(5, 8).join('\n\n'),   // Email
        lines.slice(8, 12).join('\n\n'),  // Description
        lines.slice(12, 14).join('\n\n'), // Announcement
        lines.slice(14, 17).join('\n\n'), // TikTok
        lines.slice(17).join('\n\n')      // Instagram
      ];
    }

    console.log(`📊 Parsed ${parts.length} parts`);

    // DEEP CLEAN function
    const cleanContent = (text: string, removeNumbering: boolean = false): string => {
      if (!text) return "";

      let cleaned = text
        // Remove part/block labels
        .replace(/^(Part\s*\d+\s*:?\s*)/gi, '')
        .replace(/^(Block\s*\d+\s*:?\s*)/gi, '')
        .replace(/^###.*?###\s*/gi, '')
        // Remove section headers
        .replace(/^(X\s*\/?\s*Twitter\s*(Thread)?:?\s*)/gi, '')
        .replace(/^(Twitter\s*(Thread)?:?\s*)/gi, '')
        .replace(/^(Email\s*(Content)?:?\s*)/gi, '')
        .replace(/^(Sales\s*Email:?\s*)/gi, '')
        .replace(/^(Course\s*Description:?\s*)/gi, '')
        .replace(/^(Whop\s*(Course\s*)?Description:?\s*)/gi, '')
        .replace(/^(Landing\s*Page:?\s*)/gi, '')
        .replace(/^(Announcement:?\s*)/gi, '')
        .replace(/^(Community\s*Announcement:?\s*)/gi, '')
        .replace(/^(TikTok\s*(Script)?:?\s*)/gi, '')
        .replace(/^(Instagram\s*(Caption|Post)?:?\s*)/gi, '')
        // Remove EMAIL-specific formatting
        .replace(/^Subject:.*$/gim, '')
        .replace(/^Dear\s*\[?[^\]]*\]?,?\s*/gim, '')
        .replace(/^To:.*$/gim, '')
        .replace(/^From:.*$/gim, '')
        .replace(/^Hi\s*\[?[^\]]*\]?,?\s*/gim, '')
        .replace(/^Hello\s*\[?[^\]]*\]?,?\s*/gim, '')
        // Remove markdown headers
        .replace(/^#+\s*/gm, '')
        // Clean up extra newlines
        .replace(/^\n+/, '')
        .trim();

      if (removeNumbering) {
        cleaned = cleaned
          .replace(/^\d+\/\d+\s*/gm, '')
          .replace(/\[\d+\/\d+\]\s*/g, '')
          .trim();
      }

      return cleaned;
    };

    // Apply cleaning - ensure we have at least 6 parts
    while (parts.length < 6) {
      parts.push("");
    }

    const twitter = cleanContent(parts[0], false);
    const email = cleanContent(parts[1], true);
    const whopDescription = cleanContent(parts[2], true);
    const announcement = cleanContent(parts[3], true);
    const tiktok = cleanContent(parts[4], true);
    const instagram = cleanContent(parts[5], true);

    // Log for debugging
    console.log(`✅ Twitter: ${twitter.substring(0, 50)}...`);
    console.log(`✅ Email: ${email.substring(0, 50)}...`);
    console.log(`✅ Description: ${whopDescription.substring(0, 50)}...`);
    console.log(`✅ Announcement: ${announcement.substring(0, 50)}...`);
    console.log(`✅ TikTok: ${tiktok.substring(0, 50)}...`);
    console.log(`✅ Instagram: ${instagram.substring(0, 50)}...`);

    // Parse announcement (first line = title, rest = body)
    const announcementLines = announcement.split('\n').filter((l: string) => l.trim());
    const announcementTitle = announcementLines[0] || "🚀 New Course Available!";
    const announcementBody = announcementLines.slice(1).join('\n').trim() || announcement;

    return res.status(200).json({
      // Legacy fields
      twitter: twitter || "Content generation in progress...",
      email: email || "Content generation in progress...",
      instagram: instagram || "Content generation in progress...",
      tiktok: tiktok || "Content generation in progress...",
      // Mapped fields
      twitterThread: twitter || "Content generation in progress...",
      salesEmail: email || "Content generation in progress...",
      instagramPost: instagram || "Content generation in progress...",
      tiktokScript: tiktok || "Content generation in progress...",
      // Whop-specific
      whopSalesDescription: whopDescription || "Content generation in progress...",
      announcementTitle,
      announcementBody: announcementBody || "Check out our latest course!"
    });

  } catch (error: any) {
    return returnError(`Server error: ${error.message}`);
  }
}