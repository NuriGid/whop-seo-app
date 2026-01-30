/**
 * Marketing Content Generator API
 * 
 * Uses Groq AI to generate marketing content for courses.
 * Strict separator and low temperature for content isolation.
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

    const systemMessage = `You are a specialized marketing content engine for Whop course sellers.

CRITICAL RULES:
1. Output EXACTLY 6 parts separated by: ${SEP}
2. Do NOT bleed content between parts
3. Each part must be COMPLETELY SEPARATE
4. Do NOT use tags like [Email Content] or [Twitter]. Just raw text.
5. Do NOT use markdown headers or code blocks

OUTPUT FORMAT (6 parts in this EXACT order):

PART 1 - TWITTER THREAD:
3-5 engaging tweets about the course. Include hashtags.

${SEP}

PART 2 - SALES EMAIL:
Professional email body to promote the course. 2-3 paragraphs.

${SEP}

PART 3 - WHOP COURSE DESCRIPTION:
SEO-optimized, compelling sales description for the Whop course landing page. 2-3 paragraphs. Focus on benefits, what students will learn, and why they should enroll.

${SEP}

PART 4 - WHOP COMMUNITY ANNOUNCEMENT:
Exciting announcement for the Whop community about this course. Start with an attention-grabbing title, then the body. 1-2 paragraphs.

${SEP}

PART 5 - TIKTOK SCRIPT:
Short, engaging video script for TikTok. Include hook, main points, and call-to-action. Under 60 seconds.

${SEP}

PART 6 - INSTAGRAM CAPTION:
Engaging Instagram caption with emojis and relevant hashtags. 2-3 sentences max.`;

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
          { role: "user", content: `Generate marketing content for this course:\n\n${prompt}\n\nRemember: Separate each of the 6 parts with ${SEP}` }
        ],
        temperature: 0.3,  // Lower temperature for stricter formatting
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return returnError(`Groq API Error (${response.status}): ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    const textAnswer = data.choices?.[0]?.message?.content || "";

    console.log("📝 Raw Response Length:", textAnswer.length);

    // Split by separator
    const parts = textAnswer.split(SEP).map((p: string) => p.trim());

    console.log(`📊 Parsed ${parts.length} parts`);

    // Parse each part with fallbacks
    const twitter = parts[0] || "Content generation failed. Please try again.";
    const email = parts[1] || "Content generation failed. Please try again.";
    const whopDescription = parts[2] || email;  // Fallback to email
    const announcement = parts[3] || "";
    const tiktok = parts[4] || "Content generation failed. Please try again.";
    const instagram = parts[5] || "Content generation failed. Please try again.";

    // Parse announcement (first line = title, rest = body)
    const announcementLines = announcement.split('\n').filter((l: string) => l.trim());
    const announcementTitle = announcementLines[0]?.trim() || "🚀 New Course Available!";
    const announcementBody = announcementLines.slice(1).join('\n').trim() || announcement;

    console.log(`✅ Content generated successfully`);

    return res.status(200).json({
      // Legacy fields for compatibility
      twitter,
      email,
      instagram,
      tiktok,
      twitterThread: twitter,
      salesEmail: email,
      instagramPost: instagram,
      tiktokScript: tiktok,
      // Whop-specific content (PRIORITY)
      whopSalesDescription: whopDescription,
      announcementTitle,
      announcementBody
    });

  } catch (error: any) {
    return returnError(`Server error: ${error.message}`);
  }
}