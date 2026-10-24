import { useEffect, useRef, useState } from 'react';

// A button that opens a checklist. `selected` is an array of option values.
export default function FilterDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const active = selected.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${
          active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        {label}
        {active && <span className="rounded-full bg-blue-600 px-1.5 text-xs text-white">{selected.length}</span>}
        <svg className="h-4 w-4 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 max-h-72 w-56 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {options.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">No options</p>}
          {options.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              {opt.label}
            </label>
          ))}
          {active && (
            <button type="button" onClick={() => onChange([])} className="w-full border-t border-slate-100 px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50">
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
