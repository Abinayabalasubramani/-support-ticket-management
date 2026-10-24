import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { closeTicketForm, selectTicketForm } from '../../features/ui/uiSlice';
import TicketFormModal from '../tickets/TicketFormModal';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  const dispatch = useDispatch();
  const form = useSelector(selectTicketForm);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="md:pl-64">
        <Topbar onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-[1400px] p-4 sm:p-8">
          <Outlet />
        </main>
      </div>

      {/* One ticket form for the whole app: the top-bar button, the table and the detail page open it. */}
      <TicketFormModal open={Boolean(form)} ticket={form?.ticket ?? null} onClose={() => dispatch(closeTicketForm())} />
    </div>
  );
}
