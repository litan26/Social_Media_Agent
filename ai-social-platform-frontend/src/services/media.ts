import { api } from './api';

export const MediaService = {
  async uploadToPost(postId: number, file: File): Promise<string[]> {
    const { data: presign } = await api.post<{
      uploadUrl: string;
      publicUrl: string;
    }>(`/api/posts/${postId}/media/presign`, {
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    });

    const putRes = await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });

    if (!putRes.ok) {
      throw new Error('Direct upload to storage failed');
    }

    const { data: patch } = await api.patch<{ mediaUrls: string[] }>(
      `/api/posts/${postId}`,
      { mediaUrl: presign.publicUrl }
    );
    return patch.mediaUrls;
  },
};
