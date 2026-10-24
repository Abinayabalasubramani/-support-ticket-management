const request = require('supertest');
const app = require('../src/app');
const { prisma, resetDb, seedRefs, makeTicket } = require('./helpers/db');

let refs;

beforeAll(async () => {
  await resetDb();
  refs = await seedRefs();
});

afterAll(() => prisma.$disconnect());

const newTicket = (extra = {}) => makeTicket({ categoryId: refs.categories.billing.id, ...extra });
const activityRows = (ticketId) => prisma.ticketActivity.findMany({ where: { ticketId }, orderBy: { id: 'asc' } });
const feed = async (id) => (await request(app).get(`/api/tickets/${id}/activity`)).body;
const assign = (id, assigneeId) => request(app).patch(`/api/tickets/${id}/assignee`).send({ assigneeId });
const edit = (id, body) => request(app).put(`/api/tickets/${id}`).send(body);

describe('assignee changes are logged', () => {
  test('first assignment: from nobody to a person, with the name as it was then', async () => {
    const t = await newTicket();
    await assign(t.id, refs.users.alice.id);

    const [row] = await activityRows(t.id);
    expect(row.type).toBe('ASSIGNEE_CHANGED');
    expect(row.details).toEqual({ from: null, to: { id: refs.users.alice.id, name: 'Alice Test' } });
  });

  test('reassigning records who it moved from and to', async () => {
    const t = await newTicket({ assigneeId: refs.users.alice.id });
    await assign(t.id, refs.users.bob.id);

    const [row] = await activityRows(t.id);
    expect(row.details).toEqual({
      from: { id: refs.users.alice.id, name: 'Alice Test' },
      to: { id: refs.users.bob.id, name: 'Bob Test' },
    });
  });

  test('unassigning records who it was taken from', async () => {
    const t = await newTicket({ assigneeId: refs.users.bob.id });
    await assign(t.id, null);

    const [row] = await activityRows(t.id);
    expect(row.details).toEqual({ from: { id: refs.users.bob.id, name: 'Bob Test' }, to: null });
  });

  test('assigning the same person again logs nothing', async () => {
    const t = await newTicket({ assigneeId: refs.users.alice.id });
    const res = await assign(t.id, refs.users.alice.id);
    expect(res.status).toBe(200);
    expect(await activityRows(t.id)).toHaveLength(0);
  });

  test('unassigning an unassigned ticket logs nothing', async () => {
    const t = await newTicket();
    await assign(t.id, null);
    expect(await activityRows(t.id)).toHaveLength(0);
  });

  test('a failed assignment (unknown user) logs nothing', async () => {
    const t = await newTicket();
    const res = await assign(t.id, 999999);
    expect(res.status).toBe(404);
    expect(await activityRows(t.id)).toHaveLength(0);
  });
});

