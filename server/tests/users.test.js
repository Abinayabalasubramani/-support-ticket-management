const request = require('supertest');
const app = require('../src/app');
const events = require('../src/events/ticketEvents');
const { prisma, resetDb, seedRefs, makeTicket } = require('./helpers/db');
const { api, tokenFor } = require('./helpers/auth');

const asAdmin = () => api(tokenFor('ADMIN'));
const asAgent = () => api(tokenFor('AGENT', 2));

const valid = (overrides = {}) => ({
  name: 'Nora New',
  email: 'nora.new@test.example',
  role: 'AGENT',
  password: 'Welcome#2026',
  ...overrides,
});

let refs;

beforeAll(async () => {
  await resetDb();
  refs = await seedRefs();
});

afterAll(() => prisma.$disconnect());

describe('access', () => {
  test('without a token both endpoints are 401', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
    expect((await request(app).post('/api/users').send(valid())).status).toBe(401);
  });

  test('an agent cannot list or create users: 403', async () => {
    const list = await asAgent().get('/api/users');
    const create = await asAgent().post('/api/users').send(valid({ email: 'blocked@test.example' }));
    expect(list.status).toBe(403);
    expect(create.status).toBe(403);
    expect(create.body.error.code).toBe('FORBIDDEN');
    expect(await prisma.user.findUnique({ where: { email: 'blocked@test.example' } })).toBeNull();
  });

  test('the role check comes before validation: an agent sending garbage still gets 403', async () => {
    expect((await asAgent().post('/api/users').send({})).status).toBe(403);
  });
});

