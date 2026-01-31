/**
 * Marketing Content Generator API
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

    // DIRECT-RESPONSE COPYWRITING PROMPT
    const systemMessage = `You are a world-class Direct-Response Copywriter. Your job is to SELL courses.

OUTPUT: Exactly 6 raw text blocks separated by '${SEP}'. NO labels, NO headers, NO 'Part X'.

CONTENT RULES:

1. X (TWITTER) THREAD - Must be exactly 4-5 tweets (flood format):
   - Use 1/5, 2/5, 3/5, 4/5, 5/5 numbering
   - First tweet = powerful hook
   - Last tweet = call-to-action with course link placeholder
   - Include relevant hashtags

2. SALES EMAIL (NO numbering like 1/5, NO Subject line, NO Dear):
   - Direct, persuasive sales pitch
   - Start with a compelling hook
   - Focus on transformation and benefits
   - End with call-to-action

3. COURSE DESCRIPTION (HIGH-CONVERTING LANDING PAGE):
   - Start with a POWERFUL HOOK that grabs attention
   - List 3-5 bullet points of KEY BENEFITS (use ✅ or • symbols)
   - Include "What You'll Learn" or "What You Get" section
   - End with a STRONG call-to-action
   - DO NOT write like an academic syllabus

4. COMMUNITY ANNOUNCEMENT (hype-driven):
   - First line = exciting title with emoji
   - Body = enthusiastic, FOMO-inducing message
   - Keep it concise and punchy

5. TIKTOK SCRIPT:
   - Hook in first 3 seconds
   - Fast-paced, engaging content
   - Clear CTA at end

6. INSTAGRAM CAPTION:
   - 2-3 sentences with emojis
   - Relevant hashtags

CRITICAL: Raw content only. Separate with ${SEP}. No headers.`;

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
          { role: "user", content: `Generate high-converting marketing content for this course:\n\n${prompt}\n\nRemember: 6 raw blocks separated by ${SEP}. Landing page style for course description. No academic tone.` }
        ],
        temperature: 0.2,  // Slightly higher for more creative sales copy
        max_tokens: 3500
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

    // DEEP CLEAN: Remove ALL unwanted formatting
    const cleanContent = (text: string, removeNumbering: boolean = false): string => {
      let cleaned = text
        // Remove part labels
        .replace(/^(Part\s*\d+\s*:?\s*)/gi, '')
        .replace(/^###.*?###\s*/gi, '')
        // Remove section headers
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
        .replace(/^(Introduction:?\s*)/gi, '')
        .replace(/^(Content:?\s*)/gi, '')
        // Remove EMAIL-specific formatting
        .replace(/^Subject:.*$/gim, '')
        .replace(/^Dear\s*\[?[^\]]*\]?,?\s*/gim, '')
        .replace(/^Dear\s+\w+,?\s*/gim, '')
        .replace(/^To:.*$/gim, '')
        .replace(/^From:.*$/gim, '')
        .replace(/^Hi\s*\[?[^\]]*\]?,?\s*/gim, '')
        .replace(/^Hello\s*\[?[^\]]*\]?,?\s*/gim, '')
        .replace(/^Hey\s*\[?[^\]]*\]?,?\s*/gim, '')
        // Remove markdown headers
        .replace(/^#+\s*/gm, '')
        // Clean up extra newlines at start
        .replace(/^\n+/, '')
        .trim();

      // Remove thread numbering (1/5, 2/5, etc.) only for non-Twitter content
      if (removeNumbering) {
        cleaned = cleaned
          .replace(/^\d+\/\d+\s*/gm, '')  // Remove 1/5 at start of lines
          .replace(/\[\d+\/\d+\]\s*/g, '')  // Remove [1/5] anywhere
          .trim();
      }

      return cleaned;
    };

    // Apply cleaning with specific rules per content type
    const twitter = cleanContent(parts[0] || "", false);  // Twitter CAN have numbering
    const email = cleanContent(parts[1] || "", true);     // Email: REMOVE numbering
    const whopDescription = cleanContent(parts[2] || "", true);  // Description: REMOVE numbering
    const announcement = cleanContent(parts[3] || "", true);
    const tiktok = cleanContent(parts[4] || "", true);
    const instagram = cleanContent(parts[5] || "", true);

    console.log(`📊 Parsed and cleaned ${parts.length} parts`);

    // Parse announcement (first line = title, rest = body)
    const announcementLines = announcement.split('\n').filter((l: string) => l.trim());
    const announcementTitle = announcementLines[0] || "🚀 New Course Available!";
    const announcementBody = announcementLines.slice(1).join('\n').trim() || announcement;

    console.log(`✅ Content generated and cleaned successfully`);

    return res.status(200).json({
      // Legacy fields
      twitter,
      email,
      instagram,
      tiktok,
      twitterThread: twitter,
      salesEmail: email,
      instagramPost: instagram,
      tiktokScript: tiktok,
      // Whop-specific (100% CLEAN, LANDING PAGE STYLE)
      whopSalesDescription: whopDescription,
      announcementTitle,
      announcementBody
    });

  } catch (error: any) {
    return returnError(`Server error: ${error.message}`);
  }
}