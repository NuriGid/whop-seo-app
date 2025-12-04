
import { AnalysisResult } from "../types";

// Backend'e istek at - Artık Google API'ye direkt gitmiyor
export async function analyzeCourseText(text: string): Promise<AnalysisResult> {
  console.log('🚀 Sending analysis request to backend...');
  
  try {
    const response = await fetch('http://localhost:3001/api/analyze', {
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
    
    // Validation
    if (
      !result.keywords ||
      !result.categories ||
      !Array.isArray(result.keywords) ||
      !Array.isArray(result.categories)
    ) {
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
