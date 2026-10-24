import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { CLIENT_ID } from '../realtime/clientId';

export const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Drop empty values and turn arrays into "a,b,c" (the format the API expects).
const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])
      .filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );

// Cache tags: a mutation invalidates the tags it affects, and every query that
// provides one of those tags refetches automatically. This is what keeps the
// table, the detail page and the dashboard in sync without a page reload.
//   Ticket {id}   - one ticket           Ticket 'LIST' - every list/filter combination
//   History {id}  - a ticket's timeline  Analytics     - dashboard numbers
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set('X-Client-Id', CLIENT_ID);
      return headers;
    },
  }),
  tagTypes: ['Ticket', 'History', 'Analytics'],
  endpoints: (builder) => ({
    // Reference data for dropdowns. Rarely changes, so keep it cached for an hour.
    getMeta: builder.query({
      query: () => '/meta',
      keepUnusedDataFor: 3600,
    }),

    getTickets: builder.query({
      query: (params) => ({ url: '/tickets', params: cleanParams(params) }),
      providesTags: (result) => [
        { type: 'Ticket', id: 'LIST' },
        ...(result?.data ?? []).map(({ id }) => ({ type: 'Ticket', id })),
      ],
    }),

    getTicket: builder.query({
      query: (id) => `/tickets/${id}`,
      providesTags: (result, error, id) => [{ type: 'Ticket', id }],
    }),

    getTicketHistory: builder.query({
      query: (id) => `/tickets/${id}/history`,
      providesTags: (result, error, id) => [{ type: 'History', id }],
    }),

    createTicket: builder.mutation({
      query: (body) => ({ url: '/tickets', method: 'POST', body }),
      invalidatesTags: [{ type: 'Ticket', id: 'LIST' }, 'Analytics'],
    }),

    updateTicket: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/tickets/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Ticket', id },
        { type: 'Ticket', id: 'LIST' },
        'Analytics', // a priority change moves the "critical" count
      ],
    }),

    changeStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/tickets/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Ticket', id },
        { type: 'Ticket', id: 'LIST' },
        { type: 'History', id },
        'Analytics',
      ],
    }),

    assignTicket: builder.mutation({
      query: ({ id, assigneeId }) => ({ url: `/tickets/${id}/assignee`, method: 'PATCH', body: { assigneeId } }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Ticket', id },
        { type: 'Ticket', id: 'LIST' },
      ],
    }),

    // body: { ids: [...], status } or { ids: [...], assigneeId }. Returns a result per ticket.
    bulkUpdate: builder.mutation({
      query: (body) => ({ url: '/tickets/bulk', method: 'PATCH', body }),
      invalidatesTags: (result, error, { ids }) => [
        { type: 'Ticket', id: 'LIST' },
        ...ids.map((id) => ({ type: 'Ticket', id })),
        ...ids.map((id) => ({ type: 'History', id })),
        'Analytics',
      ],
    }),

    deleteTicket: builder.mutation({
      query: (id) => ({ url: `/tickets/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, id) => [
        { type: 'Ticket', id },
        { type: 'Ticket', id: 'LIST' },
        { type: 'History', id },
        'Analytics',
      ],
    }),

    getSummary: builder.query({
      query: (range) => ({ url: '/analytics/summary', params: cleanParams(range) }),
      providesTags: ['Analytics'],
    }),

    getByStatus: builder.query({
      query: (range) => ({ url: '/analytics/by-status', params: cleanParams(range) }),
      providesTags: ['Analytics'],
    }),

    getByPriority: builder.query({
      query: (range) => ({ url: '/analytics/by-priority', params: cleanParams(range) }),
      providesTags: ['Analytics'],
    }),

    getVolume: builder.query({
      query: (range) => ({ url: '/analytics/volume', params: cleanParams(range) }),
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetMetaQuery,
  useGetTicketsQuery,
  useGetTicketQuery,
  useGetTicketHistoryQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useChangeStatusMutation,
  useAssignTicketMutation,
  useBulkUpdateMutation,
  useDeleteTicketMutation,
  useGetSummaryQuery,
  useGetByStatusQuery,
  useGetByPriorityQuery,
  useGetVolumeQuery,
} = apiSlice;
