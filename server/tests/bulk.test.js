const { api } = require('./helpers/auth');
const app = require('../src/app');
const { prisma, resetDb, seedRefs, makeTicket } = require('./helpers/db');

let refs;

beforeAll(async () => {
  await resetDb();
  refs = await seedRefs();
});

afterAll(() => prisma.$disconnect());

const bulk = (body) => api().patch('/api/tickets/bulk').send(body);
const newTicket = (status = 'OPEN', extra = {}) => makeTicket({ status, categoryId: refs.categories.billing.id, ...extra });
const statusOf = async (id) => (await prisma.ticket.findUnique({ where: { id } })).status;
const historyOf = (ticketId) => prisma.statusHistory.findMany({ where: { ticketId }, orderBy: { id: 'asc' } });

describe('bulk status change', () => {
  test('updates every ticket and writes one history row each', async () => {
    const [a, b, c] = await Promise.all([newTicket('OPEN'), newTicket('OPEN'), newTicket('IN_PROGRESS')]);

    const res = await bulk({ ids: [a.id, b.id, c.id], status: 'RESOLVED' });

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ requested: 3, succeeded: 3, failed: 0 });
    expect(res.body.results.every((r) => r.ok)).toBe(true);
    for (const t of [a, b, c]) expect(await statusOf(t.id)).toBe('RESOLVED');

    // Each ticket records the status it actually came from, even in one batch.
    expect((await historyOf(a.id)).pop()).toMatchObject({ fromStatus: 'OPEN', toStatus: 'RESOLVED' });
    expect((await historyOf(c.id)).pop()).toMatchObject({ fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED' });
    expect(await historyOf(a.id)).toHaveLength(2);
  });

  test('tickets that cannot make the move are skipped with a reason, the rest are updated', async () => {
    const ok = await newTicket('OPEN');
    const closed = await newTicket('CLOSED');
    const alreadyThere = await newTicket('RESOLVED');

    const res = await bulk({ ids: [ok.id, closed.id, alreadyThere.id], status: 'RESOLVED' });

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ requested: 3, succeeded: 1, failed: 2 });
    expect(res.body.results[0]).toEqual({ id: ok.id, ok: true });
    expect(res.body.results[1]).toMatchObject({ id: closed.id, ok: false, code: 'INVALID_STATUS_TRANSITION' });
    expect(res.body.results[1].message).toMatch(/final/i);
    expect(res.body.results[2]).toMatchObject({ id: alreadyThere.id, ok: false, code: 'INVALID_STATUS_TRANSITION' });

    expect(await statusOf(ok.id)).toBe('RESOLVED');
    expect(await statusOf(closed.id)).toBe('CLOSED'); // untouched
    expect(await historyOf(closed.id)).toHaveLength(1); // no history for a skipped ticket
    expect(await historyOf(alreadyThere.id)).toHaveLength(1);
  });

  test('results come back in the order the ids were sent', async () => {
    const [a, b, c] = await Promise.all([newTicket(), newTicket(), newTicket()]);
    const res = await bulk({ ids: [c.id, a.id, b.id], status: 'IN_PROGRESS' });
    expect(res.body.results.map((r) => r.id)).toEqual([c.id, a.id, b.id]);
  });

  test('a missing ticket is reported as NOT_FOUND and does not block the others', async () => {
    const ok = await newTicket();
    const res = await bulk({ ids: [ok.id, 999999], status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ requested: 2, succeeded: 1, failed: 1 });
    expect(res.body.results[1]).toMatchObject({ id: 999999, ok: false, code: 'NOT_FOUND' });
    expect(await statusOf(ok.id)).toBe('IN_PROGRESS');
  });

  test('when nothing can be updated it is still a 200 with all failures listed', async () => {
    const closed = await newTicket('CLOSED');
    const res = await bulk({ ids: [closed.id], status: 'OPEN' });
    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ requested: 1, succeeded: 0, failed: 1 });
  });

  test('duplicate ids are collapsed', async () => {
    const t = await newTicket();
    const res = await bulk({ ids: [t.id, t.id, t.id], status: 'RESOLVED' });
    expect(res.body.summary).toEqual({ requested: 1, succeeded: 1, failed: 0 });
    expect(await historyOf(t.id)).toHaveLength(2); // created + one change, not three
  });

  test('tickets that were not listed are left alone', async () => {
    const listed = await newTicket();
    const other = await newTicket();
    await bulk({ ids: [listed.id], status: 'RESOLVED' });
    expect(await statusOf(other.id)).toBe('OPEN');
  });

  test('the same transition rules as the single-ticket endpoint apply', async () => {
    // OPEN -> CLOSED is rejected one at a time, so it must be rejected in bulk too.
    const t = await newTicket('OPEN');
    const single = await api().patch(`/api/tickets/${t.id}/status`).send({ status: 'CLOSED' });
    const batch = await bulk({ ids: [t.id], status: 'CLOSED' });
    expect(single.status).toBe(409);
    expect(batch.body.results[0].code).toBe(single.body.error.code);
  });
});

