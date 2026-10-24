import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tickets', label: 'Tickets', end: false },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Dim backdrop behind the drawer on small screens */}
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-200 transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-6 text-lg font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm">SD</span>
          Support Desk
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <p className="px-6 py-4 text-xs text-slate-500">Support Ticket Management</p>
      </aside>
    </>
  );
}
