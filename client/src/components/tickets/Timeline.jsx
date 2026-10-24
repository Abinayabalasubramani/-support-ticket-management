import EmptyState from '../common/EmptyState';
import StatusBadge from '../common/StatusBadge';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/labels';
import { formatDateTime, formatRelative } from '../../utils/format';

// Vertical activity feed. `entries` come from the API newest first.
export default function Timeline({ entries }) {
  if (entries.length === 0) {
    return <EmptyState title="No activity yet" message="Status changes will appear here." />;
  }

  return (
    <ol className="relative ml-3 border-l-2 border-slate-200">
      {entries.map((entry) => {
        const created = entry.fromStatus === null;
        return (
          <li key={entry.id} className="relative pb-6 pl-6 last:pb-0">
            <span
              className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white"
              style={{ backgroundColor: STATUS_COLORS[entry.toStatus] }}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
              {created ? (
                <>
                  <span className="font-medium">Ticket created as</span>
                  <StatusBadge status={entry.toStatus} />
                </>
              ) : (
                <>
                  <span className="font-medium">Status changed from</span>
                  <StatusBadge status={entry.fromStatus} />
                  <span>to</span>
                  <StatusBadge status={entry.toStatus} />
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500" title={`${STATUS_LABELS[entry.toStatus]}`}>
              {formatDateTime(entry.changedAt)} · {formatRelative(entry.changedAt)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
