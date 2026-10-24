const { Prisma } = require('@prisma/client');
const AppError = require('../utils/AppError');

// Prisma codes meaning "the database could not be reached or answered in time".
const DB_UNAVAILABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

const body = (req, code, message, details) => ({
  error: { code, message, ...(details ? { details } : {}), requestId: req.id },
});

// One line of JSON per failure: easy to search in the host's log viewer.
const logError = (req, err) =>
  console.error(
    JSON.stringify({
      level: 'error',
      requestId: req.id,
      method: req.method,
      path: req.originalUrl.split('?')[0], // never log the query string (it can hold a stream ticket)
      name: err.name,
      code: err.code,
      message: err.message,
      stack: err.stack,
    })
  );

const isDatabaseUnavailable = (err) =>
  err instanceof Prisma.PrismaClientInitializationError ||
  (err instanceof Prisma.PrismaClientKnownRequestError && DB_UNAVAILABLE_CODES.has(err.code));

// The only place errors become HTTP responses. Clients only ever see messages written
// for them here: raw error text (SQL, file paths, hosts) is logged, never returned,
// in every environment.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Errors we raised on purpose, with a message meant for the user.
  if (err instanceof AppError) {
    return res.status(err.status).json(body(req, err.code, err.message, err.details));
  }

  // Problems with the request itself.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(body(req, 'INVALID_JSON', 'Request body is not valid JSON'));
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json(body(req, 'PAYLOAD_TOO_LARGE', 'Request body is too large'));
  }

  // Known database situations.
  if (isDatabaseUnavailable(err)) {
    logError(req, err);
    return res.status(503).json(body(req, 'DATABASE_UNAVAILABLE', 'The service is temporarily unavailable. Please try again in a moment.'));
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json(body(req, 'NOT_FOUND', 'Record not found'));
    if (err.code === 'P2003') return res.status(400).json(body(req, 'INVALID_REFERENCE', 'Referenced record does not exist'));
    if (err.code === 'P2002') return res.status(409).json(body(req, 'DUPLICATE', 'A record with these values already exists'));
  }

  // Anything else is our bug: log everything, tell the client nothing internal.
  logError(req, err);
  return res.status(500).json(body(req, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.'));
};

module.exports = errorHandler;
