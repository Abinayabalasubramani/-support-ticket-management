const today = () => new Date().toISOString().slice(0, 10);

// YYYY-MM-DD for `days - 1` days before today (so "last 7 days" includes today).
const daysAgo = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
};

const PRESETS = [
  { label: 'Last 7 days', range: () => ({ from: daysAgo(7), to: today() }) },
  { label: 'Last 30 days', range: () => ({ from: daysAgo(30), to: today() }) },
  { label: 'All time', range: () => ({ from: '', to: '' }) },
];

const dateInput =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export default function DateRangeFilter({ value, onChange, invalid }) {
  const isActive = (preset) => {
    const r = preset.range();
    return r.from === value.from && r.to === value.to;
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium">From</span>
          <input type="date" value={value.from} max={value.to || today()} onChange={(e) => onChange({ ...value, from: e.target.value })} className={dateInput} />
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium">To</span>
          <input type="date" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className={dateInput} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.range())}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              isActive(p) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {invalid && (
        <p role="alert" className="text-sm text-red-600 lg:basis-full">
          "From" must not be after "To".
        </p>
      )}
    </div>
  );
}
