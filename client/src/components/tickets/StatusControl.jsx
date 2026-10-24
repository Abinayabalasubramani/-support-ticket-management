import { STATUS_COLORS, STATUS_LABELS } from '../../utils/labels';

// Offers only the moves the backend allows (ticket.allowedTransitions), so an invalid
// transition can't even be attempted from the UI. The server still enforces the rules.
export default function StatusControl({ ticket, onSelect, loading }) {
  const next = ticket.allowedTransitions ?? [];

  if (next.length === 0) {
    return (
      <p className="text-sm text-muted">
        This ticket is <strong className="text-fg">{STATUS_LABELS[ticket.status]}</strong>. It is a final status, so no further changes are possible.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {next.map((status) => (
        <button key={status} type="button" disabled={loading} onClick={() => onSelect(status)} className="btn-secondary">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} aria-hidden="true" />
          Move to {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}
