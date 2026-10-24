import { RANGE_OPTIONS, today } from '../../utils/dateRange';

const dateInput = 'input h-10 w-auto min-w-0 flex-1 py-1.5 sm:flex-none';

// Segmented control (7 days / 30 days / All time) plus a custom From/To pair.
// On a phone it spans the full width, with four equal buttons.
export default function RangeSelector({ rangeKey, onRangeKey, custom, onCustom, invalid }) {
  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="card grid grid-cols-4 gap-1 p-1 sm:inline-flex" role="group" aria-label="Date range">
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onRangeKey(o.key)}
            aria-pressed={rangeKey === o.key}
            className={`whitespace-nowrap rounded-lg px-1.5 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
              rangeKey === o.key ? 'bg-primary-soft text-fg shadow-[inset_0_0_0_1px_var(--primary)]' : 'text-muted hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {rangeKey === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
