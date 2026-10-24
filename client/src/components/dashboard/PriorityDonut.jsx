import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartPie } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import Skeleton from '../common/Skeleton';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/labels';

// Legend order from the design: most severe first.
const ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function PriorityDonut({ query }) {
  const { data, isLoading, isError, error, refetch, isFetching } = query;
  const rows = data ? ORDER.map((p) => data.find((r) => r.priority === p) ?? { priority: p, count: 0 }) : [];
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <section>
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <ChartPie className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-fg">Priority distribution</h2>
      </div>

      {isLoading && <Skeleton className="mt-5 h-44 w-full" />}
      {isError && !data && <ErrorState error={error} onRetry={refetch} title="Could not load chart" />}
      {data && total === 0 && <EmptyState title="No tickets in this period" message="Try a wider date range." />}

      {data && total > 0 && (
        <div className={`mt-5 grid items-center gap-5 sm:grid-cols-2 transition-opacity ${isFetching ? 'opacity-50' : ''}`}>
          <div className="relative mx-auto h-44 w-44" role="img" aria-label="Donut chart of tickets by priority">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="count" nameKey="priority" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                  {rows.map((r) => (
                    <Cell key={r.priority} fill={PRIORITY_COLORS[r.priority]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} tickets`, PRIORITY_LABELS[name]]}
                  contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--fg)' }}
                  itemStyle={{ color: 'var(--fg)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-fg">{total}</span>
              <span className="text-xs text-muted">tickets</span>
            </div>
          </div>

          <ul className="divide-y divide-line text-sm">
            {rows.map((r) => (
              <li key={r.priority} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2.5 text-fg">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[r.priority] }} aria-hidden="true" />
                  {PRIORITY_LABELS[r.priority]}
                </span>
                <span className="font-medium text-fg">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
