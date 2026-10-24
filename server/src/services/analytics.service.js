const prisma = require('../config/prisma');
const { STATUSES, PRIORITIES } = require('../utils/statusTransitions');

// Optional date range on the ticket creation date.
const dateWhere = ({ from, to }) => {
  if (!from && !to) return {};
  const createdAt = {};
  if (from) createdAt.gte = from;
  if (to) createdAt.lte = to;
  return { createdAt };
};

async function getSummary(range) {
  const base = dateWhere(range);
  const [total, open, resolved, critical] = await prisma.$transaction([
    prisma.ticket.count({ where: base }),
    prisma.ticket.count({ where: { ...base, status: 'OPEN' } }),
    prisma.ticket.count({ where: { ...base, status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { ...base, priority: 'CRITICAL' } }),
  ]);
  return { total, open, resolved, critical };
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

module.exports = { getSummary, getByStatus, getByPriority };
