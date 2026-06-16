import { useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import type { PostVariants } from '../types/post';
import type { CalendarPost } from '../types/calendar';

export const usePosts = () => {
  const [isLoading, setIsLoading] = useState(false);

  const createDraft = useCallback(async (content: string, platforms: string[]) => {
    const { data } = await api.post<{ postId: number }>('/api/posts', { content, platforms });
    return data;
  }, []);

  const generateVariants = useCallback(
    async (topic: string, platforms: string[], tone?: string, keywords?: string) => {
      setIsLoading(true);
      try {
        const { data } = await api.post<{ postId: number; variants: PostVariants }>(
          '/api/posts/generate-variants',
          { topic, platforms, tone, keywords }
        );
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updatePost = useCallback(
    async (
      postId: number,
      content: string,
      selectedKey?: 'A' | 'B' | 'C',
      selectedVariant?: string
    ) => {
      const { data } = await api.put(`/api/posts/${postId}`, {
        content,
        ...(selectedKey && selectedVariant ? { selectedKey, selectedVariant } : {}),
      });
      return data;
    },
    []
  );

  const publishPost = useCallback(async (postId: number, platforms: string[]) => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/api/posts/publish-now', {
        postId,
        platforms,
      });
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitForApproval = useCallback(async (postId: number) => {
    setIsLoading(true);
    try {
      const { data } = await api.post(`/api/posts/${postId}/submit-approval`);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approvePost = useCallback(async (postId: number, platforms: string[]) => {
    setIsLoading(true);
    try {
      const { data } = await api.post(`/api/posts/${postId}/approve`, {
        platforms,
      });
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const schedulePost = useCallback(
    async (postId: number, platforms: string[], scheduledAt: Date) => {
      setIsLoading(true);
      try {
        const { data } = await api.post('/api/posts/schedule', {
          postId,
          platforms,
          scheduledAt: scheduledAt.toISOString(),
        });
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchCalendar = useCallback(async (): Promise<CalendarPost[]> => {
    const { data } = await api.get<CalendarPost[]>('/api/posts/calendar');
    return Array.isArray(data) ? data : [];
  }, []);

  const reschedulePost = useCallback(async (scheduledPostId: number, scheduledAt: Date) => {
    const { data } = await api.patch(`/api/posts/schedule/${scheduledPostId}`, {
      scheduledAt: scheduledAt.toISOString(),
    });
    return data;
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data } = await api.get('/api/posts');
    return data;
  }, []);

  const fetchScheduled = useCallback(async () => {
    const { data } = await api.get('/api/posts/scheduled');
    return data;
  }, []);

  return useMemo(
    () => ({
      createDraft,
      generateVariants,
      updatePost,
      publishPost,
      submitForApproval,
      approvePost,
      schedulePost,
      fetchPosts,
      fetchScheduled,
      fetchCalendar,
      reschedulePost,
      isLoading,
    }),
    [
      createDraft,
      generateVariants,
      updatePost,
      publishPost,
      submitForApproval,
      approvePost,
      schedulePost,
      fetchPosts,
      fetchScheduled,
      fetchCalendar,
      reschedulePost,
      isLoading,
    ]
  );
};
