import { createSlice } from '@reduxjs/toolkit';

// Which ticket form is open. The form lives in the layout, so the top-bar button,
// the table and the detail page can all open it.
//   null            -> closed
//   { ticket: null } -> create form
//   { ticket: {...} } -> edit form for that ticket
const uiSlice = createSlice({
  name: 'ui',
  initialState: { ticketForm: null },
  reducers: {
    openCreateForm(state) {
      state.ticketForm = { ticket: null };
    },
    openEditForm(state, { payload }) {
      state.ticketForm = { ticket: payload };
    },
    closeTicketForm(state) {
      state.ticketForm = null;
    },
  },
});

export const { openCreateForm, openEditForm, closeTicketForm } = uiSlice.actions;
export const selectTicketForm = (state) => state.ui.ticketForm;
export default uiSlice.reducer;
