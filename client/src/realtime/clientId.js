// Identifies this browser tab. It is sent with every request (X-Client-Id) and echoed back
// in the change events, so a tab can recognise, and skip, the events for its own changes.
const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const CLIENT_ID = randomId();
