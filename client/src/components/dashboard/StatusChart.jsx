import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/labels';
import ChartCard from './ChartCard';

export default function StatusChart({ query }) {
  const rows = query.data;
  const data = (rows ?? []).map((r) => ({ ...r, name: STATUS_LABELS[r.status] }));
  const total = data.reduce((sum, r) => sum + r.count, 0);

  return (
    <ChartCard title="Tickets by status" query={query} rows={rows}>
      <div className="grid items-center gap-4 sm:grid-cols-2">
        <div className="relative h-56" role="img" aria-label="Donut chart of tickets by status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2} stroke="none">
                {data.map((r) => (
                  <Cell key={r.status} fill={STATUS_COLORS[r.status]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-slate-900">{total}</span>
            <span className="text-xs text-slate-500">tickets</span>
          </div>
        </div>

        {/* The same numbers as text, so the chart is readable without colour or a mouse. */}
        <ul className="space-y-2 text-sm">
          {data.map((r) => (
            <li key={r.status} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS[r.status] }} />
                {r.name}
              </span>
              <span className="font-medium text-slate-900">{r.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
