const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ status: 'success', message, data });
};

const errorResponse = (res, message = 'Something went wrong', statusCode = 400, errors = null) => {
  const body = { status: 'error', message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { successResponse, errorResponse };
