import { Workflow } from 'lucide-react';
import ErrorState from '../common/ErrorState';
import Skeleton from '../common/Skeleton';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/labels';

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

export default function WorkflowBar({ query }) {
  const { data, isLoading, isError, error, refetch, isFetching } = query;
  const total = data ? data.reduce((sum, r) => sum + r.count, 0) : 0;

  return (
    <section>
      <div className="flex items-start gap-3">
        <Workflow className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-fg">Workflow</h2>
          <p className="text-sm text-muted">Ticket distribution by status.</p>
        </div>
      </div>

      {isLoading && <Skeleton className="mt-5 h-24 w-full" />}
      {isError && !data && <ErrorState error={error} onRetry={refetch} title="Could not load workflow" />}

      {data && (
        <div className={`mt-5 transition-opacity ${isFetching ? 'opacity-50' : ''}`}>
          {/* One coloured segment per status, as wide as its share of the tickets. */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Share of tickets by status">
            {total > 0 && data.map((r) => (r.count > 0 ? <span key={r.status} style={{ width: `${(r.count / total) * 100}%`, backgroundColor: STATUS_COLORS[r.status] }} /> : null))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-line">
            {data.map((r) => (
              <div key={r.status} className="sm:px-5 sm:first:pl-0">
                <dt className="flex items-center gap-2 text-sm text-fg">
                  <span className="h-3 w-3 rounded-full ring-2 ring-offset-0" style={{ backgroundColor: STATUS_COLORS[r.status], boxShadow: `0 0 0 2px ${STATUS_COLORS[r.status]}33` }} aria-hidden="true" />
                  {STATUS_LABELS[r.status]}
                </dt>
                <dd className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-fg">{r.count}</span>
                  <span className="text-sm text-muted">{pct(r.count, total)}%</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
