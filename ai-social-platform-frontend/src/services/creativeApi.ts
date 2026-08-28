import { api } from './api';

export interface CreativeImageResult {
  id: number;
  url: string;
  dataUrl?: string;
  quote: string;
  prompt?: string;
  tone: string;
  createdAt: string;
  width?: number;
  height?: number;
  bytes?: number;
}

export interface ImageHistoryResponse {
  total: number;
  limit: number;
  offset: number;
  images: CreativeImageResult[];
}

export async function generateCreativeImage(prompt: string, tone?: string): Promise<CreativeImageResult> {
  const { data } = await api.post<CreativeImageResult>('/api/creative/generate', { prompt, text: prompt, tone });
  return data;
}

export async function fetchImageHistory(limit = 50, offset = 0): Promise<ImageHistoryResponse> {
  const { data } = await api.get<ImageHistoryResponse>('/api/creative/history', {
    params: { limit, offset },
  });
  return data;
}

export async function deleteImageFromHistory(id: number): Promise<void> {
  await api.delete(`/api/creative/history/${id}`);
}
