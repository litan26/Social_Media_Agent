import axios from 'axios';
import { api } from './api';

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });
}

export async function uploadPostMedia(postId: number, file: File): Promise<string> {
  const { data } = await api.post<PresignResponse>(`/api/posts/${postId}/media/presign`, {
    filename: file.name,
    contentType: file.type,
  });
  await uploadToPresignedUrl(data.uploadUrl, file);
  await api.patch(`/api/posts/${postId}`, { mediaUrl: data.publicUrl });
  return data.publicUrl;
}

// For already-generated media (e.g. a creative image data URL) — persists directly, no file upload needed
export async function attachMediaUrl(postId: number, mediaUrl: string): Promise<void> {
  await api.patch(`/api/posts/${postId}`, { mediaUrl });
}

export async function uploadBrandLogo(file: File): Promise<string> {
  const { data } = await api.post<PresignResponse>('/api/auth/logo/presign', {
    filename: file.name,
    contentType: file.type,
  });
  await uploadToPresignedUrl(data.uploadUrl, file);
  await api.put('/api/auth/profile', { logo_url: data.publicUrl });
  return data.publicUrl;
}
