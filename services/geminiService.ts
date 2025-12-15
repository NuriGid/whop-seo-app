
import { AnalysisResult } from "../types";

// Backend'e istek at - Vercel serverless function kullanıyor
export async function analyzeCourseText(text: string): Promise<AnalysisResult> {
  console.log('🚀 Sending analysis request to backend...');
  
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
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
    console.log('✅ twitterThread:', typeof result.twitterThread, '- exists:', !!result.twitterThread);
    console.log('✅ salesEmail:', typeof result.salesEmail, '- exists:', !!result.salesEmail);
    console.log('✅ instagramPost:', typeof result.instagramPost, '- exists:', !!result.instagramPost);
    console.log('✅ tiktokScript:', typeof result.tiktokScript, '- exists:', !!result.tiktokScript);
    
    // Validation
    if (
      !result.twitterThread ||
      !result.salesEmail ||
      !result.instagramPost ||
      !result.tiktokScript ||
      typeof result.twitterThread !== 'string' ||
      typeof result.salesEmail !== 'string' ||
      typeof result.instagramPost !== 'string' ||
      typeof result.tiktokScript !== 'string'
    ) {
      console.error('❌ VALIDATION FAILED!');
      console.error('Missing or invalid fields:', {
        twitterThread: !result.twitterThread || typeof result.twitterThread !== 'string',
        salesEmail: !result.salesEmail || typeof result.salesEmail !== 'string',
        instagramPost: !result.instagramPost || typeof result.instagramPost !== 'string',
        tiktokScript: !result.tiktokScript || typeof result.tiktokScript !== 'string'
      });
      throw new Error("Invalid response structure from backend");
    }
    
    return result as AnalysisResult;

  } catch (error) {
    console.error("❌ Error during analysis:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze: ${error.message}`);
    }
    throw new Error("An unknown error occurred during analysis.");
  }
}
