// backend/middleware/requestLogger.js
// HTTP request logger using pino-http

const pinoHttp = require('pino-http');
const logger   = require('../config/logger');

const requestLogger = pinoHttp({
  logger,

  // 5xx = error, 4xx = warn, others = info
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400)        return 'warn';
    return 'info';
  },

  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} — ${res.statusCode}`,

  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} — ${res.statusCode} — ${err.message}`,

  // Redact sensitive data
  redact: {
    paths:  ['req.headers.authorization', 'req.body.password'],
    censor: '[REDACTED]',
  },

  // Skip health check noise
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },

  serializers: {
    req: (req) => ({
      method: req.method,
      url:    req.url,
      userId: req.raw?.user?.id ?? undefined,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

module.exports = requestLogger;
