const prisma = require('../config/prisma');
const { STATUSES, PRIORITIES } = require('../utils/statusTransitions');

const DAY_MS = 24 * 60 * 60 * 1000;
// A chart with more points than this is unreadable, so older days are dropped.
const MAX_VOLUME_DAYS = 366;

// Optional date range on the ticket creation date.
const dateWhere = ({ from, to }) => {
  if (!from && !to) return {};
  const createdAt = {};
  if (from) createdAt.gte = from;
  if (to) createdAt.lte = to;
  return { createdAt };
};

// One grouped query (at most 16 rows: status x priority) instead of five separate counts,
// so the dashboard's headline numbers cost a single database round trip.
async function getSummary(range) {
  const groups = await prisma.ticket.groupBy({
    by: ['status', 'priority'],
    where: dateWhere(range),
    _count: { _all: true },
  });

  const summary = { total: 0, open: 0, resolved: 0, critical: 0, criticalUnresolved: 0 };
  for (const { status, priority, _count } of groups) {
    const n = _count._all;
    summary.total += n;
    if (status === 'OPEN') summary.open += n;
    if (status === 'RESOLVED') summary.resolved += n;
    if (priority === 'CRITICAL') {
      summary.critical += n;
      if (status === 'OPEN' || status === 'IN_PROGRESS') summary.criticalUnresolved += n;
    }
  }
  return summary;
}

// Counts per value, with zeros filled in so charts always have every category.
async function countBy(field, allValues, range) {
  const groups = await prisma.ticket.groupBy({
    by: [field],
    where: dateWhere(range),
    _count: { _all: true },
  });
  const counts = Object.fromEntries(groups.map((g) => [g[field], g._count._all]));
  return allValues.map((value) => ({ [field]: value, count: counts[value] || 0 }));
}

const getByStatus = (range) => countBy('status', STATUSES, range);
const getByPriority = (range) => countBy('priority', PRIORITIES, range);

const utcDay = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

// New tickets per UTC day, one entry for every day in the range (zeros included),
// oldest first: [{ date: '2026-10-24', count: 6 }].
// Without `from` the chart starts at the first ticket; without `to` it ends today.
// Days are bucketed in memory so the query stays portable across schemas; at much larger
// scale this would move into SQL (date_trunc + GROUP BY).
async function getVolume({ from, to }) {
  let start = from;
  if (!start) {
    const first = await prisma.ticket.findFirst({
      where: to ? { createdAt: { lte: to } } : {},
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    if (!first) return [];
    start = first.createdAt;
  }

  const end = to ?? new Date();
  const endDay = utcDay(end);
  const startDay = Math.max(utcDay(start), endDay - (MAX_VOLUME_DAYS - 1) * DAY_MS);
  if (startDay > endDay) return [];

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: new Date(startDay), lte: end } },
    select: { createdAt: true },
  });

  const counts = new Map();
  for (const { createdAt } of tickets) {
    const key = isoDay(utcDay(createdAt));
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const days = [];
  for (let day = startDay; day <= endDay; day += DAY_MS) {
    const key = isoDay(day);
    days.push({ date: key, count: counts.get(key) || 0 });
  }
  return days;
}

module.exports = { getSummary, getByStatus, getByPriority, getVolume };
