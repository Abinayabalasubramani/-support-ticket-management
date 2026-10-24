// Reads the expiry time ("exp", seconds since 1970) out of a login token so the app can tell
// that a session has run out without asking the server. This does not verify the token
// (only the server can): it is just a convenience to avoid showing a screen that will fail.
export function tokenExpiresAt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt === null || expiresAt <= Date.now();
}
