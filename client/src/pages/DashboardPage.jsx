import { useState } from 'react';
import {
  useGetByPriorityQuery,
  useGetByStatusQuery,
  useGetSummaryQuery,
  useGetTicketsQuery,
  useGetVolumeQuery,
} from '../api/apiSlice';
import NeedsAttention from '../components/dashboard/NeedsAttention';
import PriorityDonut from '../components/dashboard/PriorityDonut';
import RangeSelector from '../components/dashboard/RangeSelector';
import StatStrip from '../components/dashboard/StatStrip';
import VolumeChart from '../components/dashboard/VolumeChart';
import WorkflowBar from '../components/dashboard/WorkflowBar';
import { RANGE_PHRASE, rangeFor } from '../utils/dateRange';

// Same query every time, so RTK Query serves it from cache and shares it between visits.
const ATTENTION_QUERY = { priority: ['CRITICAL', 'HIGH'], status: ['OPEN', 'IN_PROGRESS'], sortBy: 'priority', order: 'desc', page: 1, limit: 3 };

export default function DashboardPage() {
  const [rangeKey, setRangeKey] = useState('30d');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const range = rangeFor(rangeKey, custom);
  // An inverted range is never sent: the server would answer 400.
  const invalid = Boolean(range.from && range.to && range.from > range.to);
  const options = { skip: invalid };

  const summary = useGetSummaryQuery(range, options);
  const byStatus = useGetByStatusQuery(range, options);
  const byPriority = useGetByPriorityQuery(range, options);
  const volume = useGetVolumeQuery(range, options);
  const attention = useGetTicketsQuery(ATTENTION_QUERY);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Dashboard</h1>
          <p className="mt-1 text-muted">Support operations at a glance.</p>
        </div>
        <RangeSelector rangeKey={rangeKey} onRangeKey={setRangeKey} custom={custom} onCustom={setCustom} invalid={invalid} />
      </div>

      <StatStrip summary={summary} volume={volume} />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="card min-w-0 space-y-6 p-4 sm:p-6 xl:col-span-3">
          <VolumeChart query={volume} phrase={RANGE_PHRASE[rangeKey]} />
          <div className="border-t border-line pt-6">
            <WorkflowBar query={byStatus} />
          </div>
        </div>

        <div className="card min-w-0 space-y-6 p-4 sm:p-6 xl:col-span-2">
          <PriorityDonut query={byPriority} />
          <NeedsAttention query={attention} />
        </div>
      </div>
    </div>
  );
}
