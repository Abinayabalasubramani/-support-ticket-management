const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const requestId = require('../src/middleware/requestId');
const streamTickets = require('../src/events/streamTickets');
const { createLoginLimiter } = require('../src/middleware/rateLimiter');
const { signToken } = require('../src/services/auth.service');
const { prisma, resetDb, seedRefs, makeTicket } = require('./helpers/db');
const { api, tokenFor } = require('./helpers/auth');

const PASSWORD = 'Correct#Horse9';
let admin;
let agent;
let noPassword;
let refs;

beforeAll(async () => {
  await resetDb();
  refs = await seedRefs();
  const passwordHash = await bcrypt.hash(PASSWORD, 4); // low cost: tests do not need slow hashing
  admin = await prisma.user.create({ data: { name: 'Ada Admin', email: 'ada@test.example', role: 'ADMIN', passwordHash } });
  agent = await prisma.user.create({ data: { name: 'Alan Agent', email: 'alan@test.example', role: 'AGENT', passwordHash } });
  noPassword = await prisma.user.create({ data: { name: 'No Password', email: 'nopass@test.example' } });
});

afterAll(() => prisma.$disconnect());

const login = (body) => request(app).post('/api/auth/login').send(body);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe('POST /api/auth/login', () => {
  test('correct credentials -> 200 with a token and the user, never the password hash', async () => {
    const res = await login({ email: 'ada@test.example', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: admin.id, name: 'Ada Admin', email: 'ada@test.example', role: 'ADMIN' });
    expect(typeof res.body.token).toBe('string');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  test('the token is a signed JWT for that user with an expiry', async () => {
    const { body } = await login({ email: 'ada@test.example', password: PASSWORD });
    const payload = jwt.verify(body.token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({ sub: String(admin.id), role: 'ADMIN', iss: 'ticketflow-api' });
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  test('email matching ignores case and surrounding spaces', async () => {
    const res = await login({ email: '  ADA@Test.Example ', password: PASSWORD });
    expect(res.status).toBe(200);
  });

  test('wrong password and unknown email give the SAME response (no hint which emails exist)', async () => {
    const wrongPassword = await login({ email: 'ada@test.example', password: 'nope-nope' });
    const unknownEmail = await login({ email: 'ghost@test.example', password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
    expect(wrongPassword.body.error.code).toBe(unknownEmail.body.error.code);
  });

  test('a user with no password set cannot sign in', async () => {
    const res = await login({ email: 'nopass@test.example', password: 'anything' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('a failed login never returns a token', async () => {
    const res = await login({ email: 'ada@test.example', password: 'wrong' });
    expect(res.body.token).toBeUndefined();
  });

  test.each([
    ['missing email', { password: PASSWORD }],
    ['missing password', { email: 'ada@test.example' }],
    ['invalid email', { email: 'not-an-email', password: PASSWORD }],
    ['empty password', { email: 'ada@test.example', password: '' }],
    ['unknown field', { email: 'ada@test.example', password: PASSWORD, role: 'ADMIN' }],
    ['non-string password', { email: 'ada@test.example', password: 12345 }],
  ])('%s -> 400', async (name, body) => {
    const res = await login(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('protected routes', () => {
  const endpoints = [
    ['get', '/api/tickets'],
    ['post', '/api/tickets'],
    ['get', '/api/tickets/1'],
    ['put', '/api/tickets/1'],
    ['patch', '/api/tickets/1/status'],
    ['patch', '/api/tickets/1/assignee'],
    ['patch', '/api/tickets/bulk'],
    ['delete', '/api/tickets/1'],
    ['get', '/api/tickets/1/history'],
    ['get', '/api/tickets/1/activity'],
    ['get', '/api/analytics/summary'],
    ['get', '/api/analytics/by-status'],
    ['get', '/api/analytics/by-priority'],
    ['get', '/api/analytics/volume'],
    ['get', '/api/meta'],
    ['get', '/api/auth/me'],
    ['post', '/api/auth/stream-ticket'],
    ['get', '/api/anything-else'],
  ];

  test.each(endpoints)('%s %s without a token -> 401', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('the health check and the login stay public', async () => {
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400); // reached validation, not blocked
    const health = await request(app).get('/health');
    expect([200, 503]).toContain(health.status); // answered, whatever the database state
  });

  test('a valid token opens the API', async () => {
    const res = await api(tokenFor('AGENT')).get('/api/meta');
    expect(res.status).toBe(200);
  });

  test('the user list the API exposes never contains password hashes', async () => {
    const res = await api().get('/api/meta');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    expect(Object.keys(res.body.users[0]).sort()).toEqual(['email', 'id', 'name']);
  });
});

describe('bad tokens', () => {
  const secret = () => process.env.JWT_SECRET;
  const claims = { role: 'ADMIN' };
  const base = { subject: '1', issuer: 'ticketflow-api' };

  const expectRejected = async (token, code = 'UNAUTHENTICATED') => {
    const res = await request(app).get('/api/meta').set(bearer(token));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(code);
  };

  test('garbage', () => expectRejected('not.a.token'));
  test('an empty bearer', async () => {
    const res = await request(app).get('/api/meta').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });
  test('wrong scheme (Basic instead of Bearer)', async () => {
    const res = await request(app).get('/api/meta').set('Authorization', `Basic ${tokenFor()}`);
    expect(res.status).toBe(401);
  });
  test('the token without the word Bearer', async () => {
    const res = await request(app).get('/api/meta').set('Authorization', tokenFor());
    expect(res.status).toBe(401);
  });
  test('signed with a different secret (forged)', () => expectRejected(jwt.sign(claims, 'x'.repeat(40), { ...base, expiresIn: '1h' })));
  test('expired -> TOKEN_EXPIRED so the app can ask you to sign in again', () =>
    expectRejected(jwt.sign(claims, secret(), { ...base, expiresIn: -60 }), 'TOKEN_EXPIRED'));
  test('"alg: none" tokens are refused', () => expectRejected(jwt.sign(claims, '', { ...base, algorithm: 'none' })));
  test('a different algorithm (HS512) is refused', () => expectRejected(jwt.sign(claims, secret(), { ...base, algorithm: 'HS512', expiresIn: '1h' })));
  test('wrong issuer', () => expectRejected(jwt.sign(claims, secret(), { subject: '1', issuer: 'someone-else', expiresIn: '1h' })));
  test('a role that does not exist', () => expectRejected(jwt.sign({ role: 'SUPERUSER' }, secret(), { ...base, expiresIn: '1h' })));
  test('a non-numeric subject', () => expectRejected(jwt.sign(claims, secret(), { subject: 'abc', issuer: 'ticketflow-api', expiresIn: '1h' })));
  test('a payload that was edited after signing', async () => {
    const [header, , signature] = signToken({ id: 5, role: 'AGENT' }).split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: '5', role: 'ADMIN', iss: 'ticketflow-api' })).toString('base64url');
    await expectRejected(`${header}.${forgedPayload}.${signature}`);
  });
});

describe('GET /api/auth/me', () => {
  test('returns the signed-in user (fresh from the database)', async () => {
    const res = await api(signToken(agent)).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: agent.id, name: 'Alan Agent', email: 'alan@test.example', role: 'AGENT' });
  });

  test('a valid token for a user that no longer exists -> 401', async () => {
    const res = await api(signToken({ id: 999999, role: 'AGENT' })).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('roles', () => {
  test('an agent can create, edit and change status', async () => {
    const asAgent = api(tokenFor('AGENT'));
    const created = await asAgent.post('/api/tickets').send({ title: 'Agent made', description: 'd', categoryId: refs.categories.billing.id });
    expect(created.status).toBe(201);
    expect((await asAgent.put(`/api/tickets/${created.body.id}`).send({ title: 'Edited' })).status).toBe(200);
    expect((await asAgent.patch(`/api/tickets/${created.body.id}/status`).send({ status: 'IN_PROGRESS' })).status).toBe(200);
  });

  test('an agent cannot delete a ticket: 403, and the ticket is still there', async () => {
    const t = await makeTicket({ categoryId: refs.categories.billing.id });
    const res = await api(tokenFor('AGENT')).delete(`/api/tickets/${t.id}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await prisma.ticket.findUnique({ where: { id: t.id } })).not.toBeNull();
  });

  test('an admin can delete a ticket', async () => {
    const t = await makeTicket({ categoryId: refs.categories.billing.id });
    expect((await api(tokenFor('ADMIN')).delete(`/api/tickets/${t.id}`)).status).toBe(204);
  });

  test('the role check comes before anything else: an agent deleting a missing ticket is 403, not 404', async () => {
    expect((await api(tokenFor('AGENT')).delete('/api/tickets/999999')).status).toBe(403);
  });

  test('the role in the token decides, not anything the client sends', async () => {
    const t = await makeTicket({ categoryId: refs.categories.billing.id });
    const res = await api(tokenFor('AGENT')).delete(`/api/tickets/${t.id}?role=ADMIN`).set('X-Role', 'ADMIN');
    expect(res.status).toBe(403);
  });
});

describe('live-update stream tickets', () => {
  const open = (path) =>
    new Promise((resolve, reject) => {
      const address = server.address();
      const req = http.get({ port: address.port, path }, (res) => {
        res.resume();
        resolve({ status: res.statusCode, close: () => req.destroy() });
      });
      req.on('error', reject);
    });

  let server;
  beforeAll(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app).listen(0, resolve);
    });
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  const newTicket = async () => (await api().post('/api/auth/stream-ticket')).body.ticket;

  test('issuing a ticket needs a signed-in user and returns a short expiry', async () => {
    const res = await api().post('/api/auth/stream-ticket');
    expect(res.status).toBe(200);
    expect(res.body.ticket).toMatch(/^[\w-]{20,}$/);
    expect(res.body.expiresInSeconds).toBe(30);
  });

  test('the stream does not open without a ticket', async () => {
    const res = await open('/api/events');
    expect(res.status).toBe(401);
  });

  test('an invented ticket is refused', async () => {
    expect((await open('/api/events?ticket=made-up-ticket')).status).toBe(401);
  });

  test('a real ticket opens the stream, and works only once', async () => {
    const ticket = await newTicket();

    const first = await open(`/api/events?ticket=${ticket}`);
    expect(first.status).toBe(200);
    first.close();

    const second = await open(`/api/events?ticket=${ticket}`);
    expect(second.status).toBe(401);
  });

  test('every ticket is different', async () => {
    expect(await newTicket()).not.toBe(await newTicket());
  });

  test('a ticket expires after 30 seconds', async () => {
    const ticket = await newTicket();
    const realNow = Date.now;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + 31 * 1000);
    try {
      expect(streamTickets.consume(ticket)).toBeNull();
    } finally {
      jest.restoreAllMocks();
    }
  });

  test('the login token itself is not accepted as a stream ticket', async () => {
    expect((await open(`/api/events?ticket=${tokenFor()}`)).status).toBe(401);
  });
});

describe('login attempt limit', () => {
  function loginApp(limit) {
    const small = express();
    small.use(requestId);
    small.use(express.json());
    small.post('/login', createLoginLimiter({ limit, windowMs: 60000 }), (req, res) =>
      req.body.password === 'right' ? res.json({ ok: true }) : res.status(401).json({ error: { code: 'INVALID_CREDENTIALS' } })
    );
    return small;
  }

  test('after too many FAILED attempts further tries get 429, even with the right password', async () => {
    const small = loginApp(3);
    for (let i = 0; i < 3; i++) expect((await request(small).post('/login').send({ password: 'wrong' })).status).toBe(401);

    const blocked = await request(small).post('/login').send({ password: 'right' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_LOGIN_ATTEMPTS');
    expect(blocked.body.error.requestId).toBe(blocked.headers['x-request-id']);
  });

  test('successful logins are not counted, so normal use never locks anyone out', async () => {
    const small = loginApp(2);
    for (let i = 0; i < 6; i++) expect((await request(small).post('/login').send({ password: 'right' })).status).toBe(200);
  });
});
