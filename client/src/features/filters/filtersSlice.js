import { createSlice } from '@reduxjs/toolkit';

// UI state for the tickets table. Server data lives in the RTK Query cache,
// not here: this slice only remembers what the user asked to see.
const initialState = {
  search: '',
  status: [],
  priority: [],
  category: [],
  assignee: [],
  sortBy: 'createdAt',
  order: 'desc',
  page: 1,
  limit: 10,
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setSearch(state, { payload }) {
      state.search = payload;
      state.page = 1; // a new result set starts on page 1
    },
    // payload: { key: 'status' | 'priority' | 'category' | 'assignee', value: string[] }
    setFilter(state, { payload: { key, value } }) {
      state[key] = value;
      state.page = 1;
    },
    setSort(state, { payload: { sortBy, order } }) {
      state.sortBy = sortBy;
      state.order = order;
      state.page = 1;
    },
    setPage(state, { payload }) {
      state.page = payload;
    },
    setLimit(state, { payload }) {
      state.limit = payload;
      state.page = 1;
    },
    resetFilters() {
      return initialState;
    },
  },
});

export const { setSearch, setFilter, setSort, setPage, setLimit, resetFilters } = filtersSlice.actions;

export const selectFilters = (state) => state.filters;

export const selectHasActiveFilters = (state) => {
  const f = state.filters;
  return Boolean(f.search || f.status.length || f.priority.length || f.category.length || f.assignee.length);
};

export default filtersSlice.reducer;
