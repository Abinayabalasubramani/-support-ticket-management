// Demo sign-ins created by `npm run db:seed` in the server (also listed in the README).
// They are shown on the login page so a reviewer can try the app; set
// VITE_SHOW_DEMO_LOGIN=false to hide them in a real deployment.
export const SHOW_DEMO_LOGIN = import.meta.env.VITE_SHOW_DEMO_LOGIN !== 'false';

export const DEMO_PASSWORD = 'Demo@12345';

export const DEMO_ACCOUNTS = [
  { label: 'Admin', name: 'Aarav Mehta', email: 'aarav.mehta@example.com', hint: 'Can also delete tickets' },
  { label: 'Agent', name: 'Priya Nair', email: 'priya.nair@example.com', hint: 'Cannot delete tickets' },
];
