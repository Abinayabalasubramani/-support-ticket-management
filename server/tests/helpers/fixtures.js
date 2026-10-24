const { resetDb, seedRefs, makeTicket } = require('./db');

// Ten tickets with known attributes. createdAt = 2026-01-01 12:00 UTC + n days.
//
//  key  title                               status       priority  cat        assignee  created
//  t1   Login fails on mobile               OPEN         HIGH      technical  alice     Jan 2
//  t2   Invoice charged twice (urgent desc) OPEN         CRITICAL  billing    -         Jan 3
//  t3   Password reset email                IN_PROGRESS  MEDIUM    technical  bob       Jan 4
//  t4   Refund request                      RESOLVED     LOW       billing    alice     Jan 5
//  t5   Export CSV broken (urgent desc)     IN_PROGRESS  HIGH      technical  alice     Jan 6
//  t6   Billing address update              CLOSED       LOW       billing    bob       Jan 7
//  t7   Dark mode request                   OPEN         LOW       technical  -         Jan 8
//  t8   Cannot login after password change  OPEN         CRITICAL  technical  bob       Jan 9
//  t9   Slow dashboard                      RESOLVED     MEDIUM    technical  alice     Jan 10
//  t10  Duplicate invoice                   IN_PROGRESS  HIGH      billing    -         Jan 11
async function seedListFixtures() {
  await resetDb();
  const refs = await seedRefs();
  const { alice, bob } = refs.users;
  const { billing, technical } = refs.categories;
  const day = (n) => new Date(Date.UTC(2026, 0, 1, 12) + n * 24 * 60 * 60 * 1000);

  const rows = [
    ['t1', 'Login fails on mobile', 'OPEN', 'HIGH', technical, alice, 1],
    ['t2', 'Invoice charged twice', 'OPEN', 'CRITICAL', billing, null, 2, 'URGENT: customer is blocked'],
    ['t3', 'Password reset email', 'IN_PROGRESS', 'MEDIUM', technical, bob, 3],
    ['t4', 'Refund request', 'RESOLVED', 'LOW', billing, alice, 4],
    ['t5', 'Export CSV broken', 'IN_PROGRESS', 'HIGH', technical, alice, 5, 'Urgent fix needed for a client'],
    ['t6', 'Billing address update', 'CLOSED', 'LOW', billing, bob, 6],
    ['t7', 'Dark mode request', 'OPEN', 'LOW', technical, null, 7],
    ['t8', 'Cannot login after password change', 'OPEN', 'CRITICAL', technical, bob, 8],
    ['t9', 'Slow dashboard', 'RESOLVED', 'MEDIUM', technical, alice, 9],
    ['t10', 'Duplicate invoice', 'IN_PROGRESS', 'HIGH', billing, null, 10],
  ];

  // Created at the same time: over a slow database connection ten sequential inserts can
  // take longer than a test hook is allowed to run. Every ticket has its own explicit date,
  // so the order they are inserted in does not matter.
  const created = await Promise.all(
    rows.map(([, title, status, priority, category, assignee, offset, description]) =>
      makeTicket({
        title,
        status,
        priority,
        description: description || 'Customer needs help',
        categoryId: category.id,
        assigneeId: assignee ? assignee.id : null,
        createdAt: day(offset),
      })
    )
  );
  const t = Object.fromEntries(rows.map(([key], i) => [key, created[i]]));
  return { refs, t };
}

module.exports = { seedListFixtures };
