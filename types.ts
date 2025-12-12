
export interface AnalysisResult {
  twitterThread: string;
  salesEmail: string;
  instagramPost: string;
  tiktokScript: string;
}

export interface WhopProduct {
  id: string;
  name: string;
  title?: string;
  description?: string;
  visibility?: string;
  created_at?: number;
}
