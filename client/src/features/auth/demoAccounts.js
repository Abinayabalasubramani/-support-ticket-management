// Demo sign-ins created by `npm run db:seed` in the server (also listed in the README).
// The login page hides them by default, as a real deployment would; set
// VITE_SHOW_DEMO_LOGIN=true to show a "Demo accounts" box (handy for local development).
export const SHOW_DEMO_LOGIN = import.meta.env.VITE_SHOW_DEMO_LOGIN === 'true';

export const DEMO_PASSWORD = 'Demo@12345';

export const DEMO_ACCOUNTS = [
  { label: 'Admin', name: 'Aarav Mehta', email: 'aarav.mehta@example.com', hint: 'Can also delete tickets' },
  { label: 'Agent', name: 'Priya Nair', email: 'priya.nair@example.com', hint: 'Cannot delete tickets' },
];
