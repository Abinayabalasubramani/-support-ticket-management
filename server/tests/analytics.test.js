const { api } = require('./helpers/auth');
const app = require('../src/app');
const { prisma, resetDb } = require('./helpers/db');
const { seedListFixtures } = require('./helpers/fixtures');

afterAll(() => prisma.$disconnect());

const get = (path) => api().get(path);
const asMap = (rows, key) => Object.fromEntries(rows.map((r) => [r[key], r.count]));

describe('with fixture data', () => {
  beforeAll(async () => {
    await seedListFixtures();
  });

  test('summary counts come from the database', async () => {
    const res = await get('/api/analytics/summary');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 10, open: 4, resolved: 2, critical: 2, criticalUnresolved: 2 });
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
      expect(res.body).toEqual({ total: 5, open: 2, resolved: 1, critical: 1, criticalUnresolved: 1 });
    });

    test('to: includes the whole of that day', async () => {
      const res = await get('/api/analytics/summary?to=2026-01-03'); // t1, t2 (t2 created 12:00 on Jan 3)
      expect(res.body.total).toBe(2);
    });

    test('from = to covers exactly one day', async () => {
      const res = await get('/api/analytics/summary?from=2026-01-03&to=2026-01-03'); // t2
      expect(res.body).toEqual({ total: 1, open: 1, resolved: 0, critical: 1, criticalUnresolved: 1 });
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
      expect(summary.body).toEqual({ total: 0, open: 0, resolved: 0, critical: 0, criticalUnresolved: 0 });
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
      for (const endpoint of ['summary', 'by-status', 'by-priority', 'volume']) {
        const res = await get(`/api/analytics/${endpoint}?${query}`);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});

describe('volume (new tickets per day)', () => {
  const sum = (rows) => rows.reduce((total, r) => total + r.count, 0);
  const today = () => new Date().toISOString().slice(0, 10);

  beforeAll(async () => {
    await seedListFixtures(); // one ticket on each of 2026-01-02 .. 2026-01-11
  });

  test('has one entry per day in the range, zeros included, oldest first', async () => {
    const res = await get('/api/analytics/volume?from=2026-01-01&to=2026-01-12');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(12);
    expect(res.body[0]).toEqual({ date: '2026-01-01', count: 0 });
    expect(res.body[1]).toEqual({ date: '2026-01-02', count: 1 });
    expect(res.body[10]).toEqual({ date: '2026-01-11', count: 1 });
    expect(res.body[11]).toEqual({ date: '2026-01-12', count: 0 });
    expect(sum(res.body)).toBe(10);
  });

  test('a narrow range returns only those days', async () => {
    const res = await get('/api/analytics/volume?from=2026-01-05&to=2026-01-07');
    expect(res.body).toEqual([
      { date: '2026-01-05', count: 1 },
      { date: '2026-01-06', count: 1 },
      { date: '2026-01-07', count: 1 },
    ]);
  });

  test('multiple tickets on one day are added together', async () => {
    const { makeTicket } = require('./helpers/db');
    const category = await prisma.category.findFirst();
    await makeTicket({ categoryId: category.id, createdAt: new Date('2026-01-05T20:00:00Z') });
    const res = await get('/api/analytics/volume?from=2026-01-05&to=2026-01-05');
    expect(res.body).toEqual([{ date: '2026-01-05', count: 2 }]);
  });

  test('without a range it starts at the first ticket and ends today', async () => {
    const res = await get('/api/analytics/volume');
    expect(res.body[0].date).toBe('2026-01-02');
    expect(res.body[res.body.length - 1].date).toBe(today());
    expect(sum(res.body)).toBe(11); // 10 fixtures + the one added above
  });

  test('a range with no tickets still lists every day with 0', async () => {
    const res = await get('/api/analytics/volume?from=2030-01-01&to=2030-01-03');
    expect(res.body).toEqual([
      { date: '2030-01-01', count: 0 },
      { date: '2030-01-02', count: 0 },
      { date: '2030-01-03', count: 0 },
    ]);
  });

  test('very long ranges are capped at 366 days, keeping the most recent', async () => {
    const res = await get('/api/analytics/volume?from=2000-01-01&to=2026-01-12');
    expect(res.body).toHaveLength(366);
    expect(res.body[res.body.length - 1].date).toBe('2026-01-12');
  });
});

describe('with an empty database', () => {
  beforeAll(resetDb);

  test('summary is all zeros', async () => {
    const res = await get('/api/analytics/summary');
    expect(res.body).toEqual({ total: 0, open: 0, resolved: 0, critical: 0, criticalUnresolved: 0 });
  });

  test('volume without a range is empty', async () => {
    const res = await get('/api/analytics/volume');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('charts still list every status and priority', async () => {
    expect((await get('/api/analytics/by-status')).body).toHaveLength(4);
    expect((await get('/api/analytics/by-priority')).body).toHaveLength(4);
  });
});
