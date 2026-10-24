require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Small deterministic PRNG so the seed produces the same data every run.
let state = 42;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const USERS = [
  { name: 'Aarav Mehta', email: 'aarav.mehta@example.com' },
  { name: 'Priya Nair', email: 'priya.nair@example.com' },
  { name: 'Rahul Verma', email: 'rahul.verma@example.com' },
  { name: 'Sneha Iyer', email: 'sneha.iyer@example.com' },
  { name: 'Karthik Raj', email: 'karthik.raj@example.com' },
];

const CATEGORIES = ['Billing', 'Technical', 'Account', 'Feature Request', 'General'];

const TITLES = {
  Billing: [
    'Charged twice for the same invoice',
    'Refund not received after cancellation',
    'Invoice shows wrong company name',
    'Unable to update payment method',
    'Unexpected increase in monthly charge',
    'Request for GST invoice copy',
    'Coupon code not applied at checkout',
    'Subscription renewed after cancelling',
  ],
  Technical: [
    'Dashboard fails to load after login',
    'Export to CSV returns an empty file',
    'API returns 500 on bulk upload',
    'Page freezes when applying filters',
    'Email notifications are delayed',
    'Mobile app crashes on startup',
    'File attachments fail above 5 MB',
    'Search results are out of date',
  ],
  Account: [
    'Cannot reset password',
    'Locked out after too many login attempts',
    'Need to change the account email address',
    'Add a new team member to the workspace',
    'Two-factor code not arriving',
    'Request to delete my account',
    'Transfer account ownership',
    'Profile picture will not upload',
  ],
  'Feature Request': [
    'Add dark mode to the dashboard',
    'Allow scheduling of recurring reports',
    'Support single sign-on with Google',
    'Add keyboard shortcuts for common actions',
    'Provide a public API for reports',
    'Option to bulk edit tickets',
  ],
  General: [
    'Question about data retention policy',
    'How do I invite external collaborators?',
    'Feedback on the new onboarding flow',
    'Where can I find the user guide?',
    'Request a product demo for my team',
    'Clarification on service uptime commitments',
  ],
};

const DESCRIPTIONS = [
  'The customer reports this issue started earlier this week and is blocking their daily work.',
  'Reproduced on the latest release. Steps and screenshots were shared by the customer.',
  'Customer is asking for an update and a clear timeline for resolution.',
  'Occurs intermittently and mostly during peak hours. Logs have been requested.',
  'This was raised by a long-standing customer on the business plan.',
  'Needs follow-up with the relevant team before we can respond to the customer.',
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
// Weighted so the dashboard looks realistic: few critical, many medium.
const PRIORITY_POOL = [
  'LOW', 'LOW', 'LOW', 'LOW', 'LOW',
  'MEDIUM', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'MEDIUM',
  'HIGH', 'HIGH', 'HIGH', 'HIGH', 'HIGH',
  'CRITICAL', 'CRITICAL', 'CRITICAL',
];
const STATUS_POOL = [
  'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN',
  'IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS',
  'RESOLVED', 'RESOLVED', 'RESOLVED', 'RESOLVED',
  'CLOSED', 'CLOSED', 'CLOSED', 'CLOSED',
];

// Valid paths a ticket may have taken to reach its current status.
const PATHS = {
  OPEN: [['OPEN']],
  IN_PROGRESS: [['OPEN', 'IN_PROGRESS']],
  RESOLVED: [['OPEN', 'IN_PROGRESS', 'RESOLVED'], ['OPEN', 'RESOLVED']],
  CLOSED: [
    ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    ['OPEN', 'RESOLVED', 'CLOSED'],
  ],
};

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const TICKET_COUNT = 40;
const SPREAD_DAYS = 60;

async function main() {
  // Clear in dependency order so the seed can be re-run safely.
  await prisma.statusHistory.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const users = [];
  for (const u of USERS) users.push(await prisma.user.create({ data: u }));

  const categories = [];
  for (const name of CATEGORIES) categories.push(await prisma.category.create({ data: { name } }));

  const now = Date.now();

  for (let i = 0; i < TICKET_COUNT; i++) {
    const category = pick(categories);
    const status = pick(STATUS_POOL);
    const priority = pick(PRIORITY_POOL);
    // Roughly 1 in 6 tickets is unassigned. Open tickets are more likely unassigned.
    const unassigned = rand() < (status === 'OPEN' ? 0.35 : 0.1);
    const assignee = unassigned ? null : pick(users);

    // Oldest ticket first, spread across the window.
    const createdAt = new Date(now - (SPREAD_DAYS - (i * SPREAD_DAYS) / TICKET_COUNT) * DAY);

    const path = pick(PATHS[status]);
    const history = [];
    let cursor = createdAt.getTime();
    path.forEach((toStatus, idx) => {
      if (idx > 0) cursor += Math.floor((2 + rand() * 46) * HOUR);
      cursor = Math.min(cursor, now);
      history.push({
        fromStatus: idx === 0 ? null : path[idx - 1],
        toStatus,
        changedAt: new Date(cursor),
      });
    });

    await prisma.ticket.create({
      data: {
        title: pick(TITLES[category.name]),
        description: pick(DESCRIPTIONS),
        priority,
        status,
        categoryId: category.id,
        assigneeId: assignee ? assignee.id : null,
        createdAt,
        updatedAt: history[history.length - 1].changedAt,
        history: { create: history },
      },
    });
  }

  const [tickets, histories] = await Promise.all([
    prisma.ticket.count(),
    prisma.statusHistory.count(),
  ]);
  console.log(
    `Seeded ${users.length} users, ${categories.length} categories, ${tickets} tickets, ${histories} history rows.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
