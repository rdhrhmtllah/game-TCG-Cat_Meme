/**
 * Structured logger — pino (JSON) untuk semua environment.
 * Semua module API memakai logger ini untuk konsistensi.
 *
 * CATATAN: SENGAJA tidak memakai transport `pino-pretty`. Transport pino
 * dijalankan lewat worker-thread & di-resolve dari string target saat runtime;
 * di bundle serverless Vercel `pino-pretty` tidak ikut ter-trace, sehingga
 * `pino({ transport: { target: 'pino-pretty' }})` CRASH ("unable to determine
 * transport target for pino-pretty") dan mematikan seluruh fungsi API.
 * JSON line sudah cukup terbaca di dev & ditangkap rapi oleh Vercel Logs.
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: isProduction ? 'info' : 'debug',
  base: undefined, // hilangkan pid, hostname — bersih
  timestamp: pino.stdTimeFunctions.isoTime,
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