describe('GET /api/users', () => {
  test('lists the team with roles and ticket counts, never password hashes', async () => {
    const [alice] = await Promise.all([prisma.user.findUnique({ where: { email: 'alice@test.example' } })]);
    await makeTicket({ categoryId: refs.categories.billing.id, assigneeId: alice.id });
    await makeTicket({ categoryId: refs.categories.billing.id, assigneeId: alice.id });

    const res = await asAdmin().get('/api/users');

    expect(res.status).toBe(200);
    const row = res.body.find((u) => u.email === 'alice@test.example');
    expect(row).toEqual({ id: alice.id, name: 'Alice Test', email: 'alice@test.example', role: 'AGENT', assignedTickets: 2 });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  test('is sorted by name', async () => {
    const names = (await asAdmin().get('/api/users')).body.map((u) => u.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('POST /api/users', () => {
  test('creates a user: 201, no password in the response, hash stored in the database', async () => {
    const res = await asAdmin().post('/api/users').send(valid());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), name: 'Nora New', email: 'nora.new@test.example', role: 'AGENT', assignedTickets: 0 });
    expect(JSON.stringify(res.body)).not.toMatch(/password|Welcome#2026|\$2[aby]\$/i);

    const stored = await prisma.user.findUnique({ where: { id: res.body.id } });
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored.passwordHash).not.toContain('Welcome#2026');
  });

  test('the new user can sign in with that password, and not with another', async () => {
    await asAdmin().post('/api/users').send(valid({ email: 'login.check@test.example', password: 'First#Pass99' }));

    const ok = await request(app).post('/api/auth/login').send({ email: 'login.check@test.example', password: 'First#Pass99' });
    const bad = await request(app).post('/api/auth/login').send({ email: 'login.check@test.example', password: 'Wrong#Pass99' });

    expect(ok.status).toBe(200);
    expect(ok.body.user).toMatchObject({ email: 'login.check@test.example', role: 'AGENT' });
    expect(bad.status).toBe(401);
  });

  test('the role is applied: an admin-created ADMIN gets admin rights', async () => {
    await asAdmin().post('/api/users').send(valid({ email: 'new.admin@test.example', role: 'ADMIN' }));
    const login = await request(app).post('/api/auth/login').send({ email: 'new.admin@test.example', password: 'Welcome#2026' });
    expect(login.body.user.role).toBe('ADMIN');

    const t = await makeTicket({ categoryId: refs.categories.billing.id });
    expect((await api(login.body.token).delete(`/api/tickets/${t.id}`)).status).toBe(204);
  });

  test('role defaults to AGENT', async () => {
    const { role, ...withoutRole } = valid({ email: 'default.role@test.example' });
    const res = await asAdmin().post('/api/users').send(withoutRole);
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('AGENT');
  });

  test('the email is stored in lower case with spaces trimmed', async () => {
    const res = await asAdmin().post('/api/users').send(valid({ email: '  Mixed.Case@Test.Example ' }));
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('mixed.case@test.example');
  });

  test('a duplicate email is 409 DUPLICATE_EMAIL, also in a different letter case', async () => {
    await asAdmin().post('/api/users').send(valid({ email: 'dup@test.example' }));
    const same = await asAdmin().post('/api/users').send(valid({ email: 'dup@test.example' }));
    const upper = await asAdmin().post('/api/users').send(valid({ email: 'DUP@test.example' }));

    expect(same.status).toBe(409);
    expect(same.body.error.code).toBe('DUPLICATE_EMAIL');
    expect(upper.status).toBe(409);
    expect(await prisma.user.count({ where: { email: 'dup@test.example' } })).toBe(1);
  });

  test('two simultaneous requests for the same email: exactly one wins', async () => {
    const [a, b] = await Promise.all([
      asAdmin().post('/api/users').send(valid({ email: 'race@test.example' })),
      asAdmin().post('/api/users').send(valid({ email: 'race@test.example' })),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });

  test.each([
    ['missing name', { name: undefined }, 'name'],
    ['blank name', { name: '   ' }, 'name'],
    ['name over 100 characters', { name: 'x'.repeat(101) }, 'name'],
    ['missing email', { email: undefined }, 'email'],
    ['invalid email', { email: 'not-an-email' }, 'email'],
    ['missing password', { password: undefined }, 'password'],
    ['password of 7 characters', { password: 'Abc#123' }, 'password'],
    ['password that is mostly spaces', { password: '  a       ' }, 'password'],
    ['password over 72 bytes', { password: 'a'.repeat(73) }, 'password'],
    ['unknown role', { role: 'SUPERUSER' }, 'role'],
  ])('%s -> 400 naming the field', async (name, overrides, field) => {
    const res = await asAdmin().post('/api/users').send(valid(overrides));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });

  test('a password of exactly 8 characters and one of exactly 72 bytes are accepted', async () => {
    expect((await asAdmin().post('/api/users').send(valid({ email: 'eight@test.example', password: 'Abcd#123' }))).status).toBe(201);
    expect((await asAdmin().post('/api/users').send(valid({ email: 'long@test.example', password: 'a'.repeat(72) }))).status).toBe(201);
  });

  test('unknown fields are refused (a client cannot set the id or a hash)', async () => {
    const res = await asAdmin().post('/api/users').send({ ...valid({ email: 'extra@test.example' }), passwordHash: 'x', id: 999 });
    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email: 'extra@test.example' } })).toBeNull();
  });

  test('a rejected request creates nothing', async () => {
    const before = await prisma.user.count();
    await asAdmin().post('/api/users').send(valid({ email: 'bad', password: 'x' }));
    expect(await prisma.user.count()).toBe(before);
  });
});

describe('the new user in the rest of the app', () => {
  test('appears in /api/meta (assignee lists) and can be assigned a ticket', async () => {
    const created = (await asAdmin().post('/api/users').send(valid({ email: 'assignable@test.example' }))).body;

    const meta = await asAdmin().get('/api/meta');
    expect(meta.body.users.map((u) => u.id)).toContain(created.id);

    const t = await makeTicket({ categoryId: refs.categories.billing.id });
    const assigned = await asAgent().patch(`/api/tickets/${t.id}/assignee`).send({ assigneeId: created.id });
    expect(assigned.status).toBe(200);
    expect(assigned.body.assignee.email).toBe('assignable@test.example');
  });

  test('creating a user announces user.created so other sessions refresh their lists', async () => {
    const received = [];
    const unsubscribe = events.subscribe((event) => received.push(event));
    try {
      const res = await asAdmin().post('/api/users').send(valid({ email: 'announce@test.example' })).set('X-Client-Id', 'tab-1');
      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({ type: 'user.created', ids: [res.body.id], origin: 'tab-1' });
    } finally {
      unsubscribe();
    }
  });

  test('a failed creation announces nothing', async () => {
    const received = [];
    const unsubscribe = events.subscribe((event) => received.push(event));
    try {
      await asAdmin().post('/api/users').send(valid({ email: 'bad-email' }));
      expect(received).toHaveLength(0);
    } finally {
      unsubscribe();
    }
  });
});
