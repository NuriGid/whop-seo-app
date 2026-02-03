
export interface AnalysisResult {
  twitterThread: string;
  salesEmail: string;
  instagramPost: string;
  tiktokScript: string;
  // Whop-specific content
  whopSalesDescription: string;
  whopAnnouncement: {
    title: string;
    body: string;
  };
  // Phase 2B: Upsell/Cross-sell
  upsellText?: string;
  crossSellText?: string;
}

export interface WhopProduct {
  id: string;
  name: string;
  title?: string;
  description?: string;
  visibility?: string;
  created_at?: number;
}

export interface WhopPlan {
  id: string;
  title?: string;
  internal_notes?: string;
  initial_price?: number;
  renewal_price?: number;
  billing_period?: number;
  visibility?: string;
  currency?: string;
}

export interface WhopPayment {
  id: string;
  total?: number;
  subtotal?: number;
  currency?: string;
  status?: string;
  created_at?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    username?: string;
  };
  product?: {
    title?: string;
  };
  plan?: {
    id?: string;
  };
}

export interface WhopFee {
  name: string;
  amount: number;
  currency: string;
  type: string;
}
