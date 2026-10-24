import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../api/apiSlice';
import authReducer, { saveSession, signedIn, signedOut } from '../features/auth/authSlice';
import filtersReducer from '../features/filters/filtersSlice';
import uiReducer from '../features/ui/uiSlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    filters: filtersReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
});

// Signing in or out in one tab updates the others (the browser fires "storage" in the other tabs).
window.addEventListener('storage', (event) => {
  if (event.key !== 'tf.auth') return;
  try {
    const session = event.newValue ? JSON.parse(event.newValue) : null;
    if (session?.token) store.dispatch(signedIn(session));
    else {
      store.dispatch(signedOut());
      store.dispatch(apiSlice.util.resetApiState());
    }
  } catch {
    /* ignore a malformed value */
  }
});

// Keep localStorage in step with the session (reducers stay free of side effects).
let lastToken = store.getState().auth.token;
store.subscribe(() => {
  const { token, user } = store.getState().auth;
  if (token !== lastToken) {
    lastToken = token;
    saveSession({ token, user });
  }
});
