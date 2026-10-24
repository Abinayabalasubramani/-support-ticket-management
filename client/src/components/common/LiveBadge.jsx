import { useRealtime } from '../../realtime/RealtimeProvider';

const STATES = {
  live: { label: 'Live', dot: 'bg-emerald-400', text: 'text-emerald-500', title: 'Changes made by other people appear here automatically' },
  connecting: { label: 'Connecting…', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-500', title: 'Connecting for live updates' },
  offline: { label: 'Offline', dot: 'bg-slate-400', text: 'text-muted', title: 'Live updates are not available. Reload to retry' },
};

// Small "● Live" indicator for the live-update connection.
export default function LiveBadge() {
  const { status } = useRealtime();
  const { label, dot, text, title } = STATES[status] ?? STATES.offline;

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${text}`} title={title}>
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
