import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/labels';

// A coloured dot plus the label, as in the design.
export default function PriorityBadge({ priority }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-fg">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[priority] }} aria-hidden="true" />
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}
