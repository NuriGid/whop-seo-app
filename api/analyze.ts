/**
 * CourseRocket - Marketing Content Engine
 * 
 * Production-grade AI content generator for Whop courses.
 * Uses Groq/Llama for high-converting marketing copy.
 * 
 * @version 2.0.0 - Final Production Build
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const SEP = '###NEXT_PART###';

export default async function handler(req: any, res: any) {
  // CORS - Production headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Error helper
  const returnError = (msg: string) => {
    console.error(`❌ CourseRocket Error: ${msg}`);
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

  if (req.method !== 'POST') return returnError('POST method required.');

  // Validate environment
  if (!GROQ_API_KEY) {
    return returnError('GROQ_API_KEY not configured. Check Vercel environment variables.');
  }

  // Validate request
  if (!req.body?.prompt) {
    return returnError('Missing course information.');
  }

  const { prompt } = req.body;
  console.log(`🚀 CourseRocket generating content for: ${prompt.substring(0, 80)}...`);

  try {
    // PRODUCTION PROMPT - Direct Response Copywriting
    const systemPrompt = `You are an elite Direct-Response Copywriter. Your job is to create marketing content that SELLS.

OUTPUT FORMAT: Write exactly 6 content blocks. Separate each block with: ${SEP}

BLOCK ORDER:
1. X/TWITTER THREAD (4-5 tweets numbered 1/, 2/, 3/, 4/, 5/ with hashtags)
2. SALES EMAIL (persuasive email body - NO "Subject:" or "Dear")  
3. WHOP LANDING PAGE (benefit-focused course description with bullet points)
4. COMMUNITY ANNOUNCEMENT (exciting title + body for course launch)
5. SHORT VIDEO SCRIPT (30-60 second hook + content + CTA)
6. INSTAGRAM CAPTION (engaging post with emojis and hashtags)

STRICT RULES:
- Do NOT include labels like "Part 1:", "Twitter Thread:", "Email:", etc.
- Start each block DIRECTLY with the content
- Use ${SEP} between blocks
- Write in English for international audience
- Focus on benefits and transformation
- Include strong calls-to-action`;

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
          { role: "user", content: `Generate marketing content for: ${prompt}` }
        ],
        temperature: 0.2,  // Strict formatting
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return returnError(`AI API Error: ${err.substring(0, 100)}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    console.log(`📝 Raw response: ${rawContent.length} chars`);

    // PARSE - Split by separator
    let parts = rawContent.split(SEP);

    // Fallback: Try numbered patterns if separator fails
    if (parts.length < 6) {
      console.log('⚠️ Separator not found, trying pattern matching...');
      const patterns = [
        /\[?1\]?[\.\)\:]?\s*(X\/)?TWITTER/i,
        /\[?2\]?[\.\)\:]?\s*SALES?\s*EMAIL/i,
        /\[?3\]?[\.\)\:]?\s*(WHOP|COURSE|LANDING)/i,
        /\[?4\]?[\.\)\:]?\s*(COMMUNITY|ANNOUNC)/i,
        /\[?5\]?[\.\)\:]?\s*(VIDEO|TIKTOK|SHORT)/i,
        /\[?6\]?[\.\)\:]?\s*INSTAGRAM/i
      ];

      let lastIndex = 0;
      parts = [];

      for (let i = 0; i < patterns.length; i++) {
        const regex = new RegExp(patterns[i].source, 'gi');
        const match = regex.exec(rawContent.substring(lastIndex));
        if (match) {
          const start = lastIndex + match.index;
          if (i > 0) {
            parts.push(rawContent.substring(lastIndex, start));
          }
          lastIndex = start;
        }
      }
      parts.push(rawContent.substring(lastIndex));
    }

    // Ensure 6 parts
    while (parts.length < 6) parts.push("");

    // AGGRESSIVE CONTENT CLEANER
    const clean = (text: string, keepNumbering: boolean = false): string => {
      if (!text) return "";

      let cleaned = text
        // Remove block markers
        .replace(/^\[\d+\]\s*/gi, '')
        .replace(/^(BLOCK\s*)?\d+[\.\)\:]\s*/gi, '')
        // Remove section headers
        .replace(/^(X\/)?(TWITTER|X)\s*(THREAD)?[\:\-]?\s*/gi, '')
        .replace(/^SALES?\s*EMAIL[\:\-]?\s*/gi, '')
        .replace(/^(WHOP\s*)?(COURSE\s*)?(LANDING\s*)?(PAGE\s*)?DESCRIPTION[\:\-]?\s*/gi, '')
        .replace(/^(COMMUNITY\s*)?ANNOUNCEMENT[\:\-]?\s*/gi, '')
        .replace(/^(SHORT\s*)?(VIDEO\s*)?SCRIPT[\:\-]?\s*/gi, '')
        .replace(/^(TIKTOK\s*)(SCRIPT)?[\:\-]?\s*/gi, '')
        .replace(/^INSTAGRAM\s*(CAPTION|POST)?[\:\-]?\s*/gi, '')
        // Remove garbage labels
        .replace(/^Hook[\:\-]?\s*/gim, '')
        .replace(/^CTA[\:\-]?\s*/gim, '')
        .replace(/^(Call\s*to\s*Action)[\:\-]?\s*/gim, '')
        .replace(/^(Intro(duction)?|Body|Conclusion|Opening|Closing)[\:\-]?\s*/gim, '')
        .replace(/^Tweet\s*\d+[\:\-]?\s*/gim, '')
        .replace(/^(Part|Section)\s*\d+[\:\-]?\s*/gim, '')
        .replace(/^Main\s*(Content|Point)?[\:\-]?\s*/gim, '')
        .replace(/^Caption[\:\-]?\s*/gim, '')
        .replace(/^Post[\:\-]?\s*/gim, '')
        // Remove email headers
        .replace(/^Subject[\:\-]?\s*.+$/gim, '')
        .replace(/^Dear\s*\[?[^\]\n]*\]?,?\s*/gim, '')
        .replace(/^(To|From)[\:\-]?\s*.+$/gim, '')
        .replace(/^(Hi|Hello|Hey)\s+\w+,?\s*/gim, '')
        // Remove markdown
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*/g, '')
        // Clean whitespace
        .replace(/^\n+/, '')
        .trim();

      // Remove numbering for non-Twitter content
      if (!keepNumbering) {
        cleaned = cleaned
          .replace(/^\d+\/\d+\s*(TWITTER|X)?\s*(THREAD)?[\:\-]?\s*/gim, '')
          .replace(/^\d+\/\d+\s+/gm, '');
      }

      return cleaned;
    };

    // Apply cleaning
    const twitter = clean(parts[0], true);  // Keep 1/5, 2/5 for Twitter
    const email = clean(parts[1]);
    const description = clean(parts[2]);
    const announcement = clean(parts[3]);
    const tiktok = clean(parts[4]);
    const instagram = clean(parts[5]);

    // Parse announcement (first line = title)
    const announcementLines = announcement.split('\n').filter(l => l.trim());
    const announcementTitle = announcementLines[0] || "🚀 New Course Available!";
    const announcementBody = announcementLines.slice(1).join('\n').trim() || announcement;

    // Log results
    console.log(`✅ Content parsed - T:${twitter.length} E:${email.length} D:${description.length} A:${announcement.length} TK:${tiktok.length} I:${instagram.length}`);

    // Return with validation
    const validate = (content: string, name: string): string => {
      if (content && content.length > 20) return content;
      return `[${name} - Please regenerate]`;
    };

    return res.status(200).json({
      // Primary fields
      twitterThread: validate(twitter, "Twitter"),
      salesEmail: validate(email, "Email"),
      whopSalesDescription: validate(description, "Description"),
      announcementTitle,
      announcementBody: announcementBody || "Check out our latest course!",
      tiktokScript: validate(tiktok, "TikTok"),
      instagramPost: validate(instagram, "Instagram"),
      // Legacy aliases
      twitter: validate(twitter, "Twitter"),
      email: validate(email, "Email"),
      instagram: validate(instagram, "Instagram"),
      tiktok: validate(tiktok, "TikTok")
    });

  } catch (error: any) {
    console.error('❌ CourseRocket Exception:', error);
    return returnError(`Server error: ${error.message}`);
  }
}