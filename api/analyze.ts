/**
 * Marketing Content Generator API - CourseRocket
 * 
 * Uses Groq AI to generate HIGH-CONVERTING marketing content.
 * Simplified prompt with numbered sections for reliable parsing.
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

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

    console.log(`⚡️ Groq Request for: ${prompt.substring(0, 100)}`);

    // SIMPLE, NUMBERED PROMPT - AI follows numbered lists better
    const systemMessage = `You are a marketing copywriter. Generate 6 numbered sections for a course. Use this EXACT format:

[1] X/TWITTER THREAD:
(Write 4-5 tweets with 1/5, 2/5, etc numbering and hashtags)

[2] SALES EMAIL:
(Write a persuasive sales email. No Subject line. No Dear. Start with hook.)

[3] COURSE DESCRIPTION:
(Write landing page description with benefits and CTA)

[4] ANNOUNCEMENT:
(Write exciting announcement with emoji title on first line)

[5] TIKTOK SCRIPT:
(Write 30 second video script)

[6] INSTAGRAM CAPTION:
(Write caption with emojis and hashtags)

IMPORTANT: Use [1], [2], [3], [4], [5], [6] markers exactly as shown.`;

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
          { role: "user", content: `Create marketing content for this course: ${prompt}` }
        ],
        temperature: 0.4,
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

    // PARSE BY NUMBERED SECTIONS [1], [2], etc.
    const extractSection = (content: string, num: number): string => {
      const patterns = [
        new RegExp(`\\[${num}\\][^\\[]*`, 's'),  // [1] ... until next [
        new RegExp(`\\[${num}\\].*?(?=\\[${num + 1}\\]|$)`, 's'),  // [1] until [2]
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          return cleanContent(match[0]);
        }
      }

      // Fallback: Try to find section header variations
      const headerPatterns = [
        /\[1\].*?X\/TWITTER|TWITTER THREAD/i,
        /\[2\].*?SALES EMAIL|EMAIL/i,
        /\[3\].*?COURSE DESCRIPTION|DESCRIPTION/i,
        /\[4\].*?ANNOUNCEMENT/i,
        /\[5\].*?TIKTOK/i,
        /\[6\].*?INSTAGRAM/i,
      ];

      return "";
    };

    // Alternative: Split by [number] pattern
    const sections: string[] = [];
    const splitRegex = /\[\d+\]\s*[A-Z\/\s]+:/gi;
    const parts = rawContent.split(splitRegex);

    // If split worked, use parts (skip first empty part)
    if (parts.length >= 6) {
      for (let i = 1; i <= 6; i++) {
        sections.push(parts[i] ? cleanContent(parts[i]) : "");
      }
    } else {
      // Manual extraction
      console.log("⚠️ Split failed, trying manual extraction");

      // Try to find each section by marker
      for (let i = 1; i <= 6; i++) {
        const markerRegex = new RegExp(`\\[${i}\\][^\\[]*`, 's');
        const match = rawContent.match(markerRegex);
        sections.push(match ? cleanContent(match[0]) : "");
      }
    }

    // Clean content helper - AGGRESSIVE label removal
    function cleanContent(text: string): string {
      if (!text) return "";

      return text
        // Remove section markers and headers
        .replace(/^\[\d+\]\s*/g, '')
        .replace(/^(X\/TWITTER|TWITTER)\s*(THREAD)?:?\s*/gi, '')
        .replace(/^SALES\s*EMAIL:?\s*/gi, '')
        .replace(/^(COURSE\s*)?DESCRIPTION:?\s*/gi, '')
        .replace(/^(COMMUNITY\s*)?ANNOUNCEMENT:?\s*/gi, '')
        .replace(/^TIKTOK\s*(SCRIPT)?:?\s*/gi, '')
        .replace(/^INSTAGRAM\s*(CAPTION)?:?\s*/gi, '')
        // Remove tweet numbering headers like "5/5 TWITTER THREAD:"
        .replace(/^\d+\/\d+\s*(TWITTER|X)?\s*(THREAD)?:?\s*/gim, '')
        // Remove common garbage labels
        .replace(/^Hook:?\s*/gim, '')
        .replace(/^CTA:?\s*/gim, '')
        .replace(/^Call\s*to\s*Action:?\s*/gim, '')
        .replace(/^Intro(duction)?:?\s*/gim, '')
        .replace(/^Body:?\s*/gim, '')
        .replace(/^Conclusion:?\s*/gim, '')
        .replace(/^Opening:?\s*/gim, '')
        .replace(/^Closing:?\s*/gim, '')
        .replace(/^Main\s*(Content|Point|Body)?:?\s*/gim, '')
        .replace(/^Tweet\s*\d+:?\s*/gim, '')
        .replace(/^Post:?\s*/gim, '')
        .replace(/^Caption:?\s*/gim, '')
        .replace(/^Script:?\s*/gim, '')
        .replace(/^Video\s*Script:?\s*/gim, '')
        // Remove email headers
        .replace(/^Subject:.*$/gim, '')
        .replace(/^Dear\s*\[?[^\]]*\]?,?\s*/gim, '')
        .replace(/^To:.*$/gim, '')
        .replace(/^From:.*$/gim, '')
        .replace(/^Hi\s+\w+,?\s*/gim, '')
        .replace(/^Hello\s+\w+,?\s*/gim, '')
        // Remove markdown formatting
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*/g, '')
        // Clean whitespace
        .replace(/^\n+/, '')
        .trim();
    }

    const twitter = sections[0] || "";
    const email = sections[1] || "";
    const description = sections[2] || "";
    const announcement = sections[3] || "";
    const tiktok = sections[4] || "";
    const instagram = sections[5] || "";

    // Debug logging
    console.log(`✅ Parsed sections: T:${twitter.length} E:${email.length} D:${description.length} A:${announcement.length} TK:${tiktok.length} I:${instagram.length}`);

    // Parse announcement title
    const announcementLines = announcement.split('\n').filter(l => l.trim());
    const announcementTitle = announcementLines[0] || "🚀 New Course Available!";
    const announcementBody = announcementLines.slice(1).join('\n').trim() || announcement;

    // Return with fallbacks
    const fallback = (text: string, name: string) => {
      if (text && text.length > 10) return text;
      console.warn(`⚠️ ${name} is empty or too short`);
      return `[${name} content will be generated - please try again]`;
    };

    return res.status(200).json({
      twitter: fallback(twitter, "Twitter"),
      email: fallback(email, "Email"),
      instagram: fallback(instagram, "Instagram"),
      tiktok: fallback(tiktok, "TikTok"),
      twitterThread: fallback(twitter, "Twitter"),
      salesEmail: fallback(email, "Email"),
      instagramPost: fallback(instagram, "Instagram"),
      tiktokScript: fallback(tiktok, "TikTok"),
      whopSalesDescription: fallback(description, "Description"),
      announcementTitle,
      announcementBody: announcementBody || "Check out our latest course!"
    });

  } catch (error: any) {
    return returnError(`Server error: ${error.message}`);
  }
}