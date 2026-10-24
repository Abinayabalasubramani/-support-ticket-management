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

module.exports = { createLimiters };
