/**
 * CourseRocket - A/B Variant Generator API
 * 
 * Generates an alternate version of content with a different tone.
 * Endpoint: POST /api/ab-variant
 * Body: { originalContent, contentType, tone }
 * 
 * Returns: { variantContent, tone }
 */

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

const TONE_PROMPTS: Record<string, string> = {
    professional: 'Write in a professional, formal business tone. Be polished and authoritative.',
    casual: 'Write in a casual, friendly, conversational tone. Be approachable and warm.',
    urgent: 'Write with urgency and scarcity. Create FOMO (fear of missing out). Use power words.',
    storytelling: 'Write in a storytelling style. Start with a hook, build narrative, create emotional connection.',
    minimalist: 'Write in a minimalist, direct style. Short sentences. No fluff. Maximum impact.',
    enthusiastic: 'Write with high energy and enthusiasm. Use exclamation marks. Be excited and passionate.'
};

export default async function handler(req: any, res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

    const { originalContent, contentType, tone } = req.body;
    if (!originalContent) return res.status(400).json({ error: 'originalContent required' });

    const selectedTone = tone || 'casual';
    const toneInstruction = TONE_PROMPTS[selectedTone] || TONE_PROMPTS.casual;

    console.log(`🎯 Generating A/B variant: ${contentType} with ${selectedTone} tone`);

    try {
        const systemPrompt = `You are an expert copywriter. Rewrite the following content in a completely different style.

${toneInstruction}

RULES:
- Keep the same core message and information
- Change the tone, word choice, and structure completely
- Do NOT use markdown formatting (no **, no ##, no *)
- Output RAW text only
- Keep approximately the same length`;

        const userMessage = `Rewrite this ${contentType || 'content'} in a ${selectedTone} tone:

${originalContent}`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7, // Higher for more variation
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `AI API Error: ${response.status}` });
        }

        const data = await response.json();
        let variantContent = data.choices?.[0]?.message?.content?.trim() || '';

        // Clean up any markdown that slipped through
        variantContent = variantContent
            .replace(/\*\*/g, '')
            .replace(/^#+\s*/gm, '')
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

        console.log(`✅ Generated variant: ${variantContent.length} chars`);

        return res.status(200).json({
            success: true,
            variantContent,
            tone: selectedTone,
            originalLength: originalContent.length,
            variantLength: variantContent.length
        });

    } catch (error: any) {
        console.error('❌ A/B Variant Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
