import { api } from './api';

export interface Trend {
  tag: string;
  count: number;
  engagement: number;
}

export interface TrendsResponse {
  trends: Trend[];
  source: 'twitter' | 'unavailable' | 'error';
  query?: string;
  total_tweets_scanned?: number;
  total_videos_scanned?: number;
  fetched_at?: string;
  message?: string;
  error?: string;
}

export async function fetchTrends(): Promise<TrendsResponse> {
  const { data } = await api.get<TrendsResponse>('/api/trends');
  return data;
}
