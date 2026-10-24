import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

// The "..." button at the end of a table row.
// `onDelete` is only passed for admins; without it the Delete item is not shown.
export default function RowMenu({ ticket, onEdit, onDelete }) {
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

  const item = 'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-surface-2';

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ticket ${ticket.id}`} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div role="menu" className="card absolute right-0 z-30 mt-1 w-40 py-1.5 text-fg">
          <Link role="menuitem" to={`/tickets/${ticket.id}`} className={item}>
            <Eye className="h-4 w-4 text-muted" /> View
          </Link>
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onEdit(ticket); }}>
            <Pencil className="h-4 w-4 text-muted" /> Edit
          </button>
          {onDelete && (
            <button role="menuitem" type="button" className={`${item} text-red-500`} onClick={() => { setOpen(false); onDelete(ticket); }}>
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
