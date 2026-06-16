import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSuggestions, type PostSuggestion } from '../../services/suggestionsApi';

const TYPE_STYLES: Record<string, { label: string; cls: string }> = {
  educational: { label: 'Educational', cls: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  opinion:     { label: 'Opinion',     cls: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  story:       { label: 'Story',       cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  question:    { label: 'Question',    cls: 'bg-pink-500/10 text-pink-300 border-pink-500/20' },
  list:        { label: 'List',        cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  tip:         { label: 'Tip',         cls: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
};

function SuggestionCard({ s, onUse }: { s: PostSuggestion; onUse: (topic: string, tone: string) => void }) {
  const style = TYPE_STYLES[s.type] || TYPE_STYLES.educational;
  return (
    <div className="group flex flex-col justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-violet-500/20 hover:bg-white/[0.04]">
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-white leading-snug">{s.title}</p>
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.cls}`}>
            {style.label}
          </span>
        </div>
        <p className="text-xs italic text-slate-400 leading-relaxed">"{s.hook}"</p>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">{s.topic}</p>
      </div>
      <button
        type="button"
        onClick={() => onUse(s.topic, s.tone || 'professional')}
        className="w-full rounded-lg border border-violet-500/30 bg-violet-500/10 py-1.5 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/20"
      >
        Use this idea →
      </button>
    </div>
  );
}

export function AISuggestionsWidget() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<PostSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await fetchSuggestions(force);
      setSuggestions(res.suggestions || []);
      setGeneratedAt(res.generated_at || '');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string }; status?: number } }).response?.data?.error ||
            `Server error ${(err as { response?: { status?: number } }).response?.status}`
          : err instanceof Error
          ? err.message
          : 'Could not load AI suggestions';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const timeAgo = generatedAt
    ? (() => {
        const mins = Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.round(mins / 60)}h ago`;
      })()
    : '';

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-violet-400">✦</span> Claude Post Ideas
          </h2>
          {generatedAt && (
            <p className="mt-0.5 text-xs text-slate-500">
              Generated {timeAgo} · cached 1 hour
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-violet-500/30 hover:text-violet-300 disabled:opacity-40"
        >
          {refreshing ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" />
              Generating…
            </>
          ) : (
            <>↻ Refresh</>
          )}
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="skeleton-shimmer h-40 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="glass-card p-6 text-center text-sm text-slate-500">
          No suggestions yet. Click Refresh to generate ideas with Claude.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((s, i) => (
            <SuggestionCard
              key={i}
              s={s}
              onUse={(topic, tone) => navigate(`/posts/new?topic=${encodeURIComponent(topic)}&tone=${encodeURIComponent(tone)}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
