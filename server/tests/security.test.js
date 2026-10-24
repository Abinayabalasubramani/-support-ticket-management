const express = require('express');
const request = require('supertest');
const app = require('../src/app');
const requestId = require('../src/middleware/requestId');
const { createLimiters } = require('../src/middleware/rateLimiter');
const { prisma } = require('./helpers/db');
const { api } = require('./helpers/auth');

afterAll(() => prisma.$disconnect());

describe('security headers', () => {
  test('responses carry the standard protective headers', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  test('the server does not announce that it runs Express', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('the API stays readable from the other origin it is called from (CORS)', async () => {
    const res = await request(app).get('/api/nope').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['access-control-expose-headers']).toMatch(/X-Request-Id/i);
  });

  test('an origin that is not allowed gets no CORS permission', async () => {
    const res = await request(app).get('/api/nope').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

// The real limits are switched off under test, so these use a small app with tiny limits.
describe('rate limiting', () => {
  function limitedApp({ general = 100, writes = 100 } = {}) {
    const small = express();
    small.use(requestId);
    const limiters = createLimiters({ generalPerMinute: general, writesPerMinute: writes, skip: (req) => req.path === '/events' });
    small.use('/api', limiters.general, limiters.writes);
    small.all('/api/anything', (req, res) => res.json({ ok: true }));
    small.get('/api/events', (req, res) => res.json({ stream: true }));
    return small;
  }

  test('requests over the limit get 429 with the standard error body and a request id', async () => {
    const small = limitedApp({ general: 3 });
    for (let i = 0; i < 3; i++) expect((await request(small).get('/api/anything')).status).toBe(200);

    const res = await request(small).get('/api/anything');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.body.error.message).toMatch(/too many requests/i);
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  test('clients are told how much allowance is left', async () => {
    const res = await request(limitedApp({ general: 10 })).get('/api/anything');
    expect(res.headers['ratelimit']).toBeDefined();
    expect(res.headers['ratelimit-policy']).toBeDefined();
  });

  test('writes have their own stricter limit; reads are not counted against it', async () => {
    const small = limitedApp({ general: 100, writes: 2 });
    for (let i = 0; i < 10; i++) expect((await request(small).get('/api/anything')).status).toBe(200);

    expect((await request(small).post('/api/anything')).status).toBe(200);
    expect((await request(small).patch('/api/anything')).status).toBe(200);
    expect((await request(small).delete('/api/anything')).status).toBe(429);
    expect((await request(small).get('/api/anything')).status).toBe(200); // reads still fine
  });

  test('the live event stream is never limited', async () => {
    const small = limitedApp({ general: 1 });
    for (let i = 0; i < 5; i++) expect((await request(small).get('/api/events')).status).toBe(200);
  });

  test('the real app does not limit during tests', async () => {
    for (let i = 0; i < 5; i++) expect((await api().get('/api/nope')).status).toBe(404);
  });
});
