import type { PostAnalytics as AnalyticsType } from '../../types/analytics';

interface PostAnalyticsProps {
  data: AnalyticsType[];
}

export function PostAnalytics({ data }: PostAnalyticsProps) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        <span className="text-4xl opacity-30">◉</span>
        <p className="mt-4 text-slate-500">No analytics yet. Publish posts to collect metrics.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.03] text-left text-slate-400">
            <th className="px-4 py-3 font-medium">Platform</th>
            <th className="px-4 py-3 font-medium">Impressions</th>
            <th className="px-4 py-3 font-medium">Likes</th>
            <th className="px-4 py-3 font-medium">Shares</th>
            <th className="px-4 py-3 font-medium">Comments</th>
            <th className="px-4 py-3 font-medium">Engagement</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id}
              className="animate-fade-in border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <td className="px-4 py-3 capitalize font-medium text-violet-300">{row.platform}</td>
              <td className="px-4 py-3 text-slate-300">
                {Number(row.impressions || 0).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {Number(row.likes || 0).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {Number(row.shares || 0).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {Number(row.comments || 0).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-lg bg-violet-500/15 px-2 py-0.5 font-semibold text-violet-300">
                  {Number(row.engagement_rate || 0).toFixed(2)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
