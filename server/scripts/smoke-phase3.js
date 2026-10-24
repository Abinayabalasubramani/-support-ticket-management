// Manual smoke test for list/search/filter/pagination and analytics. Read-only.
//   node scripts/smoke-phase3.js [baseUrl]
// Strategy: download every ticket once, compute the expected answers locally,
// then check that the API returns the same numbers. Replaced by Jest tests in Phase 4.
const base = process.argv[2] || 'http://localhost:4000';
let passed = 0;
let failed = 0;

async function get(path) {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, data: await res.json() };
}

function check(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const PRIORITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

async function fetchAll() {
  const all = [];
  let page = 1;
  for (;;) {
    const r = await get(`/api/tickets?limit=100&page=${page}`);
    all.push(...r.data.data);
    if (page >= r.data.meta.totalPages) break;
    page++;
  }
  return all;
}

async function main() {
  console.log(`Smoke testing ${base}\n`);
  const all = await fetchAll();
  const meta = (await get('/api/meta')).data;
  console.log(`Loaded ${all.length} tickets as the reference set\n`);

  console.log('Pagination');
  const p1 = await get('/api/tickets');
  check('default list -> 200, limit 10, page 1', p1.status === 200 && p1.data.meta.limit === 10 && p1.data.meta.page === 1);
  check('meta.total equals the reference count', p1.data.meta.total === all.length);
  check('totalPages = ceil(total / limit)', p1.data.meta.totalPages === Math.ceil(all.length / 10));
  check('first page holds 10 rows', p1.data.data.length === Math.min(10, all.length));

  const seen = [];
  let pg = 1;
  for (;;) {
    const r = await get(`/api/tickets?limit=7&page=${pg}&sortBy=priority&order=desc`);
    seen.push(...r.data.data.map((t) => t.id));
    if (pg >= r.data.meta.totalPages) break;
    pg++;
  }
  check('paging with limit 7 visits every ticket exactly once (stable sort)', seen.length === all.length && new Set(seen).size === all.length, `${seen.length} rows, ${new Set(seen).size} unique`);

  const beyond = await get('/api/tickets?page=9999');
  check('page beyond the end -> 200, empty data, correct total', beyond.status === 200 && beyond.data.data.length === 0 && beyond.data.meta.total === all.length);

  for (const [name, q] of [['page=0', 'page=0'], ['page=abc', 'page=abc'], ['limit=0', 'limit=0'], ['limit=101', 'limit=101'], ['sortBy=password', 'sortBy=password'], ['order=sideways', 'order=sideways']]) {
    const r = await get(`/api/tickets?${q}`);
    check(`${name} -> 400`, r.status === 400 && r.data.error.code === 'VALIDATION_ERROR');
  }

  console.log('\nSorting');
  const asc = (await get('/api/tickets?limit=100&sortBy=createdAt&order=asc')).data.data;
  check('createdAt asc is oldest first', asc.every((t, i) => i === 0 || new Date(asc[i - 1].createdAt) <= new Date(t.createdAt)));
  const desc = (await get('/api/tickets?limit=100&sortBy=createdAt&order=desc')).data.data;
  check('createdAt desc is newest first', desc.every((t, i) => i === 0 || new Date(desc[i - 1].createdAt) >= new Date(t.createdAt)));
  const byPrio = (await get('/api/tickets?limit=100&sortBy=priority&order=desc')).data.data;
  check('priority desc puts CRITICAL first', byPrio.every((t, i) => i === 0 || PRIORITY_RANK[byPrio[i - 1].priority] >= PRIORITY_RANK[t.priority]));

  console.log('\nFilters (each checked against the local reference)');
  const count = (fn) => all.filter(fn).length;

  const oneStatus = 'OPEN';
  const rs = await get(`/api/tickets?limit=100&status=${oneStatus}`);
  check('status=OPEN: total matches', rs.data.meta.total === count((t) => t.status === oneStatus));
  check('status=OPEN: every row is OPEN', rs.data.data.every((t) => t.status === oneStatus));

  const rms = await get('/api/tickets?limit=100&status=OPEN,IN_PROGRESS');
  check('status=OPEN,IN_PROGRESS (OR within a filter): total matches', rms.data.meta.total === count((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status)));

  const rp = await get('/api/tickets?limit=100&priority=CRITICAL,HIGH');
  check('priority=CRITICAL,HIGH: total matches', rp.data.meta.total === count((t) => ['CRITICAL', 'HIGH'].includes(t.priority)));

  const catId = meta.categories[0].id;
  const rc = await get(`/api/tickets?limit=100&category=${catId}`);
  check('category filter: total matches', rc.data.meta.total === count((t) => t.categoryId === catId));

  const userId = meta.users[0].id;
  const ra = await get(`/api/tickets?limit=100&assignee=${userId}`);
  check('assignee=<id>: total matches', ra.data.meta.total === count((t) => t.assigneeId === userId));
  const ru = await get('/api/tickets?limit=100&assignee=unassigned');
  check('assignee=unassigned: total matches', ru.data.meta.total === count((t) => t.assigneeId === null));
  const rau = await get(`/api/tickets?limit=100&assignee=${userId},unassigned`);
  check('assignee=<id>,unassigned: total matches', rau.data.meta.total === count((t) => t.assigneeId === userId || t.assigneeId === null));

  console.log('\nCombined filters');
  const combo = await get(`/api/tickets?limit=100&status=OPEN,IN_PROGRESS&priority=HIGH,CRITICAL&category=${catId}`);
  const comboExpected = count((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status) && ['HIGH', 'CRITICAL'].includes(t.priority) && t.categoryId === catId);
  check('status + priority + category: total matches', combo.data.meta.total === comboExpected, `got ${combo.data.meta.total}, expected ${comboExpected}`);
  check('status + priority + category: every row satisfies all three', combo.data.data.every((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status) && ['HIGH', 'CRITICAL'].includes(t.priority) && t.categoryId === catId));

  const combo2 = await get(`/api/tickets?limit=100&status=OPEN&assignee=unassigned&priority=LOW,MEDIUM,HIGH,CRITICAL`);
  check('status + unassigned + priority: total matches', combo2.data.meta.total === count((t) => t.status === 'OPEN' && t.assigneeId === null));

  // Filters + pagination together: pages of 3 must add up to the filtered total.
  const fq = 'status=OPEN,IN_PROGRESS&priority=MEDIUM,HIGH';
  const fexpected = count((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status) && ['MEDIUM', 'HIGH'].includes(t.priority));
  const fseen = [];
  let fp = 1;
  for (;;) {
    const r = await get(`/api/tickets?${fq}&limit=3&page=${fp}`);
    if (r.data.meta.total !== fexpected) break;
    fseen.push(...r.data.data.map((t) => t.id));
    if (fp >= r.data.meta.totalPages) break;
    fp++;
  }
  check('filters + pagination: pages of 3 add up to the filtered total with no repeats', fseen.length === fexpected && new Set(fseen).size === fexpected, `${fseen.length} vs ${fexpected}`);

  const badStatus = await get('/api/tickets?status=DONE');
  check('status=DONE -> 400', badStatus.status === 400);
  const badCat = await get('/api/tickets?category=abc');
  check('category=abc -> 400', badCat.status === 400);

  console.log('\nSearch');
  const word = 'password';
  const sExpected = count((t) => `${t.title} ${t.description}`.toLowerCase().includes(word));
  const rsch = await get(`/api/tickets?limit=100&search=${word}`);
  check(`search=${word}: total matches (title or description)`, rsch.data.meta.total === sExpected, `got ${rsch.data.meta.total}, expected ${sExpected}`);
  const rschUp = await get('/api/tickets?limit=100&search=PASSWORD');
  check('search is case-insensitive', rschUp.data.meta.total === sExpected);
  const rschCombo = await get(`/api/tickets?limit=100&search=${word}&status=OPEN`);
  check('search + status: total matches', rschCombo.data.meta.total === count((t) => t.status === 'OPEN' && `${t.title} ${t.description}`.toLowerCase().includes(word)));
  const rnone = await get('/api/tickets?search=zzzzqqqq');
  check('search with no matches -> 200, empty data, total 0', rnone.status === 200 && rnone.data.data.length === 0 && rnone.data.meta.total === 0 && rnone.data.meta.totalPages === 0);
  const rblank = await get('/api/tickets?search=&status=');
  check('blank search/status are ignored', rblank.status === 200 && rblank.data.meta.total === all.length);

  console.log('\nAnalytics');
  const sum = (await get('/api/analytics/summary')).data;
  check('summary.total equals ticket count', sum.total === all.length);
  check('summary.open equals OPEN count', sum.open === count((t) => t.status === 'OPEN'));
  check('summary.resolved equals RESOLVED count', sum.resolved === count((t) => t.status === 'RESOLVED'));
  check('summary.critical equals CRITICAL count', sum.critical === count((t) => t.priority === 'CRITICAL'));

  const bs = (await get('/api/analytics/by-status')).data;
  check('by-status has all 4 statuses in order', same(bs.map((x) => x.status), ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']));
  check('by-status counts match the reference', bs.every((x) => x.count === count((t) => t.status === x.status)));
  check('by-status counts add up to the total', bs.reduce((s, x) => s + x.count, 0) === all.length);

  const bp = (await get('/api/analytics/by-priority')).data;
  check('by-priority has all 4 priorities in order', same(bp.map((x) => x.priority), ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']));
  check('by-priority counts match the reference', bp.every((x) => x.count === count((t) => t.priority === x.priority)));

  console.log('\nAnalytics date range');
  const sorted = [...all].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const midDay = sorted[Math.floor(sorted.length / 2)].createdAt.slice(0, 10);
  const fromDate = new Date(midDay);
  const endOfMid = new Date(midDay);
  endOfMid.setUTCHours(23, 59, 59, 999);

  const sFrom = (await get(`/api/analytics/summary?from=${midDay}`)).data;
  check(`from=${midDay}: total matches`, sFrom.total === count((t) => new Date(t.createdAt) >= fromDate));
  const sTo = (await get(`/api/analytics/summary?to=${midDay}`)).data;
  check(`to=${midDay} includes that whole day: total matches`, sTo.total === count((t) => new Date(t.createdAt) <= endOfMid));
  const sBoth = (await get(`/api/analytics/summary?from=${midDay}&to=${midDay}`)).data;
  check('from = to covers exactly one day', sBoth.total === count((t) => new Date(t.createdAt) >= fromDate && new Date(t.createdAt) <= endOfMid));
  const bsFrom = (await get(`/api/analytics/by-status?from=${midDay}`)).data;
  check('by-status respects the range and still returns all 4 statuses', bsFrom.length === 4 && bsFrom.reduce((s, x) => s + x.count, 0) === sFrom.total);
  const future = (await get('/api/analytics/summary?from=2999-01-01')).data;
  check('range with no tickets -> all zeros', same(future, { total: 0, open: 0, resolved: 0, critical: 0 }));
  const futureBs = (await get('/api/analytics/by-status?from=2999-01-01')).data;
  check('empty range still lists every status with 0', futureBs.length === 4 && futureBs.every((x) => x.count === 0));

  const rev = await get('/api/analytics/summary?from=2026-12-31&to=2026-01-01');
  check('from after to -> 400', rev.status === 400 && rev.data.error.code === 'VALIDATION_ERROR');
  const bad = await get('/api/analytics/summary?from=yesterday');
  check('invalid date -> 400', bad.status === 400);
  const num = await get('/api/analytics/summary?from=5');
  check('bare number as a date -> 400', num.status === 400);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => {
  console.error('Smoke test crashed:', e.message);
  process.exitCode = 1;
});
