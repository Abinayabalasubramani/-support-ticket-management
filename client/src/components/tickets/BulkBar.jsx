import { X } from 'lucide-react';
import { useGetMetaQuery } from '../../api/apiSlice';
import { STATUS_LABELS } from '../../utils/labels';

const select =
  'h-10 cursor-pointer rounded-lg border border-line bg-surface-2 px-3 text-sm text-fg focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

// Shown while tickets are selected. Picking a value asks the page to confirm the action.
export default function BulkBar({ count, busy, onClear, onPickStatus, onPickAssignee }) {
  const { data: meta } = useGetMetaQuery();

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-primary-soft px-5 py-3" role="region" aria-label="Bulk actions">
      <p className="text-sm font-medium text-fg">
        {count} selected
      </p>
      <button type="button" onClick={onClear} disabled={busy} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg disabled:opacity-50">
        <X className="h-4 w-4" /> Clear
      </button>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        {/* value is always "" so the control resets after each choice */}
        <select value="" disabled={busy || !meta} onChange={(e) => e.target.value && onPickStatus(e.target.value)} aria-label="Change status of selected tickets" className={select}>
          <option value="" className="bg-surface-solid text-fg">Change status…</option>
          {(meta?.statuses ?? []).map((s) => (
            <option key={s} value={s} className="bg-surface-solid text-fg">
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value=""
          disabled={busy || !meta}
          onChange={(e) => e.target.value && onPickAssignee(e.target.value === 'none' ? null : Number(e.target.value))}
          aria-label="Assign selected tickets"
          className={select}
        >
          <option value="" className="bg-surface-solid text-fg">Assign to…</option>
          <option value="none" className="bg-surface-solid text-fg">Unassigned</option>
          {(meta?.users ?? []).map((u) => (
            <option key={u.id} value={u.id} className="bg-surface-solid text-fg">
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
