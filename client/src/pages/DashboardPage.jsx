import { useGetSummaryQuery } from '../api/apiSlice';
import Spinner from '../components/common/Spinner';
import ErrorState from '../components/common/ErrorState';

// Phase 5 placeholder: proves the API connection. Phase 6d replaces it with cards and charts.
export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useGetSummaryQuery({});

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold">Dashboard</h2>
      <p className="mb-4 text-sm text-slate-500">Placeholder. Cards and charts arrive in Phase 6.</p>
      {isLoading && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data && (
        <pre className="rounded bg-slate-50 p-3 text-sm">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}
