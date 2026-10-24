// Read-only: shows each user's role and whether they have a password set (never the hash).
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  if (users.length === 0) console.log('No users in the database.');
  for (const u of users) {
    console.log(`#${u.id}  ${u.email.padEnd(28)} role=${u.role.padEnd(6)} password set: ${u.passwordHash ? 'yes' : 'NO'}`);
  }
  console.log('tickets:', await prisma.ticket.count());
  await prisma.$disconnect();
})();
