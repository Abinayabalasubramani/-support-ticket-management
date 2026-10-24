const request = require('supertest');
const app = require('../src/app');
const { prisma, resetDb, seedRefs, makeTicket } = require('./helpers/db');

let refs;
let ticket;

beforeAll(async () => {
  await resetDb();
  refs = await seedRefs();
  ticket = await makeTicket({ categoryId: refs.categories.billing.id });
});

afterAll(() => prisma.$disconnect());

const valid = () => ({
  title: 'Printer is on fire',
  description: 'Smoke is coming out of the printer',
  categoryId: refs.categories.billing.id,
});

const expectValidationError = (res, field) => {
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
  if (field) expect(res.body.error.details.map((d) => d.field)).toContain(field);
};

describe('POST /api/tickets validation', () => {
  test('missing title -> 400 with the field named', async () => {
    const { title, ...body } = valid();
    expectValidationError(await request(app).post('/api/tickets').send(body), 'title');
  });

  test('blank (whitespace-only) title -> 400', async () => {
    expectValidationError(await request(app).post('/api/tickets').send({ ...valid(), title: '   ' }), 'title');
  });

  test('title longer than 200 characters -> 400', async () => {
    expectValidationError(await request(app).post('/api/tickets').send({ ...valid(), title: 'x'.repeat(201) }), 'title');
  });

  test('title of exactly 200 characters is accepted', async () => {
    const res = await request(app).post('/api/tickets').send({ ...valid(), title: 'x'.repeat(200) });
    expect(res.status).toBe(201);
  });

  test('missing description -> 400', async () => {
    const { description, ...body } = valid();
    expectValidationError(await request(app).post('/api/tickets').send(body), 'description');
  });

  test('invalid priority -> 400', async () => {
    expectValidationError(await request(app).post('/api/tickets').send({ ...valid(), priority: 'URGENT' }), 'priority');
  });

  test('missing categoryId -> 400', async () => {
    const { categoryId, ...body } = valid();
    expectValidationError(await request(app).post('/api/tickets').send(body), 'categoryId');
  });

  test('non-numeric categoryId -> 400', async () => {
    expectValidationError(await request(app).post('/api/tickets').send({ ...valid(), categoryId: 'abc' }), 'categoryId');
  });

  test('categoryId above the integer range -> 400 (not a database error)', async () => {
    expectValidationError(await request(app).post('/api/tickets').send({ ...valid(), categoryId: 99999999999 }), 'categoryId');
  });

  test('client cannot set status on create -> 400', async () => {
    expectValidationError(await request(app).post('/api/tickets').send({ ...valid(), status: 'CLOSED' }));
  });

  test('several problems are all reported at once', async () => {
    const res = await request(app).post('/api/tickets').send({ priority: 'NOPE' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
  });

  test('malformed JSON -> 400 INVALID_JSON', async () => {
    const res = await request(app).post('/api/tickets').set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  test('unknown category -> 404', async () => {
    const res = await request(app).post('/api/tickets').send({ ...valid(), categoryId: 999999 });
    expect(res.status).toBe(404);
  });

  test('unknown assignee -> 404', async () => {
    const res = await request(app).post('/api/tickets').send({ ...valid(), assigneeId: 999999 });
    expect(res.status).toBe(404);
  });

  test('a rejected request creates nothing', async () => {
    const before = await prisma.ticket.count();
    await request(app).post('/api/tickets').send({ ...valid(), priority: 'NOPE' });
    await request(app).post('/api/tickets').send({ ...valid(), categoryId: 999999 });
    expect(await prisma.ticket.count()).toBe(before);
  });
});

describe('PUT /api/tickets/:id validation', () => {
  const put = (body) => request(app).put(`/api/tickets/${ticket.id}`).send(body);

  test('empty body -> 400', async () => expectValidationError(await put({})));
  test('empty title -> 400', async () => expectValidationError(await put({ title: '' }), 'title'));
  test('invalid priority -> 400', async () => expectValidationError(await put({ priority: 'SOON' }), 'priority'));
  test('status cannot be edited here -> 400', async () => expectValidationError(await put({ status: 'CLOSED' })));
  test('assignee cannot be edited here -> 400', async () => expectValidationError(await put({ assigneeId: 1 })));

  test('unknown category -> 404', async () => {
    expect((await put({ categoryId: 999999 })).status).toBe(404);
  });

  test('missing ticket -> 404', async () => {
    const res = await request(app).put('/api/tickets/999999').send({ title: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH validation', () => {
  test('status: unknown value -> 400', async () => {
    expectValidationError(await request(app).patch(`/api/tickets/${ticket.id}/status`).send({ status: 'DONE' }), 'status');
  });

  test('status: missing value -> 400', async () => {
    expectValidationError(await request(app).patch(`/api/tickets/${ticket.id}/status`).send({}), 'status');
  });

  test('assignee: missing field -> 400', async () => {
    expectValidationError(await request(app).patch(`/api/tickets/${ticket.id}/assignee`).send({}), 'assigneeId');
  });

  test('assignee: non-numeric -> 400', async () => {
    expectValidationError(await request(app).patch(`/api/tickets/${ticket.id}/assignee`).send({ assigneeId: 'bob' }), 'assigneeId');
  });
});

describe('id parameter', () => {
  test.each(['abc', '0', '-5', '1.5', '99999999999'])('GET /api/tickets/%s -> 400', async (id) => {
    expectValidationError(await request(app).get(`/api/tickets/${id}`), 'id');
  });

  test('unknown route -> 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
