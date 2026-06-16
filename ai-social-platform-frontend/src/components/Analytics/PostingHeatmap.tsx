import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface HeatmapPoint {
  hour: number;
  avg_ctr: number;
}

interface PostingHeatmapProps {
  data: HeatmapPoint[];
}

export function PostingHeatmap({ data }: PostingHeatmapProps) {
  const chartData = Array.from({ length: 24 }, (_, hour) => {
    const row = data.find((d) => Number(d.hour) === hour);
    return {
      hour: `${hour}:00`,
      ctr: row ? Number((Number(row.avg_ctr) * 100).toFixed(2)) : 0,
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={3} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
          <Tooltip
            contentStyle={{
              background: '#0f0f14',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
            }}
            formatter={(v) => [`${Number(v ?? 0)}%`, 'Avg CTR']}
          />
          <Bar dataKey="ctr" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
