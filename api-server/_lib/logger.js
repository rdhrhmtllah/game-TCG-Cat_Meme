/**
 * Structured logger — pino + pino-pretty untuk development.
 * Semua module API menggunakan logger ini untuk konsistensi.
 *
 * Di production (NODE_ENV=production), output JSON untuk Vercel Logs.
 * Di development, pino-pretty memformat output agar mudah dibaca.
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: isProduction ? 'info' : 'debug',
  base: undefined, // hilangkan pid, hostname — bersih
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            messageFormat: '[{context}] {msg}',
            errorLikeObjectKeys: ['err', 'error'],
          },
        },
      }),
});

/**
 * Log request masuk (method, path, status, duration).
 */
export function logRequest(method, path, status, durationMs) {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  logger[level]({ method, path, status, durationMs }, `${method} ${path} → ${status} (${durationMs}ms)`);
}

/**
 * Log error dengan context (endpoint path, user info opsional).
 */
export function logError(context, err) {
  logger.error({ context, err: { message: err.message, stack: err.stack, code: err.code } }, `[${context}] ${err.message}`);
}

/**
 * Log info umum.
 */
export function logInfo(context, msg, data) {
  logger.info({ context, ...(data && { data }) }, msg);
}

/**
 * Log warning.
 */
export function logWarn(context, msg, data) {
  logger.warn({ context, ...(data && { data }) }, msg);
}

export default logger;
