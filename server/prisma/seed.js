require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Every demo user signs in with this password (documented in the README). Real deployments
// would never share a password: this is demo data only.
const DEMO_PASSWORD = 'Demo@12345';

// DEMO DATA ONLY: this wipes every ticket, user and category before inserting sample data.
if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Refusing to seed with NODE_ENV=production (it deletes all data). Pass --force if you really mean it.');
  process.exit(1);
}

const prisma = new PrismaClient();

// Small deterministic PRNG so the seed produces the same data every run.
let state = 2026;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const weighted = (entries) => {
  let r = rand() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
};

// The admin can also delete tickets; agents can do everything else.
const USERS = [
  { name: 'Aarav Mehta', email: 'aarav.mehta@example.com', role: 'ADMIN' },
  { name: 'Priya Nair', email: 'priya.nair@example.com', role: 'AGENT' },
  { name: 'Rahul Verma', email: 'rahul.verma@example.com', role: 'AGENT' },
  { name: 'Sneha Iyer', email: 'sneha.iyer@example.com', role: 'AGENT' },
  { name: 'Karthik Raj', email: 'karthik.raj@example.com', role: 'AGENT' },
];

// category -> { how many tickets, unique titles (at least that many), descriptions }
const CATALOG = {
  Billing: {
    count: 14,
    titles: [
      'Charged twice for the same invoice',
      'Refund not received after cancellation',
      'Invoice shows wrong company name',
      'Unable to update payment method',
      'Unexpected increase in monthly charge',
      'Request for GST invoice copy',
      'Coupon code not applied at checkout',
      'Subscription renewed after cancelling',
      'Card declined although funds are available',
      'Need to change billing email address',
      'Annual plan price differs from the quote',
      'Receipt missing for last month',
      'Prorated charge looks incorrect after upgrade',
      'Tax number not appearing on invoice',
    ],
    descriptions: [
      'The customer sent a screenshot of the statement and asks for a correction.',
      'Billing shows a different amount than the plan page. Finance needs to confirm.',
      'Customer is on the business plan and needs the corrected document for accounting.',
    ],
  },
  Technical: {
    count: 22,
    titles: [
      'Dashboard fails to load after login',
      'Export to CSV returns an empty file',
      'API returns 500 on bulk upload',
      'Page freezes when applying filters',
      'Email notifications are delayed',
      'Mobile app crashes on startup',
      'File attachments fail above 5 MB',
      'Search results are out of date',
      'Webhook retries are not firing',
      'Dates show the wrong timezone in reports',
      'Login loop after password reset',
      'Slow response on the reports page',
      'Images do not load on the ticket view',
      'Duplicate notifications for one update',
      'PDF export cuts off the last column',
      'Integration token expires every hour',
      'Sorting by date ignores the selected range',
      'Autosave overwrites a newer draft',
      'Mobile layout hides the action buttons',
      'Import fails on files with special characters',
      'Calendar sync shows events a day late',
      'Rate limit error appears during normal use',
    ],
    descriptions: [
      'Reproduced on the latest release. Steps and a short screen recording were attached.',
      'Happens intermittently, mostly during peak hours. Server logs have been requested.',
      'Several users in the same workspace report the same behaviour since yesterday.',
      'Needs investigation by the platform team before we can give the customer a timeline.',
    ],
  },
  Account: {
    count: 12,
    titles: [
      'Cannot reset password',
      'Locked out after too many login attempts',
      'Need to change the account email address',
      'Add a new team member to the workspace',
      'Two-factor code not arriving',
      'Request to delete my account',
      'Transfer account ownership',
      'Profile picture will not upload',
      'Invite link says it has expired',
      'Remove a former employee from the workspace',
      'Single sign-on button does nothing',
      'Wrong name shown on the profile',
    ],
    descriptions: [
      'The customer verified their identity by email and needs access restored today.',
      'Request came from the workspace owner. Please confirm before making the change.',
      'Customer has tried the self-service steps without success.',
    ],
  },
  'Feature Request': {
    count: 8,
    titles: [
      'Add dark mode to the dashboard',
      'Allow scheduling of recurring reports',
      'Support single sign-on with Google',
      'Add keyboard shortcuts for common actions',
      'Provide a public API for reports',
      'Option to bulk edit custom fields',
      'Let customers attach files to replies',
      'Show a satisfaction survey after resolution',
    ],
    descriptions: [
      'Requested by several customers. Product team asked for votes and use cases.',
      'Would save the customer a few hours every week. Logged for the next planning session.',
    ],
  },
  General: {
    count: 8,
    titles: [
      'Question about data retention policy',
      'How do I invite external collaborators?',
      'Feedback on the new onboarding flow',
      'Where can I find the user guide?',
      'Request a product demo for my team',
      'Clarification on service uptime commitments',
      'Do you offer a discount for non-profits?',
      'Where are my exported files stored?',
    ],
    descriptions: [
      'General question. A link to the documentation is usually enough.',
      'Customer is evaluating the product and wants a quick answer.',
    ],
  },
};

const PRIORITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const SPAN_DAYS = 45;

// Every valid path a ticket can have taken to reach its current status.
const PATHS = {
  OPEN: [['OPEN']],
  IN_PROGRESS: [['OPEN', 'IN_PROGRESS']],
  RESOLVED: [['OPEN', 'IN_PROGRESS', 'RESOLVED'], ['OPEN', 'RESOLVED'], ['OPEN', 'IN_PROGRESS', 'OPEN', 'IN_PROGRESS', 'RESOLVED']],
  CLOSED: [['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], ['OPEN', 'RESOLVED', 'CLOSED']],
};

// Older tickets are more likely to be finished; recent ones are still being worked.
function pickStatus(ageDays) {
  if (ageDays > 25) return weighted([['CLOSED', 50], ['RESOLVED', 30], ['IN_PROGRESS', 8], ['OPEN', 12]]);
  if (ageDays > 10) return weighted([['CLOSED', 20], ['RESOLVED', 35], ['IN_PROGRESS', 25], ['OPEN', 20]]);
  return weighted([['CLOSED', 2], ['RESOLVED', 13], ['IN_PROGRESS', 30], ['OPEN', 55]]);
}

// Weekdays are busy, weekends are quiet, and recent days are a little busier.
function pickDayOffset(now) {
  const days = [];
  for (let d = 0; d < SPAN_DAYS; d++) {
    const weekday = new Date(now - d * DAY).getUTCDay();
    const weekdayWeight = weekday === 0 ? 0.2 : weekday === 6 ? 0.35 : 1;
    days.push([d, weekdayWeight * (1 + (SPAN_DAYS - d) / 90)]);
  }
  return weighted(days);
}

async function main() {
  // Wipe in one statement and restart the id counters so demo tickets start at #1.
  // Raw SQL ignores Prisma's schema setting, so the schema is named explicitly.
  const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema') || 'public';
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) throw new Error(`Unexpected schema name: ${schema}`);
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "${schema}"."TicketActivity", "${schema}"."StatusHistory", "${schema}"."Ticket", "${schema}"."Category", "${schema}"."User" RESTART IDENTITY CASCADE`
  );

  const users = [];
  for (const u of USERS) {
    // Each user gets their own salted hash, even though the demo password is shared.
    users.push(await prisma.user.create({ data: { ...u, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) } }));
  }
  const asPerson = (u) => (u ? { id: u.id, name: u.name } : null);

  const categories = {};
  for (const name of Object.keys(CATALOG)) categories[name] = await prisma.category.create({ data: { name } });

  const now = Date.now();

  // 1. Decide every ticket first, then insert oldest-first so ids follow time.
  const drafts = [];
  for (const [categoryName, { count, titles, descriptions }] of Object.entries(CATALOG)) {
    const shuffled = [...titles].sort(() => rand() - 0.5);
    for (let i = 0; i < count; i++) {
      const dayOffset = pickDayOffset(now);
      const createdAt = new Date(now - dayOffset * DAY);
      createdAt.setUTCHours(between(4, 14), between(0, 59), between(0, 59), 0); // 09:30-19:30 IST
      if (createdAt.getTime() > now) createdAt.setTime(now - between(1, 6) * HOUR);
      drafts.push({
        categoryName,
        title: shuffled[i],
        description: pick(descriptions),
        createdAt,
        ageDays: dayOffset,
      });
    }
  }
  drafts.sort((a, b) => a.createdAt - b.createdAt);

  let activityCount = 0;

  for (const draft of drafts) {
    const status = pickStatus(draft.ageDays);
    const priority = weighted([['LOW', 20], ['MEDIUM', 40], ['HIGH', 28], ['CRITICAL', 12]]);
    const unassigned = rand() < (status === 'OPEN' ? 0.35 : 0.05);
    const assignee = unassigned ? null : pick(users);

    // Status history: a valid path with realistic gaps, never later than now.
    const path = pick(PATHS[status]);
    const history = [];
    let cursor = draft.createdAt.getTime();
    path.forEach((toStatus, idx) => {
      if (idx > 0) cursor += between(2, 40) * HOUR;
      cursor = Math.min(cursor, now);
      history.push({ fromStatus: idx === 0 ? null : path[idx - 1], toStatus, changedAt: new Date(cursor) });
    });

    // Timeline extras: the assignment, sometimes a hand-over, sometimes a priority escalation.
    const activity = [];
    if (assignee) {
      const first = pick(users.filter((u) => u.id !== assignee.id));
      const handOver = rand() < 0.2;
      const firstOwner = handOver ? first : assignee;
      const at1 = Math.min(draft.createdAt.getTime() + between(10, 180) * 60 * 1000, now);
      activity.push({ type: 'ASSIGNEE_CHANGED', createdAt: new Date(at1), details: { from: null, to: asPerson(firstOwner) } });
      if (handOver) {
        const at2 = Math.min(at1 + between(2, 30) * HOUR, now);
        activity.push({ type: 'ASSIGNEE_CHANGED', createdAt: new Date(at2), details: { from: asPerson(firstOwner), to: asPerson(assignee) } });
      }
    }
    const rank = PRIORITY_ORDER.indexOf(priority);
    if (rank >= 2 && rand() < 0.4) {
      const at = Math.min(draft.createdAt.getTime() + between(3, 48) * HOUR, now);
      activity.push({
        type: 'TICKET_EDITED',
        createdAt: new Date(at),
        details: { changes: [{ field: 'priority', from: PRIORITY_ORDER[rank - 1], to: priority }] },
      });
    }
    activityCount += activity.length;

    const lastTouch = Math.max(history[history.length - 1].changedAt.getTime(), ...activity.map((a) => a.createdAt.getTime()));

    await prisma.ticket.create({
      data: {
        title: draft.title,
        description: draft.description,
        priority,
        status,
        categoryId: categories[draft.categoryName].id,
        assigneeId: assignee ? assignee.id : null,
        createdAt: draft.createdAt,
        updatedAt: new Date(lastTouch),
        history: { create: history },
        activity: { create: activity },
      },
    });
  }

  const [tickets, histories, activities] = await Promise.all([
    prisma.ticket.count(),
    prisma.statusHistory.count(),
    prisma.ticketActivity.count(),
  ]);
  console.log(
    `Seeded ${users.length} users, ${Object.keys(categories).length} categories, ${tickets} tickets, ${histories} status history rows, ${activities} activity entries.`
  );
  console.log(`Demo sign-in: ${USERS[0].email} (admin) or ${USERS[1].email} (agent), password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
