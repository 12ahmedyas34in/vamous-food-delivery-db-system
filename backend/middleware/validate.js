// backend/middleware/validate.js
// Zod validation middleware (for new endpoints only)

const { errorResponse } = require('../utils/response');
const logger            = require('../config/logger');

/**
 * @param {import('zod').ZodSchema} schema
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field:   issue.path.join('.'),
      message: issue.message,
    }));

    logger.warn(
      { path: req.originalUrl, method: req.method, errors },
      'Request validation failed'
    );

    return errorResponse(res, 'Validation failed', 400, errors);
  }

  req.body = result.data;
  next();
};

module.exports = validate;
