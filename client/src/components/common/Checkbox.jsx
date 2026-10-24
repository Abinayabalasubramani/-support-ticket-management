import { useEffect, useRef } from 'react';

// A checkbox that can also show the "some selected" (indeterminate) state.
export default function Checkbox({ checked, indeterminate = false, onChange, label }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="h-4 w-4 cursor-pointer rounded border-line accent-[var(--primary)]"
    />
  );
}
