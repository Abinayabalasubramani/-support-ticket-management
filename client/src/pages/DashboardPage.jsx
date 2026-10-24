import { useState } from 'react';
import { useGetByPriorityQuery, useGetByStatusQuery, useGetSummaryQuery } from '../api/apiSlice';
import ErrorState from '../components/common/ErrorState';
import DateRangeFilter from '../components/dashboard/DateRangeFilter';
import MetricCard from '../components/dashboard/MetricCard';
import PriorityChart from '../components/dashboard/PriorityChart';
import StatusChart from '../components/dashboard/StatusChart';

export default function DashboardPage() {
  const [range, setRange] = useState({ from: '', to: '' });

  // Blank dates are dropped before the request, so "All time" sends no filter at all.
  // An inverted range is never sent: the server would answer 400.
  const invalid = Boolean(range.from && range.to && range.from > range.to);
  const options = { skip: invalid };

  const summary = useGetSummaryQuery(range, options);
  const byStatus = useGetByStatusQuery(range, options);
  const byPriority = useGetByPriorityQuery(range, options);

  const cards = [
    { label: 'Total tickets', value: summary.data?.total, accent: 'slate', hint: 'All statuses' },
    { label: 'Open tickets', value: summary.data?.open, accent: 'blue', hint: 'Status: Open' },
    { label: 'Resolved tickets', value: summary.data?.resolved, accent: 'green', hint: 'Status: Resolved' },
    { label: 'Critical priority', value: summary.data?.critical, accent: 'red', hint: 'Priority: Critical' },
  ];

  return (
    <div className="space-y-4">
      <DateRangeFilter value={range} onChange={setRange} invalid={invalid} />

      {summary.isError && !summary.data ? (
        <div className="rounded-lg border border-slate-200 bg-white">
          <ErrorState error={summary.error} onRetry={summary.refetch} title="Could not load the summary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <MetricCard key={card.label} {...card} loading={summary.isLoading} dimmed={summary.isFetching} />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <StatusChart query={byStatus} />
        <PriorityChart query={byPriority} />
      </div>
    </div>
  );
}
