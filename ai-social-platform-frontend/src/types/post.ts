export interface PostVariants {
  variantA: string;
  variantB: string;
  variantC: string;
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  variants: PostVariants | string;
  status: 'draft' | 'pending_approval' | 'scheduled' | 'published' | 'failed';
  platform_post_ids: Record<string, string>;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledPost {
  id: number;
  post_id: number;
  platform: string;
  scheduled_at: string;
  status: 'pending' | 'published' | 'failed';
  content?: string;
}

export type Platform =
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'facebook'
  | 'tiktok'
  | 'pinterest'
  | 'youtube';
