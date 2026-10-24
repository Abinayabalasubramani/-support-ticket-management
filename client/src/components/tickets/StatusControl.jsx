import { STATUS_LABELS } from '../../utils/labels';

// Offers only the moves the backend allows (ticket.allowedTransitions), so an invalid
// transition can't even be attempted from the UI. The server still enforces the rules.
export default function StatusControl({ ticket, onSelect, loading }) {
  const next = ticket.allowedTransitions ?? [];

  if (next.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        This ticket is <strong>{STATUS_LABELS[ticket.status]}</strong>. It is a final status, so no further changes are possible.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {next.map((status) => (
        <button
          key={status}
          type="button"
          disabled={loading}
          onClick={() => onSelect(status)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Move to {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}
