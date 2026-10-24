import { Pencil, User } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import StatusBadge from '../common/StatusBadge';
import { PRIORITY_LABELS, STATUS_COLORS } from '../../utils/labels';
import { formatDateTime, formatRelative } from '../../utils/format';

const name = (person) => <strong className="font-semibold text-fg">{person.name}</strong>;
const quoted = (text) => <span className="font-medium text-fg">“{text}”</span>;

// What an edit changed, one line per field.
function describeChange(change) {
  switch (change.field) {
    case 'title':
      return <>Title changed from {quoted(change.from)} to {quoted(change.to)}</>;
    case 'priority':
      return <>Priority changed from <strong className="text-fg">{PRIORITY_LABELS[change.from] ?? change.from}</strong> to <strong className="text-fg">{PRIORITY_LABELS[change.to] ?? change.to}</strong></>;
    case 'category':
      return <>Category changed from <strong className="text-fg">{change.from}</strong> to <strong className="text-fg">{change.to}</strong></>;
    case 'description':
      return <>Description was edited</>;
    default:
      return <>{change.field} was edited</>;
  }
}

function assigneeText({ from, to }) {
  if (!from && to) return <>Assigned to {name(to)}</>;
  if (from && !to) return <>Unassigned (was {name(from)})</>;
  return <>Reassigned from {name(from)} to {name(to)}</>;
}

// The marker on the line: a coloured dot for status changes, a small icon for the rest.
function Marker({ entry }) {
  if (entry.kind === 'status') {
    return (
      <span
        className="absolute -left-[9px] top-1 h-4 w-4 rounded-full ring-4 ring-[var(--surface-solid)]"
        style={{ backgroundColor: STATUS_COLORS[entry.toStatus] }}
        aria-hidden="true"
      />
    );
  }
  const Icon = entry.kind === 'assignee' ? User : Pencil;
  return (
    <span className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-primary ring-4 ring-[var(--surface-solid)]" aria-hidden="true">
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function Body({ entry }) {
  if (entry.kind === 'status') {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg">
        {entry.fromStatus === null ? (
          <>
            <span className="font-medium">Ticket created as</span>
            <StatusBadge status={entry.toStatus} />
          </>
        ) : (
          <>
            <span className="font-medium">Status changed from</span>
            <StatusBadge status={entry.fromStatus} />
            <span className="text-muted">to</span>
            <StatusBadge status={entry.toStatus} />
          </>
        )}
      </div>
    );
  }

  if (entry.kind === 'assignee') {
    return <p className="text-sm text-muted">{assigneeText(entry)}</p>;
  }

  return (
    <ul className="space-y-0.5 text-sm text-muted">
      {entry.changes.map((change) => (
        <li key={change.field}>{describeChange(change)}</li>
      ))}
    </ul>
  );
}

// Vertical activity feed. `entries` come from the API newest first.
export default function Timeline({ entries }) {
  if (entries.length === 0) {
    return <EmptyState title="No activity yet" message="Status changes, assignments and edits will appear here." />;
  }

  return (
    <ol className="relative ml-3 border-l-2 border-line">
      {entries.map((entry) => (
        <li key={entry.id} className="relative pb-6 pl-6 last:pb-0">
          <Marker entry={entry} />
          <Body entry={entry} />
          <p className="mt-1 text-xs text-muted">
            {formatDateTime(entry.at)} · {formatRelative(entry.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
