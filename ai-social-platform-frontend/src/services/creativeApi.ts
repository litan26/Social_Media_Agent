import { api } from './api';

export interface CreativeImageResult {
  dataUrl: string;
  headline: string;
}

export async function generateCreativeImage(text: string, tone?: string): Promise<CreativeImageResult> {
  const { data } = await api.post<CreativeImageResult>('/api/creative/generate', { text, tone });
  return data;
}
