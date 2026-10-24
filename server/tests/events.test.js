const http = require('http');
const request = require('supertest');
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

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

const newTicket = (status = 'OPEN') => makeTicket({ status, categoryId: refs.categories.billing.id });

// Opens the real event stream over HTTP and lets a test wait for text to arrive.
function openStream() {
  return new Promise((resolve, reject) => {
    const req = http.get({ port, path: '/api/events', headers: { Accept: 'text/event-stream' } }, (res) => {
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

      resolve({ res, waitFor, text: () => buffer, close: () => req.destroy() });
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
      const created = await request(app).post('/api/tickets').send({ title: 'Live one', description: 'd', categoryId: refs.categories.billing.id });

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
      await request(app).delete(`/api/tickets/${t.id}`);
      await Promise.all([a.waitFor('ticket.deleted'), b.waitFor('ticket.deleted')]);
      expect(lastTicketEvent(a.text()).ids).toEqual([t.id]);
      expect(lastTicketEvent(b.text()).ids).toEqual([t.id]);
    } finally {
      a.close();
      b.close();
    }
  });

  test('a closed connection is cleaned up (no leaked listener)', async () => {
    const before = events.subscriberCount();
    const stream = await openStream();
    await stream.waitFor('event: ready');
    expect(events.subscriberCount()).toBe(before + 1);

    stream.close();
    for (let i = 0; i < 40 && events.subscriberCount() > before; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(events.subscriberCount()).toBe(before);
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
    await request(app).patch(`/api/tickets/${t.id}/status`).send({ status: 'IN_PROGRESS' });
    await request(app).put(`/api/tickets/${t.id}`).send({ title: 'New title' });
    await request(app).patch(`/api/tickets/${t.id}/assignee`).send({ assigneeId: refs.users.alice.id });

    expect(received.map((e) => e.type)).toEqual(['ticket.updated', 'ticket.updated', 'ticket.updated']);
    expect(received.every((e) => e.ids[0] === t.id)).toBe(true);
  });

  test('bulk announces one event with only the tickets that actually changed', async () => {
    const ok = await newTicket('OPEN');
    const closed = await newTicket('CLOSED');
    await request(app).patch('/api/tickets/bulk').send({ ids: [ok.id, closed.id, 999999], status: 'RESOLVED' });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ type: 'tickets.bulk', ids: [ok.id] });
  });

  test('a bulk request where nothing changes announces nothing', async () => {
    const closed = await newTicket('CLOSED');
    await request(app).patch('/api/tickets/bulk').send({ ids: [closed.id], status: 'OPEN' });
    expect(received).toHaveLength(0);
  });

  test('failed requests announce nothing', async () => {
    const closed = await newTicket('CLOSED');
    await request(app).patch(`/api/tickets/${closed.id}/status`).send({ status: 'OPEN' }); // 409
    await request(app).post('/api/tickets').send({ description: 'no title' }); // 400
    await request(app).delete('/api/tickets/999999'); // 404
    await request(app).put('/api/tickets/999999').send({ title: 'x' }); // 404
    expect(received).toHaveLength(0);
  });

  test('the event carries the sender X-Client-Id so that tab can ignore it', async () => {
    const t = await newTicket();
    await request(app).patch(`/api/tickets/${t.id}/status`).set('X-Client-Id', 'tab-123').send({ status: 'RESOLVED' });
    expect(received[0].origin).toBe('tab-123');
  });

  test('without the header the origin is null', async () => {
    const t = await newTicket();
    await request(app).patch(`/api/tickets/${t.id}/status`).send({ status: 'RESOLVED' });
    expect(received[0].origin).toBeNull();
  });

  test('event ids increase so clients can resume in order', async () => {
    const t = await newTicket();
    await request(app).patch(`/api/tickets/${t.id}/status`).send({ status: 'IN_PROGRESS' });
    await request(app).patch(`/api/tickets/${t.id}/status`).send({ status: 'RESOLVED' });
    expect(received[1].id).toBeGreaterThan(received[0].id);
  });
});
