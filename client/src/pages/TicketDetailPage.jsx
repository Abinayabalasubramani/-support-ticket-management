import { Link, useParams } from 'react-router-dom';

// Placeholder. Phase 6c builds the real detail page and timeline.
export default function TicketDetailPage() {
  const { id } = useParams();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-500">Ticket #{id} details arrive in Phase 6.</p>
      <Link to="/tickets" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
        Back to tickets
      </Link>
    </div>
  );
}
