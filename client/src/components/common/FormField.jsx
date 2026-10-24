// Label + control + error message, wired together for screen readers.
// `counter` (e.g. "12/200") shows under the control, as in the design.
export default function FormField({ id, label, icon: Icon, error, hint, counter, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fg">
        {Icon && <Icon className="h-4 w-4 text-muted" aria-hidden="true" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          {hint && !error && <p className="text-xs text-faint">{hint}</p>}
          {error && (
            <p id={`${id}-error`} role="alert" className="text-xs text-red-500">
              {error}
            </p>
          )}
        </div>
        {counter && <p className="shrink-0 text-xs text-faint">{counter}</p>}
      </div>
    </div>
  );
}

export const inputClass = (hasError) => `input ${hasError ? 'input-error' : ''}`;
