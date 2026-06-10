// backend/utils/response.js

// ─── SCOPE NOTICE ──────────────────────────────────────────────────────────────
// Use ONLY for new endpoints.
// Existing controllers return different response shapes — do not use these
// helpers on them yet or you will break the frontend.
/**
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} message
 * @param {number} statusCode
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ status: 'success', message, data });
};

/**
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 * @param {Array} errors
 */
const errorResponse = (res, message = 'Something went wrong', statusCode = 400, errors = null) => {
  const body = { status: 'error', message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { successResponse, errorResponse };