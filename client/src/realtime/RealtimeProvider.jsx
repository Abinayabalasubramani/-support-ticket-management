import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { apiSlice, baseUrl } from '../api/apiSlice';
import { useToast } from '../components/common/Toast';
import { CLIENT_ID } from './clientId';

const RealtimeContext = createContext({ status: 'connecting' });

const BATCH_MS = 300;

// What to tell the user about changes made elsewhere (one message per batch).
function describe(events) {
  if (events.length > 1) return `${events.length} tickets were changed by someone else`;
  const [{ type, ids }] = events;
  if (type === 'ticket.created') return `A new ticket (#${ids[0]}) was added by someone else`;
  if (type === 'ticket.deleted') return `Ticket #${ids[0]} was deleted by someone else`;
  if (type === 'tickets.bulk') return `${ids.length} ticket${ids.length === 1 ? '' : 's'} updated by someone else`;
  return `Ticket #${ids[0]} was updated by someone else`;
}

// Keeps one Server-Sent Events connection open and turns "a ticket changed somewhere else"
// into a refresh of exactly the cached data that is affected. Status is 'connecting', 'live'
// or 'offline'.
export function RealtimeProvider({ children }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      setStatus('offline');
      return undefined;
    }

    let pendingEvents = [];
    let timer = null;
    let wasDown = false;

    // Many events in a short burst (a bulk update) trigger one refresh and one message, not many.
    const flush = () => {
      timer = null;
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

    const source = new EventSource(`${baseUrl}/events`);

    // Sent by the server on every (re)connection.
    source.addEventListener('ready', () => {
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
      pendingEvents.push(event);
      if (!timer) timer = setTimeout(flush, BATCH_MS);
    });

    // The browser reconnects by itself (after the server's `retry` delay).
    source.onerror = () => {
      wasDown = true;
      setStatus(source.readyState === EventSource.CLOSED ? 'offline' : 'connecting');
    };

    return () => {
      clearTimeout(timer);
      source.close();
    };
  }, [dispatch, toast]);

  const value = useMemo(() => ({ status }), [status]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
