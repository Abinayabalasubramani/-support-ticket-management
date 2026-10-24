const http = require('http');
const { api } = require('./helpers/auth');
const app = require('../src/app');
const events = require('../src/events/ticketEvents');
const { prisma, resetDb, seedRefs, makeTicket } = require('./helpers/db');

let refs;
let server;
let port;

beforeAll(async () => {
  await resetDb();
  refs = await seedRefs();
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, resolve);
  });
  port = server.address().port;
});

// Every stream a test opens is tracked and closed afterwards, even when an assertion failed,
// because an open event stream keeps the HTTP server (and Jest) from shutting down.
const openStreams = [];
afterEach(() => openStreams.splice(0).forEach((stream) => stream.close()));

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Polls until the condition is true (a closed connection is noticed a moment later).
async function until(condition, ms = 5000) {
  const end = Date.now() + ms;
  while (!condition() && Date.now() < end) await sleep(50);
}

const newTicket = (status = 'OPEN') => makeTicket({ status, categoryId: refs.categories.billing.id });

// Opens the real event stream over HTTP (with a fresh single-use ticket, as the browser does)
// and lets a test wait for text to arrive.
async function openStream() {
  const { body } = await api().post('/api/auth/stream-ticket');
  return new Promise((resolve, reject) => {
    const req = http.get({ port, path: `/api/events?ticket=${body.ticket}`, headers: { Accept: 'text/event-stream' } }, (res) => {
      let buffer = '';
      const waiters = [];
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        waiters.slice().forEach((check) => check());
      });

      const waitFor = (text, ms = 15000) =>
        new Promise((ok, fail) => {
          let timer;
          const check = () => {
            if (buffer.includes(text)) {
              cleanup();
              ok(buffer);
            }
          };
          const cleanup = () => {
            clearTimeout(timer);
            const i = waiters.indexOf(check);
            if (i >= 0) waiters.splice(i, 1);
          };
          timer = setTimeout(() => {
            cleanup();
            fail(new Error(`Timed out waiting for "${text}". Received so far: ${buffer}`));
          }, ms);
          waiters.push(check);
          check();
        });

      const stream = { res, waitFor, text: () => buffer, close: () => req.destroy() };
      openStreams.push(stream);
      resolve(stream);
    });
    req.on('error', reject);
  });
}

// The last "ticket" event in the stream text, parsed.
function lastTicketEvent(text) {
  const blocks = text.split('\n\n').filter((b) => b.includes('event: ticket'));
  const data = blocks[blocks.length - 1].split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(data.slice(6));
}

describe('event stream', () => {
  test('responds as an event stream and announces it is ready', async () => {
    const stream = await openStream();
    try {
      expect(stream.res.statusCode).toBe(200);
      expect(stream.res.headers['content-type']).toMatch(/text\/event-stream/);
      expect(stream.res.headers['cache-control']).toMatch(/no-cache/);
      await stream.waitFor('event: ready');
      expect(stream.text()).toMatch(/retry: 3000/);
    } finally {
      stream.close();
    }
  });

  test('a created ticket is announced to a connected client', async () => {
    const stream = await openStream();
    try {
      await stream.waitFor('event: ready');
      const created = await api().post('/api/tickets').send({ title: 'Live one', description: 'd', categoryId: refs.categories.billing.id });

      await stream.waitFor('ticket.created');
      const event = lastTicketEvent(stream.text());
      expect(event).toMatchObject({ type: 'ticket.created', ids: [created.body.id] });
      expect(event.at).toBeTruthy();
    } finally {
      stream.close();
    }
  });

  test('every connected client receives the same event', async () => {
    const [a, b] = await Promise.all([openStream(), openStream()]);
    try {
      await Promise.all([a.waitFor('event: ready'), b.waitFor('event: ready')]);
      const t = await newTicket();
      await api().delete(`/api/tickets/${t.id}`);
      await Promise.all([a.waitFor('ticket.deleted'), b.waitFor('ticket.deleted')]);
      expect(lastTicketEvent(a.text()).ids).toEqual([t.id]);
      expect(lastTicketEvent(b.text()).ids).toEqual([t.id]);
    } finally {
      a.close();
      b.close();
    }
  });

  test('a closed connection is cleaned up (no leaked listener)', async () => {
    // Streams from earlier tests may still be shutting down: start from a settled zero.
    await until(() => events.subscriberCount() === 0);
    expect(events.subscriberCount()).toBe(0);

    const stream = await openStream();
    await stream.waitFor('event: ready');
    expect(events.subscriberCount()).toBe(1);

    stream.close();
    await until(() => events.subscriberCount() === 0);
    expect(events.subscriberCount()).toBe(0);
  });
});

describe('what gets announced', () => {
  let received;
  let unsubscribe;

  beforeEach(() => {
    received = [];
    unsubscribe = events.subscribe((event) => received.push(event));
  });
  afterEach(() => unsubscribe());

  test('status change, edit and assignment announce ticket.updated with the id', async () => {
    const t = await newTicket();
    await api().patch(`/api/tickets/${t.id}/status`).send({ status: 'IN_PROGRESS' });
    await api().put(`/api/tickets/${t.id}`).send({ title: 'New title' });
    await api().patch(`/api/tickets/${t.id}/assignee`).send({ assigneeId: refs.users.alice.id });

    expect(received.map((e) => e.type)).toEqual(['ticket.updated', 'ticket.updated', 'ticket.updated']);
    expect(received.every((e) => e.ids[0] === t.id)).toBe(true);
  });

  test('bulk announces one event with only the tickets that actually changed', async () => {
    const ok = await newTicket('OPEN');
    const closed = await newTicket('CLOSED');
    await api().patch('/api/tickets/bulk').send({ ids: [ok.id, closed.id, 999999], status: 'RESOLVED' });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ type: 'tickets.bulk', ids: [ok.id] });
  });

  test('a bulk request where nothing changes announces nothing', async () => {
    const closed = await newTicket('CLOSED');
    await api().patch('/api/tickets/bulk').send({ ids: [closed.id], status: 'OPEN' });
    expect(received).toHaveLength(0);
  });

  test('failed requests announce nothing', async () => {
    const closed = await newTicket('CLOSED');
    await api().patch(`/api/tickets/${closed.id}/status`).send({ status: 'OPEN' }); // 409
    await api().post('/api/tickets').send({ description: 'no title' }); // 400
    await api().delete('/api/tickets/999999'); // 404
    await api().put('/api/tickets/999999').send({ title: 'x' }); // 404
    expect(received).toHaveLength(0);
  });

  test('the event carries the sender X-Client-Id so that tab can ignore it', async () => {
    const t = await newTicket();
    await api().patch(`/api/tickets/${t.id}/status`).set('X-Client-Id', 'tab-123').send({ status: 'RESOLVED' });
    expect(received[0].origin).toBe('tab-123');
  });

  test('without the header the origin is null', async () => {
    const t = await newTicket();
    await api().patch(`/api/tickets/${t.id}/status`).send({ status: 'RESOLVED' });
    expect(received[0].origin).toBeNull();
  });

  test('event ids increase so clients can resume in order', async () => {
    const t = await newTicket();
    await api().patch(`/api/tickets/${t.id}/status`).send({ status: 'IN_PROGRESS' });
    await api().patch(`/api/tickets/${t.id}/status`).send({ status: 'RESOLVED' });
    expect(received[1].id).toBeGreaterThan(received[0].id);
  });
});
