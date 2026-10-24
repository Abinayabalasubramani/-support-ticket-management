// Loads .env.test (NODE_ENV=test) before Prisma is created.
require('../../src/config/env');
const prisma = require('../../src/config/prisma');

// Prisma qualifies its own queries with the schema from DATABASE_URL, but raw SQL does not.
// Always name the schema explicitly, and never truncate anything except "test".
const testSchema = new URL(process.env.DATABASE_URL).searchParams.get('schema');

async function resetDb() {
  if (testSchema !== 'test') {
    throw new Error(`resetDb refused: schema is "${testSchema}", expected "test"`);
  }
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "${testSchema}"."StatusHistory", "${testSchema}"."Ticket", "${testSchema}"."Category", "${testSchema}"."User" RESTART IDENTITY CASCADE`
  );
}

// Two users and three categories used as reference data by most tests.
async function seedRefs() {
  const [alice, bob, billing, technical, account] = await Promise.all([
    prisma.user.create({ data: { name: 'Alice Test', email: 'alice@test.example' } }),
    prisma.user.create({ data: { name: 'Bob Test', email: 'bob@test.example' } }),
    prisma.category.create({ data: { name: 'Billing' } }),
    prisma.category.create({ data: { name: 'Technical' } }),
    prisma.category.create({ data: { name: 'Account' } }),
  ]);
  return { users: { alice, bob }, categories: { billing, technical, account } };
}

// Inserts a ticket directly (bypassing the API) so tests control status, priority and dates.
async function makeTicket({
  title = 'Test ticket',
  description = 'Customer needs help',
  priority = 'MEDIUM',
  status = 'OPEN',
  categoryId,
  assigneeId = null,
  createdAt = new Date(),
}) {
  return prisma.ticket.create({
    data: {
      title,
      description,
      priority,
      status,
      categoryId,
      assigneeId,
      createdAt,
      history: { create: { fromStatus: null, toStatus: status, changedAt: createdAt } },
    },
  });
}

module.exports = { prisma, resetDb, seedRefs, makeTicket };
