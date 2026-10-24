const AppError = require('../utils/AppError');

// Use after `authenticate`: only the listed roles may continue.
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do that.'));

module.exports = requireRole;
