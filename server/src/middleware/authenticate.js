const { TokenExpiredError } = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../services/auth.service');

const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');

// Requires "Authorization: Bearer <token>" with a genuine, unexpired token.
// On success the request carries req.user = { id, role }.
// The token is trusted until it expires (no database lookup per request), so a role change
// or a removed user takes effect at the next login.
function authenticate(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return next(unauthenticated());

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.'));
    }
    return next(unauthenticated());
  }
}

module.exports = authenticate;
