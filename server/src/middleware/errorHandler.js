const { Prisma } = require('@prisma/client');
const AppError = require('../utils/AppError');
const { NODE_ENV } = require('../config/env');

const body = (code, message, details) => ({
  error: { code, message, ...(details ? { details } : {}) },
});

// Single place where every error becomes an HTTP response.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json(body(err.code, err.message, err.details));
  }

  // Malformed JSON in the request body.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(body('INVALID_JSON', 'Request body is not valid JSON'));
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json(body('NOT_FOUND', 'Record not found'));
    }
    if (err.code === 'P2003') {
      return res.status(400).json(body('INVALID_REFERENCE', 'Referenced record does not exist'));
    }
    if (err.code === 'P2002') {
      return res.status(409).json(body('DUPLICATE', 'A record with these values already exists'));
    }
  }

  console.error(err);
  const message = NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json(body('INTERNAL_ERROR', message));
};

module.exports = errorHandler;
