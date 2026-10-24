import { createSlice } from '@reduxjs/toolkit';
import { isTokenExpired } from './token';

const STORAGE_KEY = 'tf.auth';

// The session survives a page reload (and is shared by tabs) by living in localStorage.
// localStorage can be blocked or empty, so every access is guarded.
function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.token && saved?.user && !isTokenExpired(saved.token)) return saved;
  } catch {
    /* no saved session */
  }
  return { token: null, user: null };
}

export function saveSession({ token, user }) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: the session just lasts until the tab closes */
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: { ...loadSession(), expired: false },
  reducers: {
    signedIn(state, { payload: { token, user } }) {
      state.token = token;
      state.user = user;
      state.expired = false;
    },
    // expired: true shows "your session expired" on the login page instead of a silent redirect
    signedOut(state, { payload } = {}) {
      state.token = null;
      state.user = null;
      state.expired = Boolean(payload?.expired);
    },
  },
});

export const { signedIn, signedOut } = authSlice.actions;

export const selectToken = (state) => state.auth.token;
export const selectUser = (state) => state.auth.user;
export const selectIsAdmin = (state) => state.auth.user?.role === 'ADMIN';
export const selectSessionExpired = (state) => state.auth.expired;

export default authSlice.reducer;
