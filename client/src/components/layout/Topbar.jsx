import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { House, Menu, Plus, Search, Ticket, Users } from 'lucide-react';
import { setSearch } from '../../features/filters/filtersSlice';
import { openCreateForm } from '../../features/ui/uiSlice';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

function pageFor(pathname) {
  if (pathname === '/') return { title: 'Dashboard', icon: House };
  if (pathname === '/tickets') return { title: 'Tickets', icon: Ticket };
  if (pathname === '/team') return { title: 'Team', icon: Users };
  if (matchPath('/tickets/:id', pathname)) return { title: 'Ticket details', icon: Ticket };
  return { title: 'TicketFlow', icon: House };
}

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const { title, icon: PageIcon } = pageFor(pathname);

  // "/" or Ctrl/Cmd+K jumps to the search box from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      const isShortcut = (e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k');
      if (isShortcut) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Searching from the top bar shows the matching tickets on the Tickets page.
  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(setSearch(query.trim()));
    navigate('/tickets');
    inputRef.current?.blur();
  };

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-line bg-sidebar px-4 backdrop-blur-xl sm:px-8">
      <button type="button" onClick={onMenuClick} className="btn-icon md:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2.5 text-sm font-medium text-fg">
        <PageIcon className="h-5 w-5 text-muted" aria-hidden="true" />
        <span className="hidden sm:inline">{title}</span>
      </div>

      <form onSubmit={onSubmit} role="search" className="relative mx-auto hidden w-full max-w-xl sm:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tickets"
          aria-label="Search tickets"
          className="input h-11 pl-10 pr-12 [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs text-muted">/</kbd>
      </form>

      <div className="ml-auto flex items-center gap-3 sm:ml-0">
        <ThemeToggle />
        <button type="button" onClick={() => dispatch(openCreateForm())} className="btn-primary h-10 px-4">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create ticket</span>
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
