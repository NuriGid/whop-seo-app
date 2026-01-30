/**
 * Marketing Content Generator API
 * 
 * Uses Groq AI to generate marketing content for courses.
 * Ultra-strict formatting with comprehensive post-processing cleanup.
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

    // ULTRA-STRICT SYSTEM PROMPT
    const systemMessage = `You are a professional marketing copywriter for online courses on Whop.

OUTPUT FORMAT - You must output exactly 6 raw text blocks separated by '${SEP}':

1. TWITTER THREAD - 3-5 engaging tweets with hashtags. Start directly with the first tweet.

2. SALES EMAIL - Professional email body only. NO "Subject:" line. NO "Dear [Name]" greeting. Start directly with the sales pitch.

3. COURSE DESCRIPTION - Landing page style. SEO-optimized. 2-3 paragraphs about course benefits and what students will learn. NO email formatting. NO greetings.

4. COMMUNITY ANNOUNCEMENT - Exciting, concise announcement. First line is the title. NO "Subject:" line. NO email headers. Just the announcement text.

5. TIKTOK SCRIPT - Short video script. Hook, main points, CTA. Under 60 seconds.

6. INSTAGRAM CAPTION - 2-3 sentences with emojis and hashtags.

CRITICAL RULES:
- NEVER include "Part 1:", "Twitter:", "Email:" or any labels
- NEVER include "Subject:", "Dear", "To:" in ANY section
- NEVER use markdown headers (# or ##)
- Start each section DIRECTLY with the content
- Separate sections ONLY with ${SEP}`;

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
          { role: "user", content: `Generate marketing content for this course:\n\n${prompt}\n\nRemember: 6 raw text blocks separated by ${SEP}. No labels, no email headers, no Subject lines.` }
        ],
        temperature: 0.1,  // Maximum precision
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

    // DEEP CLEAN: Remove ALL unwanted labels and email formatting
    const cleanContent = (text: string): string => {
      return text
        // Remove part labels
        .replace(/^(Part\s*\d+\s*:?\s*)/gi, '')
        .replace(/^###.*?###\s*/gi, '')
        // Remove section headers
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
        // Remove EMAIL-specific formatting (Subject, Dear, To lines)
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
        // Remove asterisks used for bold/italic in markdown
        .replace(/\*\*/g, '')
        // Clean up extra newlines at start
        .replace(/^\n+/, '')
        // Final trim
        .trim();
    };

    // Clean each part
    const cleanParts = parts.map(p => cleanContent(p));

    console.log(`📊 Parsed and cleaned ${cleanParts.length} parts`);

    // Extract cleaned content with fallbacks
    const twitter = cleanParts[0] || "Content generation failed. Please try again.";
    const email = cleanParts[1] || "Content generation failed. Please try again.";
    const whopDescription = cleanParts[2] || email;
    const announcement = cleanParts[3] || "";
    const tiktok = cleanParts[4] || "Content generation failed. Please try again.";
    const instagram = cleanParts[5] || "Content generation failed. Please try again.";

    // Parse announcement (first line = title, rest = body)
    const announcementLines = announcement.split('\n').filter((l: string) => l.trim());
    const announcementTitle = cleanContent(announcementLines[0] || "🚀 New Course Available!");
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
      // Whop-specific (100% CLEAN)
      whopSalesDescription: whopDescription,
      announcementTitle,
      announcementBody
    });

  } catch (error: any) {
    return returnError(`Server error: ${error.message}`);
  }
}