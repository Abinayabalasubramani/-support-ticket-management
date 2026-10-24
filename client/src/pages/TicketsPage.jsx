import { useDispatch, useSelector } from 'react-redux';
import { useGetTicketsQuery } from '../api/apiSlice';
import { selectFilters, setLimit, setPage } from '../features/filters/filtersSlice';
import Spinner from '../components/common/Spinner';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import Pagination from '../components/common/Pagination';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';

// Phase 5 placeholder: proves list + pagination + badges work end to end.
// Phase 6a replaces it with the real table, search and filter bar.
export default function TicketsPage() {
  const dispatch = useDispatch();
  const filters = useSelector(selectFilters);
  const { data, isLoading, isFetching, isError, error, refetch } = useGetTicketsQuery(filters);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {isLoading && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data && data.data.length === 0 && <EmptyState title="No tickets" message="Nothing matches yet." />}
      {data && data.data.length > 0 && (
        <>
          <ul className={`divide-y divide-slate-100 ${isFetching ? 'opacity-60' : ''}`}>
            {data.data.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-10 text-xs text-slate-400">#{t.id}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
          <Pagination
            {...data.meta}
            disabled={isFetching}
            onPageChange={(p) => dispatch(setPage(p))}
            onLimitChange={(n) => dispatch(setLimit(n))}
          />
        </>
      )}
    </div>
  );
}
