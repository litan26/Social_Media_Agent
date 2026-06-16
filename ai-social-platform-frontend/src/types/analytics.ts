export interface PostAnalytics {
  id: number;
  post_id: number;
  platform: string;
  impressions: number;
  likes: number;
  shares: number;
  comments: number;
  clicks?: number;
  ctr?: number;
  engagement_rate: number;
  content?: string;
  published_at?: string;
}

export interface AiInsights {
  best_times?: string[];
  top_tones?: string[];
  recommended_topics?: string[];
}

export interface Insights {
  topEngagementRate: number;
  avgEngagementRate: number;
  totalPosts: number;
  recommendations: string[];
  aiInsights?: AiInsights;
}

export interface AnalyticsDashboard {
  heatmap: { hour: number; avg_ctr: number }[];
  ctrTrend: { day: string; avg_ctr: number }[];
  platformBreakdown: {
    platform: string;
    reach: number;
    likes: number;
    shares: number;
    clicks: number;
    avg_ctr: number;
  }[];
  summary: {
    total_posts?: number;
    avg_engagement?: number;
    top_engagement?: number;
    total_reach?: number;
    total_clicks?: number;
  };
}
