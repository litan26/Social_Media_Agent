import { useCallback, useEffect } from 'react';
import axios from 'axios';
import { PostAnalytics } from '../../components/Analytics/PostAnalytics';
import { PostingHeatmap } from '../../components/Analytics/PostingHeatmap';
import { CtrTrendChart } from '../../components/Analytics/CtrTrendChart';
import { PlatformBreakdown } from '../../components/Analytics/PlatformBreakdown';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconChart } from '../../components/ui/Icons';
import { useToastStore } from '../../store/toastStore';
import { Link } from 'react-router-dom';

export function AnalyticsPage() {
  const { analytics, insights, dashboard, setAnalytics, setInsights, setDashboard } =
    useAnalyticsStore();
  const { loadAll, isLoading } = useAnalytics();
  const toast = useToastStore((s) => s.show);

  const load = useCallback(async () => {
    try {
      const data = await loadAll();
      setAnalytics(data.analytics);
      setInsights(data.insights);
      setDashboard(data.dashboard);
    } catch (err) {
      if (!axios.isAxiosError(err) || !err.response) {
        toast('Cannot reach the server. Is the backend running on port 3000?', 'error');
      } else if (err.response.status === 401) {
        toast('Please sign in again', 'error');
      } else {
        const msg =
          (err.response.data as { error?: string })?.error || 'Could not load analytics';
        toast(msg, 'error');
      }
    }
  }, [loadAll, setAnalytics, setInsights, setDashboard, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasMetrics = analytics.length > 0;
  const hasCharts =
    (dashboard?.heatmap?.length ?? 0) > 0 ||
    (dashboard?.ctrTrend?.length ?? 0) > 0 ||
    (dashboard?.platformBreakdown?.length ?? 0) > 0;

  return (
    <div className="space-y-10">
      <PageHeader
        badge="Insights"
        title="Analytics"
        subtitle="Performance metrics, charts, and AI-driven recommendations"
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="stat-card skeleton-shimmer h-28 rounded-xl" />
            ))}
          </div>
          <div className="glass-card skeleton-shimmer h-64 rounded-xl" />
        </div>
      ) : !hasMetrics ? (
        <div className="glass-card">
          <EmptyState
            icon={<IconChart className="h-7 w-7" />}
            title="No analytics yet"
            description="Publish posts to collect engagement metrics, charts, and AI recommendations."
            action={
              <Link to="/posts/new" className="btn-primary !text-sm">
                Create post
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {insights && (
            <div className="stagger-children grid gap-4 sm:grid-cols-3">
              <div className="stat-card">
                <p className="text-sm font-medium text-slate-400">Avg Engagement</p>
                <p className="mt-2 font-display text-4xl font-bold text-gradient">
                  {insights.avgEngagementRate}%
                </p>
              </div>
              <div className="stat-card">
                <p className="text-sm font-medium text-slate-400">Top Engagement</p>
                <p className="mt-2 font-display text-4xl font-bold text-emerald-400">
                  {insights.topEngagementRate}%
                </p>
              </div>
              <div className="stat-card">
                <p className="text-sm font-medium text-slate-400">Posts tracked</p>
                <p className="mt-2 font-display text-4xl font-bold text-white">
                  {insights.totalPosts}
                </p>
              </div>
            </div>
          )}

          {hasCharts && dashboard && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass-card">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">
                  Best posting times (CTR heat-map)
                </h2>
                <PostingHeatmap data={dashboard.heatmap || []} />
              </div>
              <div className="glass-card">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">
                  CTR trend (30 days)
                </h2>
                <CtrTrendChart data={dashboard.ctrTrend || []} />
              </div>
              <div className="glass-card lg:col-span-2">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">
                  Top platform breakdown
                </h2>
                <PlatformBreakdown data={dashboard.platformBreakdown || []} />
              </div>
            </div>
          )}

          {insights?.recommendations && insights.recommendations.length > 0 && (
            <div className="glass-card relative overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/5">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
              <h2 className="relative font-display text-lg font-semibold text-violet-200">
                AI Recommendations
              </h2>
              {insights.aiInsights?.best_times && insights.aiInsights.best_times.length > 0 && (
                <div className="relative mt-3 flex flex-wrap gap-2 text-xs">
                  {insights.aiInsights.best_times.map((t) => (
                    <span
                      key={t}
                      className="badge border-violet-500/30 bg-violet-500/10 text-violet-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <ul className="relative mt-4 space-y-3">
                {insights.recommendations.map((r, i) => (
                  <li
                    key={i}
                    className="animate-fade-in-up flex items-start gap-3 text-sm text-slate-300"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <span className="mt-0.5 text-violet-400">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <section className="glass-card">
            <h2 className="mb-6 font-display text-lg font-semibold text-white">Post Metrics</h2>
            <PostAnalytics data={analytics} />
          </section>
        </>
      )}
    </div>
  );
}
