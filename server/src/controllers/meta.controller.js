const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { STATUSES, PRIORITIES, TRANSITIONS } = require('../utils/statusTransitions');

// Everything the frontend needs to fill its dropdowns, in one call.
const getMeta = asyncHandler(async (req, res) => {
  const [categories, users] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } }),
  ]);
  res.json({ categories, users, statuses: STATUSES, priorities: PRIORITIES, transitions: TRANSITIONS });
});

module.exports = { getMeta };
