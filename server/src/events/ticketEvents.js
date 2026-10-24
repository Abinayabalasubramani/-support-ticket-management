const { EventEmitter } = require('events');

// In-process event hub: controllers publish "something changed", every open event stream
// receives it. Events carry ids only; browsers refetch the data through the normal API.
// This is correct for a single server instance. With several instances this would move to
// Redis pub/sub or Postgres LISTEN/NOTIFY.
const emitter = new EventEmitter();
emitter.setMaxListeners(0); // one listener per open browser tab

let sequence = 0;

// event: { type, ids, origin }
//   type   'ticket.created' | 'ticket.updated' | 'ticket.deleted' | 'tickets.bulk'
//   origin the X-Client-Id of the tab that made the change, so that tab can ignore it
function publish(event) {
  sequence += 1;
  emitter.emit('ticket', { id: sequence, at: new Date().toISOString(), ...event });
}

function subscribe(listener) {
  emitter.on('ticket', listener);
  return () => emitter.off('ticket', listener);
}

const subscriberCount = () => emitter.listenerCount('ticket');

module.exports = { publish, subscribe, subscriberCount };
