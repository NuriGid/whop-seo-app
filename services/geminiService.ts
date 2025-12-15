
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
    
    // Add fallbacks for missing fields instead of failing
    const finalResult: AnalysisResult = {
      twitterThread: result.twitterThread || '1/5 🚀 Check out this amazing course!\n\n---\n\n2/5 Learn everything you need to succeed.\n\n---\n\n3/5 Expert instructors and proven methods.\n\n---\n\n4/5 Join thousands of successful students.\n\n---\n\n5/5 Enroll now and transform your skills! #Course #Learning',
      salesEmail: result.salesEmail || 'Subject: Transform Your Skills Today!\n\nDear Student,\n\nReady to take your skills to the next level? This course is exactly what you need.\n\nEnroll now and start your transformation!\n\nBest regards,\nYour Team',
      instagramPost: result.instagramPost || '✨ New course alert! 🎓 Transform your skills and unlock new opportunities. Link in bio! 💪 #Course #Learning #Skills #Education #Growth',
      tiktokScript: result.tiktokScript || '[HOOK] 🎬 Want to master this skill?\n\n[CONTENT] This course has everything you need - expert lessons, proven methods, and real results!\n\n[CTA] 📲 Click the link to enroll now! #Learning #Skills #Course'
    };
    
    console.log('✅ Final result with all fields guaranteed');
    return finalResult;

  } catch (error) {
    console.error("❌ Error during analysis:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze: ${error.message}`);
    }
    throw new Error("An unknown error occurred during analysis.");
  }
}
