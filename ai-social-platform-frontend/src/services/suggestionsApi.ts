import { api } from './api';

export interface PostSuggestion {
  title: string;
  topic: string;
  type: 'educational' | 'opinion' | 'story' | 'question' | 'list' | 'tip';
  tone: 'professional' | 'casual' | 'bold';
  hook: string;
}

export interface SuggestionsResponse {
  suggestions: PostSuggestion[];
  industry: string;
  platforms: string[];
  generated_at: string;
}

export async function fetchSuggestions(forceRefresh = false): Promise<SuggestionsResponse> {
  const { data } = await api.get<SuggestionsResponse>('/api/suggestions', {
    params: forceRefresh ? { refresh: '1' } : {},
  });
  return data;
}
