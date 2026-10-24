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

const buttonBase = 'min-w-9 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors';

export default function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange, disabled }) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>
          Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
        </span>
        {onLimitChange && (
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Rows per page</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <nav className="flex flex-wrap items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`${buttonBase} border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Previous
        </button>

        {pageWindow(page, totalPages).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`${buttonBase} ${
                item === page
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
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
          className={`${buttonBase} border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
