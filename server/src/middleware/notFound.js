const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

module.exports = notFound;
