import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const PANEL_WIDTH = 240;

// A boxed control (small label over the current value) that opens a checklist.
// `selected` is an array of option values.
// The list is drawn on the page itself (a portal) and positioned from the button, so it
// sits above the table with a real frosted blur and can never be cut off by a parent.
export default function FilterDropdown({ label, options, selected, onChange }) {
  const [position, setPosition] = useState(null); // null = closed
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const open = position !== null;

  const close = () => setPosition(null);

  const toggle = () => {
    if (open) return close();
    const rect = buttonRef.current.getBoundingClientRect();
    return setPosition({
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)),
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (!buttonRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    // Scrolling the page moves the button away from the list, so close it. Scrolling inside the list itself is fine.
    const onScroll = (e) => !panelRef.current?.contains(e.target) && close();
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const toggleValue = (value) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const active = selected.length > 0;
  const summary = !active ? 'All' : selected.length === 1 ? options.find((o) => o.value === selected[0])?.label ?? '1 selected' : `${selected.length} selected`;

  return (
    // Two per row on a phone (flex-1), natural width on larger screens.
    <div className="relative min-w-[8.5rem] flex-1 sm:flex-none">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
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

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={label}
            className="popover fixed z-50 max-h-72 overflow-auto py-1.5"
            style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
          >
            {options.length === 0 && <p className="px-3 py-2 text-sm text-faint">No options</p>}
            {options.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-fg hover:bg-primary-soft">
                <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggleValue(opt.value)} className="h-4 w-4 rounded border-line accent-[var(--primary)]" />
                {opt.label}
              </label>
            ))}
            {active && (
              <button type="button" onClick={() => onChange([])} className="mt-1 w-full border-t border-line px-3.5 py-2.5 text-left text-xs font-medium text-muted hover:text-fg">
                Clear {label.toLowerCase()}
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
