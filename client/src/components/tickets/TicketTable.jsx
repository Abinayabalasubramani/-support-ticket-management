import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import Avatar from '../common/Avatar';
import PriorityBadge from '../common/PriorityBadge';
import StatusBadge from '../common/StatusBadge';
import CategoryIcon from '../../utils/categoryIcons';
import { formatDate, formatTime } from '../../utils/format';
import RowMenu from './RowMenu';

const COLUMNS = [
  { key: 'id', label: 'ID', sortable: false },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'category', label: 'Category', sortable: false },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'assignee', label: 'Assignee', sortable: false },
  { key: 'createdAt', label: 'Created', sortable: true },
];

const th = 'px-4 py-3.5 text-left text-sm font-medium text-muted';

function SortHeader({ column, sortBy, order, onSort }) {
  if (!column.sortable) {
    return (
      <th scope="col" className={th}>
        {column.label}
      </th>
    );
  }

  const active = sortBy === column.key;
  const Arrow = !active ? ChevronsUpDown : order === 'asc' ? ChevronUp : ChevronDown;

  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'} className={th}>
      <button type="button" onClick={() => onSort(column.key)} className="inline-flex items-center gap-1.5 hover:text-fg">
        {column.label}
        <Arrow className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-faint'}`} />
      </button>
    </th>
  );
}

export default function TicketTable({ tickets, sortBy, order, onSort, onEdit, onDelete, dimmed }) {
  return (
    <div className={`overflow-x-auto transition-opacity ${dimmed ? 'opacity-60' : ''}`}>
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-line">
            {COLUMNS.map((c) => (
              <SortHeader key={c.key} column={c} sortBy={sortBy} order={order} onSort={onSort} />
            ))}
            <th scope="col" className={`${th} text-right`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tickets.map((t) => (
            <tr key={t.id} className="transition-colors hover:bg-surface-2/60">
              <td className="whitespace-nowrap px-4 py-4">
                <span className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-xs text-fg">#{t.id}</span>
              </td>
              <td className="max-w-[22rem] px-4 py-4">
                <Link to={`/tickets/${t.id}`} className="block truncate text-sm font-medium text-fg hover:text-primary" title={t.title}>
                  {t.title}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted">{t.description}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <span className="inline-flex items-center gap-2 text-sm text-fg">
                  <CategoryIcon name={t.category?.name} className="h-4 w-4 text-muted" />
                  {t.category?.name}
                </span>
              </td>
              <td className="px-4 py-4">
                <PriorityBadge priority={t.priority} />
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={t.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                {t.assignee ? (
                  <span className="inline-flex items-center gap-2.5 text-sm text-fg">
                    <Avatar name={t.assignee.name} />
                    {t.assignee.name}
                  </span>
                ) : (
                  <span className="text-sm text-faint">Unassigned</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <p className="text-sm text-fg">{formatDate(t.createdAt)}</p>
                <p className="text-xs text-muted">{formatTime(t.createdAt)}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right">
                <RowMenu ticket={t} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
