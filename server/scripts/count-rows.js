// Read-only: prints row counts for whichever database .env points at.
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  console.log('tickets:', await prisma.ticket.count());
  console.log('users:', await prisma.user.count());
  console.log('categories:', await prisma.category.count());
  console.log('history rows:', await prisma.statusHistory.count());
  await prisma.$disconnect();
})();
