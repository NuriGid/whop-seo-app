
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
    console.log('🎉 Analysis complete');
    console.log('🔑 Response keys:', Object.keys(result));

    // Use any available fields - both old and new key names
    const finalResult: AnalysisResult = {
      twitterThread: result.twitterThread || result.twitter || 'Content generation in progress...',
      salesEmail: result.salesEmail || result.email || 'Content generation in progress...',
      instagramPost: result.instagramPost || result.instagram || 'Content generation in progress...',
      tiktokScript: result.tiktokScript || result.tiktok || 'Content generation in progress...',
    };

    console.log('✅ Analysis result ready');
    return finalResult;

  } catch (error) {
    console.error("❌ Error during analysis:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze: ${error.message}`);
    }
    throw new Error("An unknown error occurred during analysis.");
  }
}
