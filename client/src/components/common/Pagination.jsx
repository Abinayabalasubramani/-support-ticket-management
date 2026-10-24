import { ChevronLeft, ChevronRight } from 'lucide-react';

// Page numbers to show: always first and last, plus a window around the current page.
function pageWindow(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push('gap');
    items.push(p);
  });
  return items;
}

const control =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';

export default function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange, disabled, sizes = [8, 16, 32] }) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-4 sm:flex-row">
      <p className="text-sm text-muted">
        Showing {from}–{to} of {total} tickets
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <nav className="flex items-center gap-1.5" aria-label="Pagination">
          <button
            type="button"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={`${control} border-line bg-surface-2 text-muted hover:text-fg`}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageWindow(page, totalPages).map((item, i) =>
            item === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-faint">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={`${control} ${
                  item === page
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-transparent text-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={`${control} border-line bg-surface-2 text-muted hover:text-fg`}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>

        {onLimitChange && (
          <label>
            <span className="sr-only">Rows per page</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-9 rounded-lg border border-line bg-surface-2 px-2.5 text-sm text-fg focus:border-primary focus:outline-none"
            >
              {sizes.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
