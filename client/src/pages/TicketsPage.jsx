import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDeleteTicketMutation, useGetTicketsQuery } from '../api/apiSlice';
import { resetFilters, selectFilters, selectHasActiveFilters, setLimit, setPage, setSort } from '../features/filters/filtersSlice';
import { getErrorMessage } from '../utils/errors';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Pagination from '../components/common/Pagination';
import { useToast } from '../components/common/Toast';
import FilterBar from '../components/tickets/FilterBar';
import TableSkeleton from '../components/tickets/TableSkeleton';
import TicketTable from '../components/tickets/TicketTable';

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

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <FilterBar />

      {isLoading && <TableSkeleton />}

      {isError && !data && <ErrorState error={error} onRetry={refetch} title="Could not load tickets" />}

      {data && tickets.length === 0 && data.meta.total === 0 && (
        <EmptyState
          title={hasActiveFilters ? 'No tickets match your filters' : 'No tickets yet'}
          message={hasActiveFilters ? 'Try removing a filter or searching for something else.' : 'Tickets you create will appear here.'}
          action={
            hasActiveFilters && (
              <button type="button" onClick={() => dispatch(resetFilters())} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
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
            onDelete={setPendingDelete}
            dimmed={isFetching}
          />
          <Pagination
            {...data.meta}
            disabled={isFetching}
            onPageChange={(p) => dispatch(setPage(p))}
            onLimitChange={(n) => dispatch(setLimit(n))}
          />
        </>
      )}

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
