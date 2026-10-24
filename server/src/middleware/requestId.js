const { randomUUID } = require('crypto');

// Gives every request an id, returned in the X-Request-Id header and attached to any
// error body and log line, so one failing request can be traced end to end.
const requestId = (req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};

module.exports = requestId;
