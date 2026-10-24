import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { LogOut } from 'lucide-react';
import { selectUser } from '../../features/auth/authSlice';
import useSignOut from '../../features/auth/useSignOut';
import Avatar from '../common/Avatar';

// The signed-in person: name and role in a small menu with Sign out.
export default function UserMenu() {
  const user = useSelector(selectUser);
  const signOutNow = useSignOut();
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

  if (!user) return null;

  const signOut = () => {
    setOpen(false);
    signOutNow();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 py-1 pl-1 pr-3 transition-colors hover:border-primary/60"
      >
        <Avatar name={user.name} size="h-8 w-8 text-xs" />
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-sm font-medium text-fg">{user.name}</span>
          <span className="block text-[11px] capitalize text-muted">{user.role.toLowerCase()}</span>
        </span>
      </button>

      {open && (
        <div role="menu" className="card absolute right-0 z-30 mt-2 w-60 overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-fg">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <span className="mt-2 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium capitalize text-primary">{user.role.toLowerCase()}</span>
          </div>
          <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-fg hover:bg-surface-2">
            <LogOut className="h-4 w-4 text-muted" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
