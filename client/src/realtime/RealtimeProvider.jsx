import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { apiSlice, baseUrl } from '../api/apiSlice';
import { useToast } from '../components/common/Toast';
import { selectToken } from '../features/auth/authSlice';
import { CLIENT_ID } from './clientId';

const RealtimeContext = createContext({ status: 'connecting' });

const BATCH_MS = 300;
const MAX_RETRY_MS = 30000;

// What to tell the user about changes made elsewhere (one message per batch).
function describe(events) {
  if (events.length > 1) return `${events.length} tickets were changed by someone else`;
  const [{ type, ids }] = events;
  if (type === 'ticket.created') return `A new ticket (#${ids[0]}) was added by someone else`;
  if (type === 'ticket.deleted') return `Ticket #${ids[0]} was deleted by someone else`;
  if (type === 'tickets.bulk') return `${ids.length} ticket${ids.length === 1 ? '' : 's'} updated by someone else`;
  return `Ticket #${ids[0]} was updated by someone else`;
}

// While a user is signed in, keeps one Server-Sent Events connection open and turns "a ticket
// changed somewhere else" into a refresh of exactly the cached data that is affected.
// Status is 'connecting', 'live' or 'offline'.
//
// The browser's EventSource cannot send a login header, so each connection starts with a
// one-time ticket. A ticket can only be used once, so after a drop we do the reconnecting
// ourselves (a fresh ticket each time, with growing delays) instead of relying on the browser.
export function RealtimeProvider({ children }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const token = useSelector(selectToken);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (!token || typeof EventSource === 'undefined') return undefined;

    let source = null;
    let retryTimer = null;
    let batchTimer = null;
    let cancelled = false;
    let attempt = 0;
    let wasDown = false;
    let pendingEvents = [];

    // Many events in a short burst (a bulk update) trigger one refresh and one message, not many.
    const flush = () => {
      batchTimer = null;
      const batch = pendingEvents;
      pendingEvents = [];
      const ids = [...new Set(batch.flatMap((e) => e.ids))];
      toast.success(describe(batch));
      dispatch(
        apiSlice.util.invalidateTags([
          { type: 'Ticket', id: 'LIST' },
          ...ids.map((id) => ({ type: 'Ticket', id })),
          ...ids.map((id) => ({ type: 'History', id })),
          'Analytics',
        ])
      );
    };

    const scheduleRetry = () => {
      if (cancelled) return;
      attempt += 1;
      retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempt, MAX_RETRY_MS));
    };

    async function connect() {
      try {
        const { ticket } = await dispatch(apiSlice.endpoints.getStreamTicket.initiate()).unwrap();
        if (cancelled) return;

        source = new EventSource(`${baseUrl}/events?ticket=${encodeURIComponent(ticket)}`);

        // Sent by the server on every (re)connection.
        source.addEventListener('ready', () => {
          attempt = 0;
          setStatus('live');
          if (wasDown) {
            // Events may have been missed while disconnected: refresh everything.
            wasDown = false;
            dispatch(apiSlice.util.invalidateTags(['Ticket', 'History', 'Analytics']));
          }
        });

        source.addEventListener('ticket', (message) => {
          const event = JSON.parse(message.data);
          if (event.origin === CLIENT_ID) return; // our own change: the mutation already refreshed the data
          if (event.type === 'user.created') {
            // A new team member: refresh the assignee lists and the team page, quietly.
            dispatch(apiSlice.util.invalidateTags(['Meta', 'User']));
            return;
          }
          pendingEvents.push(event);
          if (!batchTimer) batchTimer = setTimeout(flush, BATCH_MS);
        });

        source.onerror = () => {
          source.close();
          wasDown = true;
          setStatus('connecting');
          scheduleRetry();
        };
      } catch {
        // No ticket (server unreachable, or the session ended and the sign-out is under way).
        wasDown = true;
        setStatus('offline');
        scheduleRetry();
      }
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearTimeout(batchTimer);
      source?.close();
      setStatus('connecting');
    };
  }, [token, dispatch, toast]);

  const value = useMemo(() => ({ status }), [status]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
