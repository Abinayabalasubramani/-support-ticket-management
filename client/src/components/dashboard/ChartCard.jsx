import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import Skeleton from '../common/Skeleton';

// Shared frame for a chart: title, then loading / error / empty / content.
export default function ChartCard({ title, query, rows, children }) {
  const { isLoading, isError, error, refetch, isFetching } = query;
  const isEmpty = rows && rows.every((r) => r.count === 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {isError && !rows && <ErrorState error={error} onRetry={refetch} title="Could not load chart" />}
      {rows && isEmpty && <EmptyState title="No tickets in this range" message="Try a wider date range." />}
      {rows && !isEmpty && <div className={`transition-opacity ${isFetching ? 'opacity-50' : ''}`}>{children}</div>}
    </section>
  );
}
