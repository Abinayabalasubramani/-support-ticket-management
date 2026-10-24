import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';

export default function NotFoundPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <EmptyState
        title="Page not found"
        message="The page you are looking for does not exist."
        action={
          <Link to="/" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Go to dashboard
          </Link>
        }
      />
    </div>
  );
}
