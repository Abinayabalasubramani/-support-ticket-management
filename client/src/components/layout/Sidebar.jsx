import { NavLink } from 'react-router-dom';
import { LayoutGrid, Ticket } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/tickets', label: 'Tickets', icon: Ticket, end: false },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Dim backdrop behind the drawer on small screens */}
      {open && <div className="fixed inset-0 z-30 md:hidden" style={{ backgroundColor: 'var(--overlay)' }} onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden border-r border-line bg-sidebar backdrop-blur-xl transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Decorative wave, as in the design */}
        <svg className="pointer-events-none absolute inset-x-0 bottom-20 opacity-20 dark:opacity-60" viewBox="0 0 256 260" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="wave" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3d7bff" stopOpacity="0" />
              <stop offset="1" stopColor="#3d7bff" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {[0, 10, 20, 30].map((offset) => (
            <path key={offset} d={`M-10 ${80 + offset} C 60 ${20 + offset}, 90 ${240 + offset}, 280 ${150 + offset}`} stroke="url(#wave)" strokeWidth="1" />
          ))}
        </svg>

        <div className="relative flex h-[72px] items-center gap-3 px-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg" style={{ backgroundImage: 'var(--brand-gradient)' }}>
            <Ticket className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-fg">TicketFlow</span>
        </div>

        <nav className="relative flex-1 space-y-1 px-3 py-4" aria-label="Main">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-soft text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -left-3 top-2 h-[calc(100%-1rem)] w-1 rounded-r-full bg-primary" aria-hidden="true" />}
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
