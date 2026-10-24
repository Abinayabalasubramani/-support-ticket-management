import { useEffect } from 'react';

// Centered dialog with a dimmed backdrop. Esc and backdrop click close it unless `locked`.
export default function Modal({ title, onClose, locked = false, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !locked && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [locked, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="fixed inset-0 bg-slate-900/50" onClick={locked ? undefined : onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative my-8 w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} disabled={locked} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
