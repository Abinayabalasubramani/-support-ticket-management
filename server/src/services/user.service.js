const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

// Never includes the password hash.
const present = (user, assignedTickets = 0) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  assignedTickets,
});

async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { tickets: true } } },
  });
  return users.map((user) => present(user, user._count.tickets));
}

async function createUser({ name, email, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { name, email, role, passwordHash } });
    return present(user);
  } catch (err) {
    // The unique index on email is the real guard: two simultaneous requests cannot both win.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'DUPLICATE_EMAIL', 'A user with this email already exists');
    }
    throw err;
  }
}

module.exports = { listUsers, createUser };
