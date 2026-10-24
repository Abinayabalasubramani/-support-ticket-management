import { Link } from 'react-router-dom';
import { ChevronRight, Zap } from 'lucide-react';
import ErrorState from '../common/ErrorState';
import Skeleton from '../common/Skeleton';
import { PRIORITY_COLORS } from '../../utils/labels';
import { formatDate } from '../../utils/format';

// The most urgent tickets that still need work: critical/high priority, open or in progress.
export default function NeedsAttention({ query }) {
  const { data, isLoading, isError, error, refetch } = query;
  const tickets = data?.data ?? [];

  return (
    <section>
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-fg">Needs attention</h2>
      </div>

      {isLoading && (
        <div className="mt-4 space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {isError && !data && <ErrorState error={error} onRetry={refetch} title="Could not load tickets" />}
      {data && tickets.length === 0 && <p className="py-8 text-center text-sm text-muted">No critical or high priority tickets are waiting.</p>}

      {tickets.length > 0 && (
        <ul className="divide-y divide-line">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link to={`/tickets/${t.id}`} className="group flex items-center gap-4 py-4">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[t.priority] }} aria-label={`${t.priority.toLowerCase()} priority`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg group-hover:text-primary">{t.title}</span>
                  <span className="block truncate text-xs text-muted">
                    #{t.id} · {t.assignee ? t.assignee.name : 'Unassigned'} · {formatDate(t.createdAt)}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted group-hover:text-fg" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