describe('edits are logged', () => {
  test('only the fields that really changed are recorded, with old and new values', async () => {
    const t = await newTicket({ title: 'Old title', priority: 'LOW' });
    await edit(t.id, { title: 'New title', priority: 'LOW', description: t.description });

    const [row] = await activityRows(t.id);
    expect(row.type).toBe('TICKET_EDITED');
    expect(row.details.changes).toEqual([{ field: 'title', from: 'Old title', to: 'New title' }]);
  });

  test('priority and category changes show readable values (category by name)', async () => {
    const t = await newTicket({ priority: 'LOW' });
    await edit(t.id, { priority: 'CRITICAL', categoryId: refs.categories.technical.id });

    const [row] = await activityRows(t.id);
    expect(row.details.changes).toEqual(
      expect.arrayContaining([
        { field: 'priority', from: 'LOW', to: 'CRITICAL' },
        { field: 'category', from: 'Billing', to: 'Technical' },
      ])
    );
    expect(row.details.changes).toHaveLength(2);
  });

  test('a description change is noted without copying the text', async () => {
    const t = await newTicket({ description: 'A very long original description' });
    await edit(t.id, { description: 'Completely different text' });

    const [row] = await activityRows(t.id);
    expect(row.details.changes).toEqual([{ field: 'description' }]);
    expect(JSON.stringify(row.details)).not.toMatch(/original|different/);
  });

  test('saving with no real change logs nothing and leaves the ticket as it was', async () => {
    const t = await newTicket({ title: 'Same', priority: 'HIGH' });
    const res = await edit(t.id, { title: 'Same', priority: 'HIGH' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Same');
    expect(await activityRows(t.id)).toHaveLength(0);
  });

  test('one edit with several changes is one entry', async () => {
    const t = await newTicket({ title: 'A', priority: 'LOW' });
    await edit(t.id, { title: 'B', priority: 'HIGH' });
    expect(await activityRows(t.id)).toHaveLength(1);
  });

  test('a rejected edit (validation or unknown category) logs nothing', async () => {
    const t = await newTicket();
    await edit(t.id, { title: '' }); // 400
    await edit(t.id, { categoryId: 999999 }); // 404
    expect(await activityRows(t.id)).toHaveLength(0);
  });
});

describe('bulk assignment is logged per ticket', () => {
  test('each changed ticket gets an entry with its own previous assignee', async () => {
    const fromAlice = await newTicket({ assigneeId: refs.users.alice.id });
    const unassigned = await newTicket();

    await request(app).patch('/api/tickets/bulk').send({ ids: [fromAlice.id, unassigned.id], assigneeId: refs.users.bob.id });

    const [a] = await activityRows(fromAlice.id);
    const [b] = await activityRows(unassigned.id);
    expect(a.details).toEqual({ from: { id: refs.users.alice.id, name: 'Alice Test' }, to: { id: refs.users.bob.id, name: 'Bob Test' } });
    expect(b.details).toEqual({ from: null, to: { id: refs.users.bob.id, name: 'Bob Test' } });
  });

  test('tickets that already have that assignee are fine but get no entry', async () => {
    const already = await newTicket({ assigneeId: refs.users.bob.id });
    const other = await newTicket();

    const res = await request(app).patch('/api/tickets/bulk').send({ ids: [already.id, other.id], assigneeId: refs.users.bob.id });

    expect(res.body.summary).toEqual({ requested: 2, succeeded: 2, failed: 0 });
    expect(await activityRows(already.id)).toHaveLength(0);
    expect(await activityRows(other.id)).toHaveLength(1);
  });

  test('bulk unassign records who each ticket was taken from', async () => {
    const t = await newTicket({ assigneeId: refs.users.alice.id });
    await request(app).patch('/api/tickets/bulk').send({ ids: [t.id], assigneeId: null });
    const [row] = await activityRows(t.id);
    expect(row.details).toEqual({ from: { id: refs.users.alice.id, name: 'Alice Test' }, to: null });
  });

  test('bulk status changes do not create activity entries (they live in the status history)', async () => {
    const t = await newTicket();
    await request(app).patch('/api/tickets/bulk').send({ ids: [t.id], status: 'RESOLVED' });
    expect(await activityRows(t.id)).toHaveLength(0);
  });
});

describe('GET /api/tickets/:id/activity', () => {
  test('merges status changes, assignments and edits, newest first', async () => {
    const t = await newTicket({ title: 'Original' }); // created as OPEN
    await request(app).patch(`/api/tickets/${t.id}/status`).send({ status: 'IN_PROGRESS' });
    await assign(t.id, refs.users.alice.id);
    await edit(t.id, { title: 'Renamed' });
    await request(app).patch(`/api/tickets/${t.id}/status`).send({ status: 'RESOLVED' });

    const res = await request(app).get(`/api/tickets/${t.id}/activity`);

    expect(res.status).toBe(200);
    expect(res.body.map((e) => e.kind)).toEqual(['status', 'edit', 'assignee', 'status', 'status']);

    const [resolved, renamed, assigned, started, created] = res.body;
    expect(resolved).toMatchObject({ fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED' });
    expect(renamed.changes).toEqual([{ field: 'title', from: 'Original', to: 'Renamed' }]);
    expect(assigned).toMatchObject({ from: null, to: { name: 'Alice Test' } });
    expect(started).toMatchObject({ fromStatus: 'OPEN', toStatus: 'IN_PROGRESS' });
    expect(created).toMatchObject({ fromStatus: null, toStatus: 'OPEN' });
  });

  test('entries are in non-increasing time order and have unique ids', async () => {
    const t = await newTicket();
    await assign(t.id, refs.users.alice.id);
    await edit(t.id, { priority: 'HIGH' });
    await request(app).patch(`/api/tickets/${t.id}/status`).send({ status: 'RESOLVED' });

    const entries = await feed(t.id);
    const times = entries.map((e) => new Date(e.at).getTime());
    expect(times).toEqual([...times].sort((x, y) => y - x));
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  test('a ticket with no updates still shows its creation', async () => {
    const t = await newTicket();
    const entries = await feed(t.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: 'status', fromStatus: null, toStatus: 'OPEN' });
  });

  test('the status-only history endpoint is unchanged', async () => {
    const t = await newTicket();
    await assign(t.id, refs.users.alice.id);
    const res = await request(app).get(`/api/tickets/${t.id}/history`);
    expect(res.body).toHaveLength(1); // only the status change, no assignment
    expect(res.body[0]).toHaveProperty('toStatus', 'OPEN');
  });

  test('a missing ticket -> 404, a malformed id -> 400', async () => {
    expect((await request(app).get('/api/tickets/999999/activity')).status).toBe(404);
    expect((await request(app).get('/api/tickets/abc/activity')).status).toBe(400);
  });

  test('the log keeps the name it had at the time, even if the person is later deleted', async () => {
    const temp = await prisma.user.create({ data: { name: 'Temp Person', email: 'temp@test.example' } });
    const t = await newTicket();
    await assign(t.id, temp.id);

    await prisma.user.delete({ where: { id: temp.id } });

    const entries = await feed(t.id);
    const assignment = entries.find((e) => e.kind === 'assignee');
    expect(assignment.to.name).toBe('Temp Person');
  });

  test('deleting a ticket removes its activity', async () => {
    const t = await newTicket();
    await assign(t.id, refs.users.alice.id);
    expect(await activityRows(t.id)).toHaveLength(1);

    await request(app).delete(`/api/tickets/${t.id}`);
    expect(await activityRows(t.id)).toHaveLength(0);
  });
});
