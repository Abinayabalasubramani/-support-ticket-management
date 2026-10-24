import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RotateCcw } from 'lucide-react';
import { useGetMetaQuery } from '../../api/apiSlice';
import { resetFilters, selectFilters, selectHasActiveFilters, setFilter, setSearch } from '../../features/filters/filtersSlice';
import { PRIORITY_LABELS, STATUS_LABELS } from '../../utils/labels';
import FilterDropdown from './FilterDropdown';
import SearchInput from './SearchInput';

export default function FilterBar() {
  const dispatch = useDispatch();
  const filters = useSelector(selectFilters);
  const hasActive = useSelector(selectHasActiveFilters);
  const { data: meta } = useGetMetaQuery();

  const onSearch = useCallback((value) => dispatch(setSearch(value)), [dispatch]);
  const set = (key) => (value) => dispatch(setFilter({ key, value }));

  const options = useMemo(
    () => ({
      status: (meta?.statuses ?? []).map((v) => ({ value: v, label: STATUS_LABELS[v] ?? v })),
      priority: (meta?.priorities ?? []).map((v) => ({ value: v, label: PRIORITY_LABELS[v] ?? v })),
      category: (meta?.categories ?? []).map((c) => ({ value: String(c.id), label: c.name })),
      assignee: [
        { value: 'unassigned', label: 'Unassigned' },
        ...(meta?.users ?? []).map((u) => ({ value: String(u.id), label: u.name })),
      ],
    }),
    [meta]
  );

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <SearchInput value={filters.search} onCommit={onSearch} />
      <FilterDropdown label="Status" options={options.status} selected={filters.status} onChange={set('status')} />
      <FilterDropdown label="Priority" options={options.priority} selected={filters.priority} onChange={set('priority')} />
      <FilterDropdown label="Category" options={options.category} selected={filters.category} onChange={set('category')} />
      <FilterDropdown label="Assignee" options={options.assignee} selected={filters.assignee} onChange={set('assignee')} />
      <button
        type="button"
        onClick={() => dispatch(resetFilters())}
        disabled={!hasActive}
        className="inline-flex h-12 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:text-fg disabled:cursor-default disabled:opacity-40"
      >
        <RotateCcw className="h-4 w-4" />
        Clear all
      </button>
    </div>
  );
}
