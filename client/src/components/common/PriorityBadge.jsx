import { PRIORITY_LABELS, PRIORITY_STYLES } from '../../utils/labels';

export default function PriorityBadge({ priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PRIORITY_STYLES[priority] ?? ''}`}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}
