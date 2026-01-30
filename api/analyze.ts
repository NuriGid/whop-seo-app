/**
 * Marketing Content Generator API
 * 
 * Uses Groq AI to generate marketing content for courses.
 * Strict separator, very low temperature, and post-processing for 100% clean output.
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

    // ULTRA-STRICT SYSTEM MESSAGE - NO LABELS ALLOWED
    const systemMessage = `You are a professional marketing copywriter for online courses.

CRITICAL FORMAT RULES - VIOLATION WILL BREAK THE SYSTEM:
1. Output ONLY raw content text - NO labels, NO headers, NO part numbers
2. Separate the 6 sections using ONLY: ${SEP}
3. NEVER write "Part 1:", "Twitter:", "Introduction:", "Email:", or ANY header
4. NEVER use markdown headers like # or ##
5. Start each section DIRECTLY with the content itself

YOUR OUTPUT MUST BE EXACTLY:

[Raw Twitter thread content - 3-5 engaging tweets with hashtags]
${SEP}
[Raw sales email body - 2-3 paragraphs, professional tone]
${SEP}
[Raw course description - SEO-optimized, 2-3 paragraphs about benefits and what students learn]
${SEP}
[Raw announcement - Start with exciting title line, then body paragraph]
${SEP}
[Raw TikTok script - Hook, main points, CTA, under 60 seconds]
${SEP}
[Raw Instagram caption - 2-3 sentences with emojis and hashtags]

REMEMBER: Raw content ONLY. No labels. No headers. Just the text.`;

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
          { role: "user", content: `Generate marketing content for this course:\n\n${prompt}\n\nRemember: Raw content only, separated by ${SEP}. No labels or headers.` }
        ],
        temperature: 0.1,  // ULTRA-LOW for strictest format adherence
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return returnError(`Groq API Error (${response.status}): ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    console.log("📝 Raw Response Length:", rawContent.length);

    // Split by separator
    const parts = rawContent.split(SEP);

    // POST-PROCESSING: Clean any lingering labels/headers that AI might have added
    const cleanContent = (text: string): string => {
      return text
        // Remove "Part X:" or "###Part X###" style labels
        .replace(/^(Part\s*\d+\s*:?\s*)/gi, '')
        .replace(/^###.*?###\s*/gi, '')
        // Remove common header prefixes
        .replace(/^(Twitter\s*(Thread)?:?\s*)/gi, '')
        .replace(/^(Email\s*(Content)?:?\s*)/gi, '')
        .replace(/^(Sales\s*Email:?\s*)/gi, '')
        .replace(/^(Course\s*Description:?\s*)/gi, '')
        .replace(/^(Whop\s*Description:?\s*)/gi, '')
        .replace(/^(Announcement:?\s*)/gi, '')
        .replace(/^(Community\s*Announcement:?\s*)/gi, '')
        .replace(/^(TikTok\s*(Script)?:?\s*)/gi, '')
        .replace(/^(Instagram\s*(Caption|Post)?:?\s*)/gi, '')
        .replace(/^(Introduction:?\s*)/gi, '')
        .replace(/^(Content:?\s*)/gi, '')
        // Remove markdown headers
        .replace(/^#+\s*/gm, '')
        // Remove leading/trailing whitespace
        .trim();
    };

    // Clean each part
    const cleanParts = parts.map(p => cleanContent(p));

    console.log(`📊 Parsed and cleaned ${cleanParts.length} parts`);

    // Extract cleaned content with fallbacks
    const twitter = cleanParts[0] || "Content generation failed. Please try again.";
    const email = cleanParts[1] || "Content generation failed. Please try again.";
    const whopDescription = cleanParts[2] || email;  // Fallback to email
    const announcement = cleanParts[3] || "";
    const tiktok = cleanParts[4] || "Content generation failed. Please try again.";
    const instagram = cleanParts[5] || "Content generation failed. Please try again.";

    // Parse announcement (first line = title, rest = body)
    const announcementLines = announcement.split('\n').filter((l: string) => l.trim());
    const announcementTitle = cleanContent(announcementLines[0] || "🚀 New Course Available!");
    const announcementBody = announcementLines.slice(1).join('\n').trim() || announcement;

    console.log(`✅ Content generated and cleaned successfully`);

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
      // Whop-specific content (PRIORITY - 100% CLEAN)
      whopSalesDescription: whopDescription,
      announcementTitle,
      announcementBody
    });

  } catch (error: any) {
    return returnError(`Server error: ${error.message}`);
  }
}