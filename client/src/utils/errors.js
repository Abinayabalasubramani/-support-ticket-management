// Turns any RTK Query error into a message a person can act on.
export function getErrorMessage(error) {
  if (!error) return '';

  // The API's own error shape: { error: { code, message, details } }
  const apiMessage = error.data?.error?.message;
  if (apiMessage) return apiMessage;

  if (error.status === 'FETCH_ERROR') {
    return 'Cannot reach the server. If it was idle, it may be waking up (up to a minute). Please retry.';
  }
  if (error.status === 'PARSING_ERROR') return 'The server sent an unexpected response.';
  if (error.status === 'TIMEOUT_ERROR') return 'The request took too long. Please retry.';
  if (typeof error.status === 'number' && error.status >= 500) return 'Something went wrong on the server.';

  return 'Something went wrong. Please try again.';
}

// The id the server attached to this failure (also in its logs), shown so a user can quote it.
export const getErrorRef = (error) => error?.data?.error?.requestId ?? '';

// Field-level validation messages from a 400 response: { fieldName: 'message' }
export function getFieldErrors(error) {
  const details = error?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.filter((d) => d.location === 'body').map((d) => [d.field, d.message]));
}
