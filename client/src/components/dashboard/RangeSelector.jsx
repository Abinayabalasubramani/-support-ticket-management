import { RANGE_OPTIONS, today } from '../../utils/dateRange';

const dateInput = 'input h-10 w-auto py-1.5';

// Segmented control (7 days / 30 days / All time) plus a custom From/To pair.
export default function RangeSelector({ rangeKey, onRangeKey, custom, onCustom, invalid }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="card inline-flex gap-1 p-1" role="group" aria-label="Date range">
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onRangeKey(o.key)}
            aria-pressed={rangeKey === o.key}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              rangeKey === o.key ? 'bg-primary-soft text-fg shadow-[inset_0_0_0_1px_var(--primary)]' : 'text-muted hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {rangeKey === 'custom' && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="sr-only" htmlFor="range-from">From</label>
          <input id="range-from" type="date" value={custom.from} max={custom.to || today()} onChange={(e) => onCustom({ ...custom, from: e.target.value })} className={dateInput} />
          <span className="text-sm text-muted">to</span>
          <label className="sr-only" htmlFor="range-to">To</label>
          <input id="range-to" type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => onCustom({ ...custom, to: e.target.value })} className={dateInput} />
        </div>
      )}

      {invalid && (
        <p role="alert" className="text-sm text-red-500">
          "From" must not be after "To".
        </p>
      )}
    </div>
  );
}
