import { create } from 'zustand';
import type { PostAnalytics, Insights, AnalyticsDashboard } from '../types/analytics';

interface AnalyticsStore {
  analytics: PostAnalytics[];
  insights: Insights | null;
  dashboard: AnalyticsDashboard | null;
  setAnalytics: (analytics: PostAnalytics[]) => void;
  setInsights: (insights: Insights) => void;
  setDashboard: (dashboard: AnalyticsDashboard) => void;
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  analytics: [],
  insights: null,
  dashboard: null,
  setAnalytics: (analytics) => set({ analytics }),
  setInsights: (insights) => set({ insights }),
  setDashboard: (dashboard) => set({ dashboard }),
}));
