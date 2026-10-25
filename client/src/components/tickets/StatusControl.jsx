import { STATUS_LABELS } from '../../utils/labels';
import StatusMenu from './StatusMenu';

// A dropdown that offers only the moves the backend allows (ticket.allowedTransitions), so an
// invalid transition can't even be attempted from the UI. The server still enforces the rules.
export default function StatusControl({ ticket, onSelect, loading }) {
  const next = ticket.allowedTransitions ?? [];

  if (next.length === 0) {
    return (
      <p className="text-sm text-muted">
        This ticket is <strong className="text-fg">{STATUS_LABELS[ticket.status]}</strong>. No further status changes are possible.
      </p>
    );
  }

  return <StatusMenu block ticket={ticket} busy={loading} onChange={(_, status) => onSelect(status)} />;
}
