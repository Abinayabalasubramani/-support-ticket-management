const { randomBytes } = require('crypto');

// The browser's EventSource cannot send an Authorization header, and putting the login token
// in the URL would leak it into server logs. So a signed-in client first asks for a
// short-lived, single-use ticket and opens the stream with that instead.
// Tickets live in memory, which is right for a single server instance.
const TTL_MS = 30 * 1000;
const MAX_TICKETS = 10000;

const tickets = new Map(); // ticket -> { userId, expires }

function prune(now) {
  for (const [ticket, { expires }] of tickets) if (expires <= now) tickets.delete(ticket);
  // Never grow without bound: drop the oldest if someone keeps asking.
  while (tickets.size >= MAX_TICKETS) tickets.delete(tickets.keys().next().value);
}

function issue(userId) {
  const now = Date.now();
  prune(now);
  const ticket = randomBytes(24).toString('base64url');
  tickets.set(ticket, { userId, expires: now + TTL_MS });
  return ticket;
}

// Returns the user id once, or null if the ticket is unknown, already used or expired.
function consume(ticket) {
  const entry = tickets.get(ticket);
  tickets.delete(ticket);
  return entry && entry.expires > Date.now() ? entry.userId : null;
}

module.exports = { issue, consume, TTL_SECONDS: TTL_MS / 1000 };
