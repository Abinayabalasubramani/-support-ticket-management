import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import RequireAdmin from './components/auth/RequireAdmin';
import RequireAuth from './components/auth/RequireAuth';
import Layout from './components/layout/Layout';
import Spinner from './components/common/Spinner';
import LoginPage from './pages/LoginPage';
import TicketsPage from './pages/TicketsPage';
import TeamPage from './pages/TeamPage';
import TicketDetailPage from './pages/TicketDetailPage';
import NotFoundPage from './pages/NotFoundPage';

// The dashboard pulls in the chart library, so load it only when that page is opened.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      {/* Everything else needs a signed-in user */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<Spinner />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route
          path="team"
          element={
            <RequireAdmin>
              <TeamPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
