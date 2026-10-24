import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Check, CircleAlert, CircleDot, Ticket } from 'lucide-react';
import ErrorState from '../common/ErrorState';
import Skeleton from '../common/Skeleton';

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

// A sparkline only shows the overall shape, so sum the days into about 12 buckets.
// Plotting every day gives a jagged comb when most days have 0 or 1 tickets.
function compress(days, buckets = 12) {
  const size = Math.max(1, Math.ceil(days.length / buckets));
  const out = [];
  for (let i = 0; i < days.length; i += size) {
    out.push({ count: days.slice(i, i + size).reduce((sum, d) => sum + d.count, 0) });
  }
  return out;
}

function Sparkline({ data }) {
  const points = data ? compress(data) : [];
  if (points.length < 2) return null;
  return (
    <div className="hidden h-12 w-20 shrink-0 2xl:block" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d7bff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#3d7bff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="count" stroke="#5b8cff" strokeWidth={2} fill="url(#spark)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Cell({ icon: Icon, tone, label, value, hint, loading, dimmed, children }) {
  return (
    <div className="flex min-w-0 items-center gap-4 p-4 sm:p-5 xl:p-6">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-9 w-16" />
        ) : (
          <p className={`mt-0.5 text-4xl font-semibold leading-tight text-fg transition-opacity ${dimmed ? 'opacity-50' : ''}`}>{value ?? '—'}</p>
        )}
        <p className="mt-0.5 whitespace-nowrap text-sm text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

export default function StatStrip({ summary, volume }) {
  const data = summary.data;

  if (summary.isError && !data) {
    return (
      <div className="card">
        <ErrorState error={summary.error} onRetry={summary.refetch} title="Could not load the summary" />
      </div>
    );
  }

  const common = { loading: summary.isLoading, dimmed: summary.isFetching };

  return (
    <div className="card grid min-w-0 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
      <Cell icon={Ticket} tone="bg-blue-500/15 text-blue-400" label="Total tickets" value={data?.total} hint="in selected period" {...common}>
        <Sparkline data={volume.data} />
      </Cell>
      <Cell icon={CircleDot} tone="bg-blue-500/15 text-blue-400" label="Open" value={data?.open} hint={`${pct(data?.open, data?.total)}% of total`} {...common} />
      <Cell icon={Check} tone="bg-emerald-500/15 text-emerald-400" label="Resolved" value={data?.resolved} hint={`${pct(data?.resolved, data?.total)}% of total`} {...common} />
      <Cell icon={CircleAlert} tone="bg-red-500/15 text-red-400" label="Critical" value={data?.critical} hint={`${data?.criticalUnresolved ?? 0} still unresolved`} {...common} />
    </div>
  );
}
