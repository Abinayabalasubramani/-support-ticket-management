import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

const MENU_WIDTH = 160;
const MENU_HEIGHT = 132; // roughly three items

// The "..." button at the end of a table row.
// The menu is drawn on the page itself (a portal) and positioned from the button, because
// inside the table it would be cut off by the table's scrolling area and hidden by the
// rows below it. It opens upward when there is no room below.
// `onDelete` is only passed for admins; without it the Delete item is not shown.
export default function RowMenu({ ticket, onEdit, onDelete }) {
  const [position, setPosition] = useState(null); // null = closed
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const open = position !== null;

  const close = () => setPosition(null);

  const toggle = () => {
    if (open) return close();
    const rect = buttonRef.current.getBoundingClientRect();
    const openUp = rect.bottom + MENU_HEIGHT + 8 > window.innerHeight;
    return setPosition({
      top: openUp ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (!buttonRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true); // any scrolling moves the button away from the menu
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-surface-2';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ticket ${ticket.id}`}
        className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="popover fixed z-50 py-1.5 text-left text-fg"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          >
            <Link role="menuitem" to={`/tickets/${ticket.id}`} className={item} onClick={close}>
              <Eye className="h-4 w-4 text-muted" /> View
            </Link>
            <button role="menuitem" type="button" className={item} onClick={() => { close(); onEdit(ticket); }}>
              <Pencil className="h-4 w-4 text-muted" /> Edit
            </button>
            {onDelete && (
              <button role="menuitem" type="button" className={`${item} text-red-500`} onClick={() => { close(); onDelete(ticket); }}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
