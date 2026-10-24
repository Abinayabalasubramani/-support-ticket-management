const AppError = require('../utils/AppError');

// Validates req.body / req.params / req.query against Zod schemas.
// Parsed (coerced, trimmed, defaulted) values replace the raw ones.
const validate = (schemas) => (req, res, next) => {
  const details = [];

  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part]);
    if (result.success) {
      req[part] = result.data;
    } else {
      for (const issue of result.error.issues) {
        details.push({
          location: part,
          field: issue.path.join('.') || '(root)',
          message: issue.message,
        });
      }
    }
  }

  if (details.length) {
    return next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details));
  }
  next();
};

module.exports = validate;
