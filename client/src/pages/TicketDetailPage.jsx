import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useAssignTicketMutation,
  useChangeStatusMutation,
  useDeleteTicketMutation,
  useGetMetaQuery,
  useGetTicketHistoryQuery,
  useGetTicketQuery,
} from '../api/apiSlice';
import { getErrorMessage } from '../utils/errors';
import { STATUS_LABELS } from '../utils/labels';
import { formatDateTime } from '../utils/format';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import PriorityBadge from '../components/common/PriorityBadge';
import Skeleton from '../components/common/Skeleton';
import Spinner from '../components/common/Spinner';
import StatusBadge from '../components/common/StatusBadge';
import { useToast } from '../components/common/Toast';
import AssigneeSelect from '../components/tickets/AssigneeSelect';
import StatusControl from '../components/tickets/StatusControl';
import TicketFormModal from '../components/tickets/TicketFormModal';
import Timeline from '../components/tickets/Timeline';

const card = 'rounded-lg border border-slate-200 bg-white';

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading ticket">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const ticketQuery = useGetTicketQuery(id);
  const historyQuery = useGetTicketHistoryQuery(id, { skip: !ticketQuery.data });
  const { data: meta } = useGetMetaQuery();

  const [changeStatus, { isLoading: isChangingStatus }] = useChangeStatusMutation();
  const [assignTicket, { isLoading: isAssigning }] = useAssignTicketMutation();
  const [deleteTicket, { isLoading: isDeleting }] = useDeleteTicketMutation();

  const [pendingStatus, setPendingStatus] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: ticket, isLoading, isError, error, refetch } = ticketQuery;

  if (isLoading) return <DetailSkeleton />;

  // Unknown id (404) or a malformed one (400): same answer for the user.
  if (isError && [400, 404].includes(error.status)) {
    return (
      <div className={card}>
        <EmptyState
          title="Ticket not found"
          message={`There is no ticket #${id}. It may have been deleted.`}
          action={
            <Link to="/tickets" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              Back to tickets
            </Link>
          }
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={card}>
        <ErrorState error={error} onRetry={refetch} title="Could not load the ticket" />
      </div>
    );
  }

  const runStatusChange = async (status) => {
    try {
      await changeStatus({ id: ticket.id, status }).unwrap();
      toast.success(`Status changed to ${STATUS_LABELS[status]}`);
    } catch (err) {
      // e.g. 409: someone else already changed it. The cache refetches, so the buttons update too.
      toast.error(getErrorMessage(err));
    } finally {
      setPendingStatus(null);
    }
  };

  // Closing is final, so ask first. Other moves are reversible and apply immediately.
  const onSelectStatus = (status) => (status === 'CLOSED' ? setPendingStatus(status) : runStatusChange(status));

  const onAssign = async (assigneeId) => {
    try {
      const updated = await assignTicket({ id: ticket.id, assigneeId }).unwrap();
      toast.success(updated.assignee ? `Assigned to ${updated.assignee.name}` : 'Ticket unassigned');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onDelete = async () => {
    try {
      await deleteTicket(ticket.id).unwrap();
      toast.success(`Ticket #${ticket.id} deleted`);
      navigate('/tickets', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/tickets" className="inline-block text-sm font-medium text-blue-600 hover:underline">
        ← Back to tickets
      </Link>

      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">Ticket #{ticket.id}</p>
            <h2 className="mt-0.5 break-words text-xl font-semibold text-slate-900">{ticket.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{ticket.category?.name}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>
        </div>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Description</h3>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{ticket.description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <section className={`${card} p-5`}>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Status</h3>
            <StatusControl ticket={ticket} onSelect={onSelectStatus} loading={isChangingStatus} />
          </section>

          <section className={`${card} p-5`}>
            <label htmlFor="assignee" className="mb-3 block text-sm font-semibold text-slate-900">
              Assignee
            </label>
            {meta ? (
              <AssigneeSelect id="assignee" value={ticket.assigneeId} users={meta.users} disabled={isAssigning} onChange={onAssign} />
            ) : (
              <Skeleton className="h-9 w-full" />
            )}
          </section>

          <section className={`${card} p-5`}>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-right text-slate-800">{formatDateTime(ticket.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Last updated</dt>
                <dd className="text-right text-slate-800">{formatDateTime(ticket.updatedAt)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className={`${card} p-5 lg:col-span-2`}>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Activity timeline{historyQuery.data ? ` (${historyQuery.data.length})` : ''}
          </h3>
          {historyQuery.isLoading && <Spinner label="Loading activity…" />}
          {historyQuery.isError && <ErrorState error={historyQuery.error} onRetry={historyQuery.refetch} title="Could not load activity" />}
          {historyQuery.data && <Timeline entries={historyQuery.data} />}
        </section>
      </div>

      <ConfirmDialog
        open={pendingStatus === 'CLOSED'}
        loading={isChangingStatus}
        title="Close this ticket?"
        message="Closed is a final status. The ticket cannot be reopened or changed to another status afterwards."
        confirmLabel="Close ticket"
        onConfirm={() => runStatusChange('CLOSED')}
        onCancel={() => setPendingStatus(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        danger
        loading={isDeleting}
        title="Delete this ticket?"
        message={`"${ticket.title}" and its status history will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <TicketFormModal open={editing} ticket={ticket} onClose={() => setEditing(false)} />
    </div>
  );
}
