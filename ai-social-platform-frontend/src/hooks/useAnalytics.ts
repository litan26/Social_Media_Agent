import { useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import type { PostAnalytics, Insights, AnalyticsDashboard } from '../types/analytics';

export const useAnalytics = () => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalytics = useCallback(async (): Promise<PostAnalytics[]> => {
    const { data } = await api.get<PostAnalytics[]>('/api/analytics');
    return Array.isArray(data) ? data : [];
  }, []);

  const fetchInsights = useCallback(async (): Promise<Insights> => {
    const { data } = await api.get<Insights>('/api/analytics/insights');
    return data;
  }, []);

  const fetchDashboard = useCallback(async (): Promise<AnalyticsDashboard> => {
    const { data } = await api.get<AnalyticsDashboard>('/api/analytics/dashboard');
    return data;
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [analytics, insights, dashboard] = await Promise.all([
        fetchAnalytics(),
        fetchInsights(),
        fetchDashboard(),
      ]);
      return { analytics, insights, dashboard };
    } finally {
      setIsLoading(false);
    }
  }, [fetchAnalytics, fetchInsights, fetchDashboard]);

  const collectAnalytics = useCallback(async (postId: number, platform: string) => {
    const { data } = await api.post(`/api/analytics/collect/${postId}`, { platform });
    return data;
  }, []);

  return useMemo(
    () => ({
      fetchAnalytics,
      fetchInsights,
      fetchDashboard,
      loadAll,
      collectAnalytics,
      isLoading,
    }),
    [fetchAnalytics, fetchInsights, fetchDashboard, loadAll, collectAnalytics, isLoading]
  );
};
