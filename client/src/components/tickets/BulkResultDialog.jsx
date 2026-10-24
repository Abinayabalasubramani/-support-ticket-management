import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';

// After a bulk action, lists the tickets that were skipped and why.
export default function BulkResultDialog({ result, titles, onClose }) {
  useEffect(() => {
    if (!result) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [result, onClose]);

  if (!result) return null;

  const failed = result.results.filter((r) => !r.ok);
  const { succeeded } = result.summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ backgroundColor: 'var(--overlay)' }} onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="bulk-result-title" className="card relative flex max-h-[85vh] w-full max-w-lg flex-col p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
            <TriangleAlert className="h-5 w-5" />
          </span>
          <div>
            <h2 id="bulk-result-title" className="text-lg font-semibold text-fg">
              {failed.length} ticket{failed.length === 1 ? '' : 's'} could not be updated
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {succeeded} ticket{succeeded === 1 ? ' was' : 's were'} updated. These were skipped and are still selected:
            </p>
          </div>
        </div>

        <ul className="mt-4 min-h-0 flex-1 divide-y divide-line overflow-y-auto rounded-lg border border-line">
          {failed.map((r) => (
            <li key={r.id} className="px-4 py-3 text-sm">
              <p className="font-medium text-fg">
                #{r.id}
                {titles[r.id] ? ` · ${titles[r.id]}` : ''}
              </p>
              <p className="mt-0.5 text-muted">{r.message}</p>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="btn-primary">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
