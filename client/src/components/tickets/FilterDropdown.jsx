import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const PANEL_WIDTH = 240; // matches w-60

// A boxed control (small label over the current value) that opens a checklist.
// `selected` is an array of option values.
export default function FilterDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef(null);

  // Open towards the left when the panel would run off the right edge of the screen (phones).
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const { left } = ref.current.getBoundingClientRect();
    setAlignRight(left + PANEL_WIDTH > window.innerWidth - 8);
  }, [open]);

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

  const toggle = (value) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const active = selected.length > 0;
  const summary = !active ? 'All' : selected.length === 1 ? options.find((o) => o.value === selected[0])?.label ?? '1 selected' : `${selected.length} selected`;

  return (
    // Two per row on a phone (flex-1), natural width on larger screens.
    <div className="relative min-w-[8.5rem] flex-1 sm:flex-none" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-lg border bg-surface-2 px-3.5 text-left transition-colors hover:border-primary/60 sm:min-w-[9.5rem] ${
          active ? 'border-primary' : 'border-line'
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[11px] leading-tight text-muted">{label}</span>
          <span className="block truncate text-sm leading-tight text-fg">{summary}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`card absolute z-30 mt-2 max-h-72 w-60 max-w-[calc(100vw-2rem)] overflow-auto py-1.5 ${alignRight ? 'right-0' : 'left-0'}`}>
          {options.length === 0 && <p className="px-3 py-2 text-sm text-faint">No options</p>}
          {options.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-fg hover:bg-surface-2">
              <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} className="h-4 w-4 rounded border-line accent-[var(--primary)]" />
              {opt.label}
            </label>
          ))}
          {active && (
            <button type="button" onClick={() => onChange([])} className="mt-1 w-full border-t border-line px-3.5 py-2.5 text-left text-xs font-medium text-muted hover:text-fg">
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
