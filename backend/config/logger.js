// Pino structured logger
// Pino writes structured JSON by default — ideal for Render's log aggregator.

// Usage in any controller or service:
//   const logger = require('../config/logger');
//   logger.info({ orderId: 1, userId: 3 }, 'Order created');
//   logger.warn({ ms: 850 }, 'Slow query detected');
//   logger.error({ err }, 'Unexpected failure');
// Note: Pino's convention is (object, message) — NOT (message, object).

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  // Use debug level in development, info in production
  level: isDev ? 'debug' : 'info',

  // Pretty printing in development, raw JSON in production
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize:      true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore:        'pid,hostname',   // remove noise in dev output
          messageFormat: '{msg}',
        },
      }
    : undefined,  // undefined = default JSON to stdout
});

module.exports = logger;
