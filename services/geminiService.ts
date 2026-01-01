
import { AnalysisResult } from "../types";

// Backend request - uses Whop's automatic cookie/header injection
export async function analyzeCourseText(text: string): Promise<AnalysisResult> {
  console.log('🚀 Sending analysis request to backend...');

  try {
    // Whop automatically injects auth cookies/headers for iframe requests
    const response = await fetch('/api/analyze', {
      method: 'POST',
      credentials: 'include', // Include cookies for Whop auth
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: text
      })
    });

    console.log('✅ Backend response received, status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend Error:', errorData);
      throw new Error(errorData.error || 'Backend analysis failed');
    }

    const result = await response.json();
    console.log('🎉 Analysis complete:', result);
    console.log('📋 Response type:', typeof result);
    console.log('🔑 Response keys:', Object.keys(result));

    // Validate all required fields exist - NO FALLBACKS
    const twitterThread = result.twitterThread || result.twitter;
    const salesEmail = result.salesEmail || result.email;
    const instagramPost = result.instagramPost || result.instagram;
    const tiktokScript = result.tiktokScript || result.tiktok;

    if (!twitterThread || !salesEmail || !instagramPost || !tiktokScript) {
      console.error('❌ Incomplete API response:', {
        twitterThread: !!twitterThread,
        salesEmail: !!salesEmail,
        instagramPost: !!instagramPost,
        tiktokScript: !!tiktokScript
      });
      throw new Error('Analysis returned incomplete results. Please try again.');
    }

    const finalResult: AnalysisResult = {
      twitterThread,
      salesEmail,
      instagramPost,
      tiktokScript,
    };

    console.log('✅ Analysis result validated');
    return finalResult;

  } catch (error) {
    console.error("❌ Error during analysis:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze: ${error.message}`);
    }
    throw new Error("An unknown error occurred during analysis.");
  }
}
