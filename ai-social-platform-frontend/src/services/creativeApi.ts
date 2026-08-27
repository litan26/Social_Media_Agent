import { api } from './api';

export interface CreativeImageResult {
  id: number;
  /** Persisted URL from the image store — stable, safe to render directly. */
  url: string;
  /** Inline copy of the same image, used when attaching it to a post. */
  dataUrl: string;
  quote: string;
  tone: string;
  createdAt: string;
}

export async function generateCreativeImage(text: string, tone?: string): Promise<CreativeImageResult> {
  const { data } = await api.post<CreativeImageResult>('/api/creative/generate', { text, tone });
  return data;
}
