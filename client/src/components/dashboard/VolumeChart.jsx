import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartLine } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import Skeleton from '../common/Skeleton';

const dayLabel = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
// "2026-10-24" -> "24 Oct" (read as UTC so the label never shifts a day)
const formatTick = (iso) => dayLabel.format(new Date(`${iso}T00:00:00Z`));

const axisTick = { fill: 'var(--faint)', fontSize: 12 };

export default function VolumeChart({ query, phrase }) {
  const { data, isLoading, isError, error, refetch, isFetching } = query;
  const hasData = data && data.some((d) => d.count > 0);

  return (
    <section>
      <div className="flex items-start gap-3">
        <ChartLine className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-fg">Ticket volume</h2>
          <p className="text-sm text-muted">New tickets {phrase}.</p>
        </div>
      </div>

      <div className={`mt-4 h-72 transition-opacity ${isFetching && data ? 'opacity-50' : ''}`}>
        {isLoading && <Skeleton className="h-full w-full" />}
        {isError && !data && <ErrorState error={error} onRetry={refetch} title="Could not load chart" />}
        {data && !hasData && <EmptyState title="No tickets in this period" message="Try a wider date range." />}
        {hasData && (
          <div role="img" aria-label="Area chart of new tickets per day" className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="volume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3d7bff" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#3d7bff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="var(--line)" />
                <XAxis dataKey="date" tickFormatter={formatTick} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval="preserveStartEnd" minTickGap={48} />
                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip
                  labelFormatter={formatTick}
                  formatter={(value) => [`${value} ticket${value === 1 ? '' : 's'}`, '']}
                  separator=""
                  contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--fg)' }}
                  labelStyle={{ color: 'var(--muted)' }}
                  itemStyle={{ color: 'var(--fg)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#5b8cff" strokeWidth={2.5} fill="url(#volume)" activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
