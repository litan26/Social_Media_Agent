import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PlatformRow {
  platform: string;
  reach: number;
  likes: number;
  clicks: number;
}

interface PlatformBreakdownProps {
  data: PlatformRow[];
}

export function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  const chartData = data.map((d) => ({
    platform: d.platform,
    reach: Number(d.reach) || 0,
    likes: Number(d.likes) || 0,
    clicks: Number(d.clicks) || 0,
  }));

  if (chartData.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No platform data yet</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="platform" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: '#0f0f14',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
            }}
          />
          <Legend />
          <Bar dataKey="reach" fill="#8b5cf6" name="Reach" radius={[4, 4, 0, 0]} />
          <Bar dataKey="likes" fill="#f472b6" name="Likes" radius={[4, 4, 0, 0]} />
          <Bar dataKey="clicks" fill="#34d399" name="Clicks" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
