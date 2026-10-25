import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, STATUS_STYLES } from '../../utils/labels';

const MENU_WIDTH = 190;
const ITEM_HEIGHT = 38;

// The status pill in a table row, as a dropdown. It lists the current status and only the moves
// the backend allows (ticket.allowedTransitions); the server still enforces the rules.
// Drawn in a portal for the same reason as RowMenu: the table would clip it.
// `block` renders a full-width select-style button (ticket page) instead of the small pill (table).
export default function StatusMenu({ ticket, onChange, busy, block = false }) {
  const [position, setPosition] = useState(null); // null = closed
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const open = position !== null;

  const next = ticket.allowedTransitions ?? [];
  const close = () => setPosition(null);

  const toggle = () => {
    if (open) return close();
    const rect = buttonRef.current.getBoundingClientRect();
    const height = (next.length + 1) * ITEM_HEIGHT + 12;
    const width = block ? Math.max(rect.width, MENU_WIDTH) : MENU_WIDTH;
    const openUp = rect.bottom + height + 8 > window.innerHeight;
    return setPosition({
      top: openUp ? rect.top - height - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
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
    window.addEventListener('scroll', close, true);
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
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Change status of ticket ${ticket.id}, currently ${STATUS_LABELS[ticket.status]}`}
        className={
          block
            ? 'btn-secondary w-full justify-between'
            : `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-opacity hover:opacity-80 disabled:opacity-50 ${STATUS_STYLES[ticket.status] ?? ''}`
        }
      >
        {block ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[ticket.status] }} aria-hidden="true" />
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </span>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </>
        )}
        <ChevronDown className={block ? 'h-4 w-4 text-muted' : 'h-3 w-3'} aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="popover fixed z-50 py-1.5 text-left text-fg"
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            <p role="presentation" className={`${item} cursor-default text-muted hover:bg-transparent`}>
              <Check className="h-4 w-4" aria-hidden="true" /> {STATUS_LABELS[ticket.status]}
            </p>
            {next.map((status) => (
              <button
                key={status}
                role="menuitem"
                type="button"
                className={item}
                onClick={() => {
                  close();
                  onChange(ticket, status);
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} aria-hidden="true" />
                {ticket.status === 'CLOSED' ? 'Reopen' : STATUS_LABELS[status]}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
