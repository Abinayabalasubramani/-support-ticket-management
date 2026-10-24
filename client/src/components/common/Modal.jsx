import { useEffect } from 'react';
import { X } from 'lucide-react';

// Centered dialog over a dimmed backdrop. Esc and backdrop click close it unless `locked`.
// `icon` (a lucide component) and `subtitle` give it the header from the design.
export default function Modal({ title, subtitle, icon: Icon, onClose, locked = false, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !locked && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [locked, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="fixed inset-0 backdrop-blur-sm" style={{ backgroundColor: 'var(--overlay)' }} onClick={locked ? undefined : onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card relative my-8 w-full max-w-xl shadow-2xl"
        style={{ boxShadow: '0 0 0 1px var(--line), 0 24px 60px rgba(0,0,0,0.45), 0 0 80px var(--glow)' }}
      >
        <div className="flex items-start gap-4 px-6 pb-2 pt-6">
          {Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundImage: 'var(--brand-gradient)' }}>
              <Icon className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={locked} className="rounded-md p-1 text-muted hover:text-fg disabled:opacity-50" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
