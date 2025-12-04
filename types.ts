
export interface AnalysisResult {
  keywords: string[];
  categories: string[];
}

export interface WhopProduct {
  id: string;
  name: string;
  description?: string;
  visibility?: string;
  created_at?: number;
}
