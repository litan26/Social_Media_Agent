import { useCallback, useEffect, useState } from 'react';
import { fetchSuggestions, type PostSuggestion } from '../../services/suggestionsApi';

const TYPE_STYLES: Record<string, { label: string; dot: string }> = {
  educational: { label: 'Educational', dot: 'bg-blue-400' },
  opinion:     { label: 'Opinion',     dot: 'bg-violet-400' },
  story:       { label: 'Story',       dot: 'bg-amber-400' },
  question:    { label: 'Question',    dot: 'bg-pink-400' },
  list:        { label: 'List',        dot: 'bg-emerald-400' },
  tip:         { label: 'Tip',         dot: 'bg-cyan-400' },
};

interface Props {
  onSelect: (topic: string, tone: string) => void;
}

export function IndustrySuggestionsPanel({ onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<PostSuggestion[]>([]);
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(async (force = false) => {
    force ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await fetchSuggestions(force);
      setSuggestions(res.suggestions || []);
      setIndustry(res.industry || '');
    } catch {
      setError('Could not load ideas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUse = (s: PostSuggestion, idx: number) => {
    setSelected(idx);
    onSelect(s.topic, s.tone || 'professional');
  };

  return (
    <aside className="glass-card space-y-3 !p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">💡</span>
          <div>
            <h3 className="text-sm font-semibold text-white">Industry Ideas</h3>
            {industry && (
              <p className="text-[11px] text-slate-500 capitalize">{industry}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setSelected(null); load(true); }}
          disabled={refreshing || loading}
          title="Refresh ideas"
          className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-slate-500 transition-colors hover:border-violet-500/30 hover:text-violet-400 disabled:opacity-40"
        >
          <span className={refreshing ? 'inline-block animate-spin' : ''}>↻</span>
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
          ))
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
            {error}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] p-4 text-center text-xs text-slate-500">
            No ideas yet. Click ↻ to generate.
          </div>
        ) : (
          suggestions.map((s, idx) => {
            const style = TYPE_STYLES[s.type] || TYPE_STYLES.educational;
            const isActive = selected === idx;
            return (
              <div
                key={idx}
                className={`group rounded-xl border p-3 transition-all ${
                  isActive
                    ? 'border-violet-500/40 bg-violet-500/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                {/* Type badge row */}
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {style.label}
                  </span>
                  {isActive && (
                    <span className="ml-auto text-[10px] font-semibold text-violet-400">✓ In panel</span>
                  )}
                </div>

                {/* Title */}
                <p className="mb-1 text-xs font-semibold leading-snug text-white">{s.title}</p>

                {/* Hook */}
                <p className="mb-2.5 line-clamp-2 text-[11px] italic leading-relaxed text-slate-400">
                  "{s.hook}"
                </p>

                {/* Action */}
                <button
                  type="button"
                  onClick={() => handleUse(s, idx)}
                  className={`w-full rounded-lg py-1 text-[11px] font-semibold transition-all ${
                    isActive
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'border border-white/[0.06] bg-transparent text-slate-500 hover:border-violet-500/30 hover:text-violet-300 group-hover:text-slate-400'
                  }`}
                >
                  {isActive ? '✓ Using this idea' : 'Use this idea →'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {suggestions.length > 0 && !loading && (
        <p className="text-center text-[10px] text-slate-600">
          Personalised for your industry · updates hourly
        </p>
      )}
    </aside>
  );
}
