import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/labels';
import ChartCard from './ChartCard';

export default function PriorityChart({ query }) {
  const rows = query.data;
  const data = (rows ?? []).map((r) => ({ ...r, name: PRIORITY_LABELS[r.priority] }));

  return (
    <ChartCard title="Tickets by priority" query={query} rows={rows}>
      <div className="h-56" role="img" aria-label="Bar chart of tickets by priority">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((r) => (
                <Cell key={r.priority} fill={PRIORITY_COLORS[r.priority]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