describe('bulk assignment', () => {
  test('assigns every listed ticket and leaves status and history alone', async () => {
    const [a, b] = await Promise.all([newTicket('OPEN'), newTicket('IN_PROGRESS')]);

    const res = await bulk({ ids: [a.id, b.id], assigneeId: refs.users.alice.id });

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ requested: 2, succeeded: 2, failed: 0 });
    for (const t of [a, b]) {
      const stored = await prisma.ticket.findUnique({ where: { id: t.id } });
      expect(stored.assigneeId).toBe(refs.users.alice.id);
    }
    expect(await statusOf(b.id)).toBe('IN_PROGRESS');
    expect(await historyOf(b.id)).toHaveLength(1);
  });

  test('assigneeId null unassigns', async () => {
    const t = await newTicket('OPEN', { assigneeId: refs.users.bob.id });
    const res = await bulk({ ids: [t.id], assigneeId: null });
    expect(res.body.summary.succeeded).toBe(1);
    expect((await prisma.ticket.findUnique({ where: { id: t.id } })).assigneeId).toBeNull();
  });

  test('assignment also works on closed tickets (same as the single endpoint)', async () => {
    const t = await newTicket('CLOSED');
    const res = await bulk({ ids: [t.id], assigneeId: refs.users.bob.id });
    expect(res.body.summary.succeeded).toBe(1);
  });

  test('unknown assignee -> 404 and nothing changes', async () => {
    const t = await newTicket('OPEN', { assigneeId: refs.users.alice.id });
    const res = await bulk({ ids: [t.id], assigneeId: 999999 });
    expect(res.status).toBe(404);
    expect((await prisma.ticket.findUnique({ where: { id: t.id } })).assigneeId).toBe(refs.users.alice.id);
  });

  test('a missing ticket is reported while the others are assigned', async () => {
    const t = await newTicket();
    const res = await bulk({ ids: [t.id, 999999], assigneeId: refs.users.alice.id });
    expect(res.body.summary).toEqual({ requested: 2, succeeded: 1, failed: 1 });
    expect(res.body.results[1].code).toBe('NOT_FOUND');
  });
});

describe('bulk validation', () => {
  const expectInvalid = (res) => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  };

  test('empty ids list -> 400', async () => expectInvalid(await bulk({ ids: [], status: 'RESOLVED' })));
  test('missing ids -> 400', async () => expectInvalid(await bulk({ status: 'RESOLVED' })));
  test('ids that are not an array -> 400', async () => expectInvalid(await bulk({ ids: 5, status: 'RESOLVED' })));
  test('non-numeric id -> 400', async () => expectInvalid(await bulk({ ids: ['abc'], status: 'RESOLVED' })));
  test('negative id -> 400', async () => expectInvalid(await bulk({ ids: [-1], status: 'RESOLVED' })));

  test('more than 100 ids -> 400', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    expectInvalid(await bulk({ ids, status: 'RESOLVED' }));
  });

  test('exactly 100 ids is accepted', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => i + 900000);
    const res = await bulk({ ids, status: 'RESOLVED' });
    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ requested: 100, succeeded: 0, failed: 100 });
  });

  test('neither status nor assigneeId -> 400', async () => expectInvalid(await bulk({ ids: [1] })));
  test('both status and assigneeId -> 400', async () => expectInvalid(await bulk({ ids: [1], status: 'RESOLVED', assigneeId: 1 })));
  test('unknown status -> 400', async () => expectInvalid(await bulk({ ids: [1], status: 'DONE' })));
  test('unknown field -> 400', async () => expectInvalid(await bulk({ ids: [1], status: 'RESOLVED', priority: 'LOW' })));

  test('/bulk is not mistaken for a ticket id', async () => {
    const res = await api().get('/api/tickets/bulk');
    expect(res.status).toBe(400); // GET /:id with id "bulk"
    expect(res.body.error.details[0].field).toBe('id');
  });
});
