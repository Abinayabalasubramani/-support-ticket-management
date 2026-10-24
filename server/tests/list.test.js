const { api } = require('./helpers/auth');
const app = require('../src/app');
const { prisma } = require('./helpers/db');
const { seedListFixtures } = require('./helpers/fixtures');

let refs;
let t;

beforeAll(async () => {
  ({ refs, t } = await seedListFixtures());
});

afterAll(() => prisma.$disconnect());

const list = (query = '') => api().get(`/api/tickets${query ? `?${query}` : ''}`);
const idsOf = (res) => res.body.data.map((x) => x.id).sort((a, b) => a - b);
const expectIds = (res, ...tickets) => {
  expect(res.status).toBe(200);
  expect(idsOf(res)).toEqual(tickets.map((x) => x.id).sort((a, b) => a - b));
  expect(res.body.meta.total).toBe(tickets.length);
};

describe('response shape and defaults', () => {
  test('returns data and pagination meta', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 10, totalPages: 1 });
    expect(res.body.data).toHaveLength(10);
    expect(res.body.data[0]).toHaveProperty('category');
    expect(res.body.data[0]).toHaveProperty('allowedTransitions');
  });

  test('default order is newest first', async () => {
    const res = await list();
    expect(res.body.data[0].id).toBe(t.t10.id);
    expect(res.body.data[9].id).toBe(t.t1.id);
  });
});

