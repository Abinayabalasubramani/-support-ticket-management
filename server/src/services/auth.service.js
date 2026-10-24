const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const ISSUER = 'ticketflow-api';
const ALGORITHM = 'HS256';
const ROLES = ['ADMIN', 'AGENT'];

// Compared against when the email is unknown, so "no such user" takes as long as "wrong
// password" and the response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// The only user fields that ever leave the server. Never the password hash.
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

// The token carries the user id (sub) and role. It is signed, so it cannot be changed
// without the secret, and it expires on its own.
function signToken(user) {
  return jwt.sign({ role: user.role }, JWT_SECRET, {
    subject: String(user.id),
    expiresIn: JWT_EXPIRES_IN,
    issuer: ISSUER,
    algorithm: ALGORITHM,
  });
}

// Throws (TokenExpiredError / JsonWebTokenError) unless the token is genuine and current.
// Only HS256 is accepted, so a token that claims "alg: none" is refused.
function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: [ALGORITHM], issuer: ISSUER });
  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0 || !ROLES.includes(payload.role)) {
    throw new jwt.JsonWebTokenError('invalid claims');
  }
  return { id, role: payload.role };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always run a comparison, even for an unknown user, and give one message for every failure.
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !matches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  }
  return { token: signToken(user), user: publicUser(user) };
}

async function getCurrentUser(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  return publicUser(user);
}

module.exports = { login, signToken, verifyToken, getCurrentUser, ROLES };
