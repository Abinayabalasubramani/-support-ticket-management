const rateLimit = require('express-rate-limit');

const tooMany = (req, res) =>
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a moment and try again.',
      requestId: req.id,
    },
  });

// Two limits per client IP, per minute:
//   general  every request            (generous: one page load makes several calls)
//   writes   create/edit/delete/bulk  (stricter: these change data)
// Limits are counted in memory, which is right for a single server instance. With several
// instances a shared store (Redis) would be needed.
function createLimiters({ generalPerMinute = 300, writesPerMinute = 60, skip = () => false } = {}) {
  const base = {
    windowMs: 60 * 1000,
    standardHeaders: 'draft-7', // RateLimit-* headers tell clients how much is left
    legacyHeaders: false,
    handler: tooMany,
  };

  return {
    general: rateLimit({ ...base, limit: generalPerMinute, skip }),
    writes: rateLimit({
      ...base,
      limit: writesPerMinute,
      skip: (req) => skip(req) || ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
    }),
  };
}

// Brute-force protection for the login form: only FAILED attempts count, so a person who
// types the right password is never locked out, but guessing is capped per IP.
function createLoginLimiter({ limit = 10, windowMs = 15 * 60 * 1000, skip = () => false } = {}) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip,
    handler: (req, res) =>
      res.status(429).json({
        error: {
          code: 'TOO_MANY_LOGIN_ATTEMPTS',
          message: 'Too many failed sign-in attempts. Please wait a few minutes and try again.',
          requestId: req.id,
        },
      }),
  });
}

module.exports = { createLimiters, createLoginLimiter };
