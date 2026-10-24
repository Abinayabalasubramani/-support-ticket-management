import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowUpDown, Ticket } from 'lucide-react';
import { useDeleteTicketMutation, useGetTicketsQuery } from '../api/apiSlice';
import { resetFilters, selectFilters, selectHasActiveFilters, setLimit, setPage, setSort } from '../features/filters/filtersSlice';
import { openEditForm } from '../features/ui/uiSlice';
import { getErrorMessage } from '../utils/errors';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Pagination from '../components/common/Pagination';
import { useToast } from '../components/common/Toast';
import FilterBar from '../components/tickets/FilterBar';
import TableSkeleton from '../components/tickets/TableSkeleton';
import TicketTable from '../components/tickets/TicketTable';

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Created (Newest)' },
  { value: 'createdAt:asc', label: 'Created (Oldest)' },
  { value: 'priority:desc', label: 'Priority (High first)' },
  { value: 'priority:asc', label: 'Priority (Low first)' },
  { value: 'status:asc', label: 'Status (Open first)' },
  { value: 'status:desc', label: 'Status (Closed first)' },
  { value: 'title:asc', label: 'Title (A–Z)' },
  { value: 'title:desc', label: 'Title (Z–A)' },
];

export default function TicketsPage() {
  const dispatch = useDispatch();
  const toast = useToast();
  const filters = useSelector(selectFilters);
  const hasActiveFilters = useSelector(selectHasActiveFilters);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetTicketsQuery(filters);
  const [deleteTicket, { isLoading: isDeleting }] = useDeleteTicketMutation();
  const [pendingDelete, setPendingDelete] = useState(null);

  // After deleting the last row of the last page, the current page no longer exists: step back.
  useEffect(() => {
    if (data && data.data.length === 0 && data.meta.total > 0 && data.meta.page > data.meta.totalPages) {
      dispatch(setPage(data.meta.totalPages));
    }
  }, [data, dispatch]);

  const onSort = (key) => {
    const sameColumn = filters.sortBy === key;
    dispatch(setSort({ sortBy: key, order: sameColumn && filters.order === 'asc' ? 'desc' : 'asc' }));
  };

  const onSortSelect = (e) => {
    const [sortBy, order] = e.target.value.split(':');
    dispatch(setSort({ sortBy, order }));
  };

  const confirmDelete = async () => {
    try {
      await deleteTicket(pendingDelete.id).unwrap();
      toast.success(`Ticket #${pendingDelete.id} deleted`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPendingDelete(null);
    }
  };

  const tickets = data?.data ?? [];
  const total = data?.meta.total;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Ticket className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fg">Tickets</h1>
            <p className="text-sm text-muted">Manage and track all support tickets in one place.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="card px-4 py-2.5 text-sm text-muted" aria-live="polite">
            <span className="text-lg font-semibold text-fg">{total ?? '–'}</span> ticket{total === 1 ? '' : 's'}
          </p>
          <label className="card flex items-center gap-2 px-3.5 py-2.5 text-sm">
            <ArrowUpDown className="h-4 w-4 text-muted" aria-hidden="true" />
            <span className="hidden text-muted sm:inline">Sort by:</span>
            <select value={`${filters.sortBy}:${filters.order}`} onChange={onSortSelect} aria-label="Sort tickets" className="cursor-pointer bg-transparent font-medium text-fg focus:outline-none">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-surface-solid text-fg">
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <FilterBar />

      <div className="card overflow-hidden">
        {isLoading && <TableSkeleton />}

        {isError && !data && <ErrorState error={error} onRetry={refetch} title="Could not load tickets" />}

        {data && total === 0 && (
          <EmptyState
            title={hasActiveFilters ? 'No tickets match your filters' : 'No tickets yet'}
            message={hasActiveFilters ? 'Try removing a filter or searching for something else.' : 'Create the first ticket with the "Create ticket" button.'}
            action={
              hasActiveFilters && (
                <button type="button" onClick={() => dispatch(resetFilters())} className="btn-primary">
                  Clear filters
                </button>
              )
            }
          />
        )}

        {tickets.length > 0 && (
          <>
            <TicketTable
              tickets={tickets}
              sortBy={filters.sortBy}
              order={filters.order}
              onSort={onSort}
              onEdit={(ticket) => dispatch(openEditForm(ticket))}
              onDelete={setPendingDelete}
              dimmed={isFetching}
            />
            <Pagination {...data.meta} disabled={isFetching} onPageChange={(p) => dispatch(setPage(p))} onLimitChange={(n) => dispatch(setLimit(n))} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        danger
        loading={isDeleting}
        title="Delete this ticket?"
        message={pendingDelete ? `"${pendingDelete.title}" and its status history will be permanently deleted.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
