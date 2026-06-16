import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TrendPoint {
  day: string;
  avg_ctr: number;
}

interface CtrTrendChartProps {
  data: TrendPoint[];
}

export function CtrTrendChart({ data }: CtrTrendChartProps) {
  const chartData = data.map((d) => ({
    day: new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    ctr: Number(Number(d.avg_ctr).toFixed(2)),
  }));

  if (chartData.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No CTR trend data yet</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
          <Tooltip
            contentStyle={{
              background: '#0f0f14',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
            }}
            formatter={(v) => [`${Number(v ?? 0)}%`, 'CTR']}
          />
          <Line type="monotone" dataKey="ctr" stroke="#34d399" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