describe('pagination', () => {
  test('limit and page slice the results', async () => {
    const p1 = await list('limit=3&page=1');
    const p2 = await list('limit=3&page=2');
    const p4 = await list('limit=3&page=4');
    expect(p1.body.data.map((x) => x.id)).toEqual([t.t10.id, t.t9.id, t.t8.id]);
    expect(p2.body.data.map((x) => x.id)).toEqual([t.t7.id, t.t6.id, t.t5.id]);
    expect(p4.body.data.map((x) => x.id)).toEqual([t.t1.id]);
    expect(p1.body.meta).toEqual({ page: 1, limit: 3, total: 10, totalPages: 4 });
  });

  test('walking every page returns each ticket exactly once', async () => {
    const seen = [];
    for (let page = 1; page <= 4; page++) {
      seen.push(...(await list(`limit=3&page=${page}`)).body.data.map((x) => x.id));
    }
    expect(seen).toHaveLength(10);
    expect(new Set(seen).size).toBe(10);
  });

  test('a page beyond the last is empty but still reports the real totals', async () => {
    const res = await list('limit=3&page=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ page: 5, limit: 3, total: 10, totalPages: 4 });
  });

  test('an exact multiple of limit has no extra empty page', async () => {
    const res = await list('limit=5');
    expect(res.body.meta.totalPages).toBe(2);
  });

  test.each([
    ['page=0'],
    ['page=-1'],
    ['page=abc'],
    ['limit=0'],
    ['limit=101'],
    ['limit=abc'],
  ])('%s -> 400', async (query) => {
    const res = await list(query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('limit=100 (the maximum) is accepted', async () => {
    expect((await list('limit=100')).status).toBe(200);
  });
});

describe('sorting', () => {
  test('createdAt ascending is oldest first', async () => {
    const res = await list('sortBy=createdAt&order=asc');
    expect(res.body.data[0].id).toBe(t.t1.id);
    expect(res.body.data[9].id).toBe(t.t10.id);
  });

  test('title ascending is alphabetical', async () => {
    const res = await list('sortBy=title&order=asc&limit=3');
    expect(res.body.data.map((x) => x.title)).toEqual(['Billing address update', 'Cannot login after password change', 'Dark mode request']);
  });

  test('priority descending puts CRITICAL first and LOW last', async () => {
    const res = await list('sortBy=priority&order=desc');
    const priorities = res.body.data.map((x) => x.priority);
    expect(priorities.slice(0, 2)).toEqual(['CRITICAL', 'CRITICAL']);
    expect(priorities.slice(-3)).toEqual(['LOW', 'LOW', 'LOW']);
  });

  test('sorting by a column with ties is stable across pages', async () => {
    const seen = [];
    for (let page = 1; page <= 4; page++) {
      seen.push(...(await list(`sortBy=priority&order=desc&limit=3&page=${page}`)).body.data.map((x) => x.id));
    }
    expect(new Set(seen).size).toBe(10);
  });

  test.each(['sortBy=password', 'sortBy=id;DROP TABLE', 'order=sideways'])('%s -> 400', async (query) => {
    expect((await list(query)).status).toBe(400);
  });
});

describe('single filters', () => {
  test('status', async () => expectIds(await list('status=OPEN'), t.t1, t.t2, t.t7, t.t8));
  test('several statuses are OR-ed', async () =>
    expectIds(await list('status=OPEN,IN_PROGRESS'), t.t1, t.t2, t.t7, t.t8, t.t3, t.t5, t.t10));
  test('priority', async () => expectIds(await list('priority=CRITICAL'), t.t2, t.t8));
  test('several priorities are OR-ed', async () =>
    expectIds(await list('priority=HIGH,CRITICAL'), t.t1, t.t2, t.t5, t.t8, t.t10));
  test('category', async () =>
    expectIds(await list(`category=${refs.categories.billing.id}`), t.t2, t.t4, t.t6, t.t10));
  test('assignee', async () =>
    expectIds(await list(`assignee=${refs.users.alice.id}`), t.t1, t.t4, t.t5, t.t9));
  test('assignee=unassigned', async () => expectIds(await list('assignee=unassigned'), t.t2, t.t7, t.t10));
  test('assignee id plus unassigned', async () =>
    expectIds(await list(`assignee=${refs.users.alice.id},unassigned`), t.t1, t.t4, t.t5, t.t9, t.t2, t.t7, t.t10));
  test('a filter that matches nothing -> empty page, total 0', async () => {
    const res = await list('status=CLOSED&priority=CRITICAL');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });
  test('blank filter values are ignored', async () => {
    const res = await list('status=&priority=&search=');
    expect(res.body.meta.total).toBe(10);
  });
});

describe('combined filters', () => {
  test('status + priority + category (AND between filters)', async () => {
    const res = await list(`status=OPEN,IN_PROGRESS&priority=HIGH,CRITICAL&category=${refs.categories.technical.id}`);
    expectIds(res, t.t1, t.t5, t.t8);
  });

  test('status + unassigned', async () => expectIds(await list('status=OPEN&assignee=unassigned'), t.t2, t.t7));

  test('all four filters together', async () => {
    const res = await list(
      `status=OPEN&priority=CRITICAL&category=${refs.categories.technical.id}&assignee=${refs.users.bob.id}`
    );
    expectIds(res, t.t8);
  });

  test('filters + pagination: total reflects the filter and pages add up', async () => {
    const q = 'status=OPEN,IN_PROGRESS';
    const p1 = await list(`${q}&limit=3&page=1&sortBy=createdAt&order=asc`);
    const p2 = await list(`${q}&limit=3&page=2&sortBy=createdAt&order=asc`);
    const p3 = await list(`${q}&limit=3&page=3&sortBy=createdAt&order=asc`);
    expect(p1.body.meta).toEqual({ page: 1, limit: 3, total: 7, totalPages: 3 });
    expect(p1.body.data.map((x) => x.id)).toEqual([t.t1.id, t.t2.id, t.t3.id]);
    expect(p2.body.data.map((x) => x.id)).toEqual([t.t5.id, t.t7.id, t.t8.id]);
    expect(p3.body.data.map((x) => x.id)).toEqual([t.t10.id]);
  });

  test('filters + sorting + pagination together', async () => {
    const res = await list('priority=HIGH,CRITICAL&sortBy=priority&order=desc&limit=2&page=1');
    expect(res.body.meta.total).toBe(5);
    expect(res.body.data.map((x) => x.priority)).toEqual(['CRITICAL', 'CRITICAL']);
  });

  test.each(['status=DONE', 'priority=URGENT', 'category=abc', 'assignee=nobody', 'status=OPEN,DONE'])(
    'invalid filter value (%s) -> 400',
    async (query) => {
      expect((await list(query)).status).toBe(400);
    }
  );
});

describe('search', () => {
  test('matches the title', async () => expectIds(await list('search=login'), t.t1, t.t8));
  test('is case-insensitive', async () => expectIds(await list('search=LOGIN'), t.t1, t.t8));
  test('matches the description too', async () => expectIds(await list('search=urgent'), t.t2, t.t5));
  test('matches a substring', async () => expectIds(await list('search=invoic'), t.t2, t.t10));
  test('combines with filters', async () => expectIds(await list('search=invoice&status=OPEN'), t.t2));
  test('combines with filters and pagination', async () => {
    const res = await list('search=password&limit=1&page=2&sortBy=createdAt&order=asc');
    expect(res.body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
    expect(res.body.data.map((x) => x.id)).toEqual([t.t8.id]);
  });
  test('no match -> empty page', async () => {
    const res = await list('search=zzzzqqqq');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });
  test.each([['%25', '%'], ['_', '_'], ['%25%25', '%%'], ['a_', 'a_']])(
    'wildcard characters are treated as plain text (search=%s)',
    async (encoded) => {
      const res = await list(`search=${encoded}`);
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(0);
    }
  );
  test('search longer than 100 characters -> 400', async () => {
    expect((await list(`search=${'a'.repeat(101)}`)).status).toBe(400);
  });
});
