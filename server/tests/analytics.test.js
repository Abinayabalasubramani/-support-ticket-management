const request = require('supertest');
const app = require('../src/app');
const { prisma, resetDb } = require('./helpers/db');
const { seedListFixtures } = require('./helpers/fixtures');

afterAll(() => prisma.$disconnect());

const get = (path) => request(app).get(path);
const asMap = (rows, key) => Object.fromEntries(rows.map((r) => [r[key], r.count]));

describe('with fixture data', () => {
  beforeAll(async () => {
    await seedListFixtures();
  });

  test('summary counts come from the database', async () => {
    const res = await get('/api/analytics/summary');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 10, open: 4, resolved: 2, critical: 2 });
  });

  test('by-status lists every status in workflow order', async () => {
    const res = await get('/api/analytics/by-status');
    expect(res.body.map((r) => r.status)).toEqual(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
    expect(asMap(res.body, 'status')).toEqual({ OPEN: 4, IN_PROGRESS: 3, RESOLVED: 2, CLOSED: 1 });
  });

  test('by-priority lists every priority from LOW to CRITICAL', async () => {
    const res = await get('/api/analytics/by-priority');
    expect(res.body.map((r) => r.priority)).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    expect(asMap(res.body, 'priority')).toEqual({ LOW: 3, MEDIUM: 2, HIGH: 3, CRITICAL: 2 });
  });

  test('summary and charts agree with the ticket list', async () => {
    const [summary, list] = await Promise.all([get('/api/analytics/summary'), get('/api/tickets?limit=100')]);
    expect(summary.body.total).toBe(list.body.meta.total);
  });

  describe('date range (on creation date)', () => {
    test('from: includes that day and later', async () => {
      const res = await get('/api/analytics/summary?from=2026-01-07'); // t6..t10
      expect(res.body).toEqual({ total: 5, open: 2, resolved: 1, critical: 1 });
    });

    test('to: includes the whole of that day', async () => {
      const res = await get('/api/analytics/summary?to=2026-01-03'); // t1, t2 (t2 created 12:00 on Jan 3)
      expect(res.body.total).toBe(2);
    });

    test('from = to covers exactly one day', async () => {
      const res = await get('/api/analytics/summary?from=2026-01-03&to=2026-01-03'); // t2
      expect(res.body).toEqual({ total: 1, open: 1, resolved: 0, critical: 1 });
    });

    test('by-status honours the range', async () => {
      const res = await get('/api/analytics/by-status?from=2026-01-07');
      expect(asMap(res.body, 'status')).toEqual({ OPEN: 2, IN_PROGRESS: 1, RESOLVED: 1, CLOSED: 1 });
    });

    test('by-priority honours the range', async () => {
      const res = await get('/api/analytics/by-priority?from=2026-01-03&to=2026-01-03');
      expect(asMap(res.body, 'priority')).toEqual({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 1 });
    });

    test('a range with no tickets gives zeros, and charts still list every category', async () => {
      const summary = await get('/api/analytics/summary?from=2030-01-01');
      expect(summary.body).toEqual({ total: 0, open: 0, resolved: 0, critical: 0 });
      const byStatus = await get('/api/analytics/by-status?from=2030-01-01');
      expect(byStatus.body).toHaveLength(4);
      expect(byStatus.body.every((r) => r.count === 0)).toBe(true);
    });

    test('full ISO timestamps are accepted', async () => {
      const res = await get('/api/analytics/summary?from=2026-01-07T00:00:00.000Z');
      expect(res.body.total).toBe(5);
    });

    test('blank from/to are ignored', async () => {
      const res = await get('/api/analytics/summary?from=&to=');
      expect(res.body.total).toBe(10);
    });

    test.each([
      ['from after to', 'from=2026-12-31&to=2026-01-01'],
      ['not a date', 'from=yesterday'],
      ['bare number', 'from=5'],
      ['impossible date', 'to=2026-13-45'],
    ])('%s -> 400', async (name, query) => {
      for (const endpoint of ['summary', 'by-status', 'by-priority']) {
        const res = await get(`/api/analytics/${endpoint}?${query}`);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});

describe('with an empty database', () => {
  beforeAll(resetDb);

  test('summary is all zeros', async () => {
    const res = await get('/api/analytics/summary');
    expect(res.body).toEqual({ total: 0, open: 0, resolved: 0, critical: 0 });
  });

  test('charts still list every status and priority', async () => {
    expect((await get('/api/analytics/by-status')).body).toHaveLength(4);
    expect((await get('/api/analytics/by-priority')).body).toHaveLength(4);
  });
});
