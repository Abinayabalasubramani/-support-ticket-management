import { Link } from 'react-router-dom';
import PriorityBadge from '../common/PriorityBadge';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/format';

const COLUMNS = [
  { key: 'id', label: 'ID', sortable: false },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'category', label: 'Category', sortable: false },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'assignee', label: 'Assignee', sortable: false },
  { key: 'createdAt', label: 'Created', sortable: true },
];

function SortHeader({ column, sortBy, order, onSort }) {
  const active = sortBy === column.key;
  const ariaSort = active ? (order === 'asc' ? 'ascending' : 'descending') : 'none';

  if (!column.sortable) {
    return <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{column.label}</th>;
  }

  return (
    <th scope="col" aria-sort={ariaSort} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      <button type="button" onClick={() => onSort(column.key)} className="inline-flex items-center gap-1 uppercase hover:text-slate-800">
        {column.label}
        <span className={active ? 'text-blue-600' : 'text-slate-300'}>{active ? (order === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
}

export default function TicketTable({ tickets, sortBy, order, onSort, onDelete, dimmed }) {
  return (
    <div className={`overflow-x-auto transition-opacity ${dimmed ? 'opacity-60' : ''}`}>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {COLUMNS.map((c) => (
              <SortHeader key={c.key} column={c} sortBy={sortBy} order={order} onSort={onSort} />
            ))}
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-400">#{t.id}</td>
              <td className="max-w-xs px-4 py-3 text-sm font-medium text-slate-900">
                <Link to={`/tickets/${t.id}`} className="block truncate hover:text-blue-600" title={t.title}>
                  {t.title}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{t.category?.name}</td>
              <td className="whitespace-nowrap px-4 py-3"><PriorityBadge priority={t.priority} /></td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={t.status} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                {t.assignee ? t.assignee.name : <span className="text-slate-400">Unassigned</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDate(t.createdAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <Link to={`/tickets/${t.id}`} className="mr-3 font-medium text-blue-600 hover:underline">View</Link>
                <button type="button" onClick={() => onDelete(t)} className="font-medium text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
