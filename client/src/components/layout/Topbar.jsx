import { useLocation } from 'react-router-dom';

function titleFor(pathname) {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/tickets') return 'Tickets';
  if (pathname.startsWith('/tickets/')) return 'Ticket details';
  return 'Support Desk';
}

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-lg font-semibold text-slate-900">{titleFor(pathname)}</h1>
    </header>
  );
}
