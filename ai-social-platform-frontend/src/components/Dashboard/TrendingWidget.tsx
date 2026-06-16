import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrends, type Trend } from '../../services/trendsApi';

function TrendBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1 w-full rounded-full bg-white/5">
      <div
        className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function TrendingWidget() {
  const navigate = useNavigate();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [scanned, setScanned] = useState<number>(0);
  const [fetchedAt, setFetchedAt] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrends()
      .then((res) => {
        setTrends(res.trends);
        setSource(res.source);
        setScanned(res.total_tweets_scanned || 0);
        setFetchedAt(res.fetched_at || '');
        if (res.source === 'error') setError(res.error || 'Failed to load trends');
      })
      .catch(() => setError('Could not load trending topics'))
      .finally(() => setLoading(false));
  }, []);

  const maxEngagement = trends.length > 0 ? Math.max(...trends.map((t) => t.engagement)) : 1;

  const handleCreate = (tag: string) => {
    navigate(`/posts/new?topic=${encodeURIComponent(tag)}`);
  };

  const timeAgo = fetchedAt
    ? (() => {
        const diff = Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60000);
        return diff < 1 ? 'just now' : `${diff}m ago`;
      })()
    : '';

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Trending Topics</h2>
          {source === 'twitter' && scanned > 0 && (
            <p className="mt-0.5 text-xs text-slate-500">
              From {scanned} recent tweets · refreshed {timeAgo}
            </p>
          )}
        </div>
        {source === 'twitter' && (
          <span className="badge border-sky-500/30 bg-sky-500/10 text-sky-300">Live · Twitter</span>
        )}
        {source === 'claude' && (
          <span className="badge border-violet-500/30 bg-violet-500/10 text-violet-300">AI · Claude</span>
        )}
      </div>

      <div className="glass-card p-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-shimmer h-10 rounded-lg" />
            ))}
          </div>
        ) : error || source === 'unavailable' ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
            {source === 'unavailable'
              ? 'Add TWITTER_BEARER_TOKEN to .env to enable live trending topics.'
              : error}
          </div>
        ) : trends.length === 0 ? (
          <p className="text-sm text-slate-500">No trending topics found right now.</p>
        ) : (
          <div className="space-y-2">
            {trends.map((trend, idx) => (
              <div
                key={trend.tag}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
              >
                <span className="w-5 text-center text-xs font-semibold text-slate-600">
                  {idx + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-violet-300">
                      {trend.tag}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {trend.count} tweet{trend.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <TrendBar value={trend.engagement} max={maxEngagement} />
                </div>

                <button
                  type="button"
                  onClick={() => handleCreate(trend.tag)}
                  className="shrink-0 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300 opacity-0 transition-all hover:bg-violet-500/20 group-hover:opacity-100"
                >
                  Create post
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
