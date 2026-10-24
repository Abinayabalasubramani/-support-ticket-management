const request = require('supertest');
const app = require('../src/app');
const { prisma, resetDb, seedRefs, makeTicket } = require('./helpers/db');

let refs;

beforeAll(async () => {
  await resetDb();
  refs = await seedRefs();
});

afterAll(() => prisma.$disconnect());

const body = (overrides = {}) => ({
  title: 'Cannot log in',
  description: 'The login page returns an error',
  categoryId: refs.categories.account.id,
  ...overrides,
});

describe('create', () => {
  test('201 with defaults: status OPEN, priority MEDIUM, unassigned', async () => {
    const res = await request(app).post('/api/tickets').send(body());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Cannot log in',
      status: 'OPEN',
      priority: 'MEDIUM',
      assigneeId: null,
      assignee: null,
    });
    expect(res.body.category.name).toBe('Account');
    expect(res.body.allowedTransitions).toEqual(['IN_PROGRESS', 'RESOLVED']);
    expect(new Date(res.body.createdAt).toString()).not.toBe('Invalid Date');
  });

  test('writes the initial history row (null -> OPEN)', async () => {
    const res = await request(app).post('/api/tickets').send(body());
    const rows = await prisma.statusHistory.findMany({ where: { ticketId: res.body.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ fromStatus: null, toStatus: 'OPEN' });
  });

  test('accepts an explicit priority and assignee', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send(body({ priority: 'CRITICAL', assigneeId: refs.users.alice.id }));
    expect(res.status).toBe(201);
    expect(res.body.priority).toBe('CRITICAL');
    expect(res.body.assignee).toMatchObject({ id: refs.users.alice.id, name: 'Alice Test' });
  });

  test('trims surrounding whitespace from title and description', async () => {
    const res = await request(app).post('/api/tickets').send(body({ title: '  Padded  ', description: '  text  ' }));
    expect(res.body.title).toBe('Padded');
    expect(res.body.description).toBe('text');
  });
});

describe('read', () => {
  test('GET /api/tickets/:id returns the ticket with relations', async () => {
    const t = await makeTicket({ categoryId: refs.categories.billing.id, assigneeId: refs.users.bob.id });
    const res = await request(app).get(`/api/tickets/${t.id}`);
    expect(res.status).toBe(200);
    expect(res.body.category.name).toBe('Billing');
    expect(res.body.assignee.name).toBe('Bob Test');
  });

  test('missing ticket -> 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/tickets/999999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('GET /api/meta returns dropdown data and the transition map', async () => {
    const res = await request(app).get('/api/meta');
    expect(res.status).toBe(200);
    expect(res.body.categories.map((c) => c.name).sort()).toEqual(['Account', 'Billing', 'Technical']);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.statuses).toEqual(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
    expect(res.body.priorities).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    expect(res.body.transitions.CLOSED).toEqual([]);
  });
});

describe('update', () => {
  test('edits title, description, priority and category', async () => {
    const t = await makeTicket({ categoryId: refs.categories.billing.id });
    const res = await request(app).put(`/api/tickets/${t.id}`).send({
      title: 'New title',
      description: 'New description',
      priority: 'HIGH',
      categoryId: refs.categories.technical.id,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'New title', description: 'New description', priority: 'HIGH' });
    expect(res.body.category.name).toBe('Technical');
  });

  test('a partial edit leaves the other fields alone', async () => {
    const t = await makeTicket({ title: 'Keep me', priority: 'LOW', categoryId: refs.categories.billing.id });
    const res = await request(app).put(`/api/tickets/${t.id}`).send({ priority: 'CRITICAL' });
    expect(res.body.title).toBe('Keep me');
    expect(res.body.priority).toBe('CRITICAL');
  });

  test('editing does not change status or history', async () => {
    const t = await makeTicket({ status: 'IN_PROGRESS', categoryId: refs.categories.billing.id });
    await request(app).put(`/api/tickets/${t.id}`).send({ title: 'Edited' });
    const stored = await prisma.ticket.findUnique({ where: { id: t.id } });
    expect(stored.status).toBe('IN_PROGRESS');
    expect(await prisma.statusHistory.count({ where: { ticketId: t.id } })).toBe(1);
  });
});

describe('assignment', () => {
  test('assign, reassign and unassign', async () => {
    const t = await makeTicket({ categoryId: refs.categories.billing.id });
    const url = `/api/tickets/${t.id}/assignee`;

    let res = await request(app).patch(url).send({ assigneeId: refs.users.alice.id });
    expect(res.status).toBe(200);
    expect(res.body.assignee.id).toBe(refs.users.alice.id);

    res = await request(app).patch(url).send({ assigneeId: refs.users.bob.id });
    expect(res.body.assignee.id).toBe(refs.users.bob.id);

    res = await request(app).patch(url).send({ assigneeId: null });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBeNull();
  });

  test('unknown user -> 404 and the ticket is unchanged', async () => {
    const t = await makeTicket({ categoryId: refs.categories.billing.id, assigneeId: refs.users.alice.id });
    const res = await request(app).patch(`/api/tickets/${t.id}/assignee`).send({ assigneeId: 999999 });
    expect(res.status).toBe(404);
    const stored = await prisma.ticket.findUnique({ where: { id: t.id } });
    expect(stored.assigneeId).toBe(refs.users.alice.id);
  });

  test('assigning on a missing ticket -> 404', async () => {
    const res = await request(app).patch('/api/tickets/999999/assignee').send({ assigneeId: refs.users.alice.id });
    expect(res.status).toBe(404);
  });
});

describe('delete', () => {
  test('204, then the ticket and its history are gone', async () => {
    const t = await makeTicket({ categoryId: refs.categories.billing.id });
    expect(await prisma.statusHistory.count({ where: { ticketId: t.id } })).toBe(1);

    const res = await request(app).delete(`/api/tickets/${t.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    expect((await request(app).get(`/api/tickets/${t.id}`)).status).toBe(404);
    expect(await prisma.statusHistory.count({ where: { ticketId: t.id } })).toBe(0);
  });

  test('deleting twice -> second is 404', async () => {
    const t = await makeTicket({ categoryId: refs.categories.billing.id });
    await request(app).delete(`/api/tickets/${t.id}`);
    expect((await request(app).delete(`/api/tickets/${t.id}`)).status).toBe(404);
  });

  test('history of a missing ticket -> 404', async () => {
    expect((await request(app).get('/api/tickets/999999/history')).status).toBe(404);
  });
});
