const request = require('supertest');
const { Prisma } = require('@prisma/client');
const app = require('../src/app');
const { prisma } = require('./helpers/db');

// These tests make the database "fail" on purpose (no real database call is made),
// to prove clients never see internal details.

afterEach(() => jest.restoreAllMocks());
afterAll(() => prisma.$disconnect());

const silenceLogs = () => jest.spyOn(console, 'error').mockImplementation(() => {});

describe('unexpected failures', () => {
  test('database unreachable -> 503 with a friendly message and no internals', async () => {
    const log = silenceLogs();
    const secret = "Can't reach database server at `ep-secret-host-pooler.neon.tech:5432`";
    jest.spyOn(prisma, '$transaction').mockRejectedValue(new Prisma.PrismaClientInitializationError(secret, '6.0.0', 'P1001'));

    const res = await request(app).get('/api/tickets');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(res.body.error.message).toMatch(/temporarily unavailable/i);
    expect(JSON.stringify(res.body)).not.toMatch(/ep-secret-host|5432|prisma|neon/i);
    expect(log).toHaveBeenCalled(); // the real reason is logged for us
  });

  test('a database timeout code is also a 503', async () => {
    silenceLogs();
    jest.spyOn(prisma, '$transaction').mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Timed out fetching a connection', { code: 'P2024', clientVersion: '6.0.0' }));
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
  });

  test('an unknown error -> 500 with a generic message, never the real one', async () => {
    const log = silenceLogs();
    jest.spyOn(prisma, '$transaction').mockRejectedValue(new Error('SELECT * FROM secret_table failed in C:\\app\\src\\thing.js'));

    const res = await request(app).get('/api/tickets');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/secret_table|C:\\|thing\.js|SELECT/i);
    // ...but the real error is in the server log
    expect(log.mock.calls[0][0]).toMatch(/secret_table/);
  });

  test('the failure log is one JSON line carrying the request id', async () => {
    const log = silenceLogs();
    jest.spyOn(prisma, '$transaction').mockRejectedValue(new Error('boom'));

    const res = await request(app).get('/api/tickets');

    const entry = JSON.parse(log.mock.calls[0][0]);
    expect(entry).toMatchObject({ level: 'error', message: 'boom', method: 'GET', path: '/api/tickets' });
    expect(entry.requestId).toBe(res.body.error.requestId);
  });
});

describe('request ids', () => {
  test('every response carries an X-Request-Id header', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('error bodies include the same id as the header', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  test('validation errors also include it', async () => {
    const res = await request(app).get('/api/tickets/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  test('two requests get different ids', async () => {
    const [a, b] = await Promise.all([request(app).get('/api/nope'), request(app).get('/api/nope')]);
    expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
  });
});

describe('oversized and malformed bodies', () => {
  test('a body over the JSON limit -> 413', async () => {
    const res = await request(app).post('/api/tickets').send({ title: 'x'.repeat(200 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
