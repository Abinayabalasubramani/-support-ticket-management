const { api } = require('./helpers/auth');
const app = require('../src/app');
const { prisma, resetDb, seedRefs, makeTicket } = require('./helpers/db');

let refs;

beforeAll(async () => {
  await resetDb();
  refs = await seedRefs();
});

afterAll(() => prisma.$disconnect());

const newTicket = (status) => makeTicket({ status, categoryId: refs.categories.billing.id });
const changeStatus = (id, status) => api().patch(`/api/tickets/${id}/status`).send({ status });
const historyRows = (ticketId) => prisma.statusHistory.findMany({ where: { ticketId }, orderBy: { id: 'asc' } });

// Written out by hand (not imported from the app) so the test checks the rules independently.
const CASES = [
  // from,         to,            allowed
  ['OPEN', 'IN_PROGRESS', true],
  ['OPEN', 'RESOLVED', true],
  ['OPEN', 'CLOSED', false],
  ['OPEN', 'OPEN', false],
  ['IN_PROGRESS', 'OPEN', true],
  ['IN_PROGRESS', 'RESOLVED', true],
  ['IN_PROGRESS', 'CLOSED', false],
  ['IN_PROGRESS', 'IN_PROGRESS', false],
  ['RESOLVED', 'CLOSED', true],
  ['RESOLVED', 'IN_PROGRESS', true],
  ['RESOLVED', 'OPEN', false],
  ['RESOLVED', 'RESOLVED', false],
  ['CLOSED', 'OPEN', false],
  ['CLOSED', 'IN_PROGRESS', false],
  ['CLOSED', 'RESOLVED', false],
  ['CLOSED', 'CLOSED', false],
];

describe('status transition rules (all 16 combinations)', () => {
  test.each(CASES)('%s -> %s', async (from, to, allowed) => {
    const ticket = await newTicket(from);
    const before = await historyRows(ticket.id);

    const res = await changeStatus(ticket.id, to);
    const after = await historyRows(ticket.id);
    const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });

    if (allowed) {
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(to);
      expect(stored.status).toBe(to);
      expect(after).toHaveLength(before.length + 1);
      expect(after[after.length - 1]).toMatchObject({ fromStatus: from, toStatus: to });
    } else {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(stored.status).toBe(from); // unchanged
      expect(after).toHaveLength(before.length); // no history written
    }
  });
});

describe('status change behaviour', () => {
  test('the error message names the allowed next statuses', async () => {
    const ticket = await newTicket('OPEN');
    const res = await changeStatus(ticket.id, 'CLOSED');
    expect(res.body.error.message).toMatch(/IN_PROGRESS/);
    expect(res.body.error.message).toMatch(/RESOLVED/);
  });

  test('a CLOSED ticket reports that it is final', async () => {
    const ticket = await newTicket('CLOSED');
    const res = await changeStatus(ticket.id, 'OPEN');
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/final/i);
  });

  test('response includes allowedTransitions for the new status', async () => {
    const ticket = await newTicket('OPEN');
    const res = await changeStatus(ticket.id, 'IN_PROGRESS');
    expect(res.body.allowedTransitions).toEqual(['OPEN', 'RESOLVED']);
  });

  test('a full lifecycle is recorded step by step, newest first in the API', async () => {
    const created = await api().post('/api/tickets').send({
      title: 'Lifecycle',
      description: 'Goes through every status',
      categoryId: refs.categories.technical.id,
    });
    const id = created.body.id;

    for (const status of ['IN_PROGRESS', 'RESOLVED', 'CLOSED']) {
      expect((await changeStatus(id, status)).status).toBe(200);
    }

    const history = await api().get(`/api/tickets/${id}/history`);
    expect(history.status).toBe(200);
    expect(history.body.map((h) => [h.fromStatus, h.toStatus])).toEqual([
      ['RESOLVED', 'CLOSED'],
      ['IN_PROGRESS', 'RESOLVED'],
      ['OPEN', 'IN_PROGRESS'],
      [null, 'OPEN'],
    ]);
    history.body.forEach((h) => expect(new Date(h.changedAt).toString()).not.toBe('Invalid Date'));
  });

  test('a resolved ticket can be reopened to IN_PROGRESS', async () => {
    const ticket = await newTicket('RESOLVED');
    expect((await changeStatus(ticket.id, 'IN_PROGRESS')).status).toBe(200);
  });

  test('missing ticket -> 404 and nothing is written', async () => {
    const before = await prisma.statusHistory.count();
    const res = await changeStatus(999999, 'IN_PROGRESS');
    expect(res.status).toBe(404);
    expect(await prisma.statusHistory.count()).toBe(before);
  });

  test('two simultaneous identical changes: exactly one wins, one history row added', async () => {
    const ticket = await newTicket('OPEN');
    const [a, b] = await Promise.all([changeStatus(ticket.id, 'RESOLVED'), changeStatus(ticket.id, 'RESOLVED')]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const rows = await historyRows(ticket.id);
    expect(rows).toHaveLength(2); // initial OPEN + one RESOLVED
  });

  test('a failed transition does not touch updatedAt', async () => {
    const ticket = await newTicket('OPEN');
    await changeStatus(ticket.id, 'CLOSED');
    const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(stored.updatedAt.getTime()).toBe(ticket.updatedAt.getTime());
  });
});
