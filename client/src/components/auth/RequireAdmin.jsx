import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { selectIsAdmin } from '../../features/auth/authSlice';
import EmptyState from '../common/EmptyState';

// For pages only admins may use. (The server enforces it too: this just explains instead of showing errors.)
export default function RequireAdmin({ children }) {
  const isAdmin = useSelector(selectIsAdmin);
  if (isAdmin) return children;

  return (
    <div className="card">
      <EmptyState
        title="Admins only"
        message="You do not have permission to open this page. Ask an admin if you need access."
        action={
          <Link to="/" className="btn-primary">
            <ShieldAlert className="h-4 w-4" />
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
