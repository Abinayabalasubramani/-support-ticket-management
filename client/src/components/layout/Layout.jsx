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
    // overflow-x-clip is a safety net: if anything is ever too wide, the page never scrolls sideways.
    <div className="min-h-screen overflow-x-clip">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {/* min-w-0: a flex/grid child may shrink below its content's width instead of stretching the page */}
      <div className="min-w-0 md:pl-64">
        <Topbar onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto min-w-0 max-w-[1400px] p-4 sm:p-8">
          <Outlet />
        </main>
      </div>

      {/* One ticket form for the whole app: the top-bar button, the table and the detail page open it. */}
      <TicketFormModal open={Boolean(form)} ticket={form?.ticket ?? null} onClose={() => dispatch(closeTicketForm())} />
    </div>
  );
}
