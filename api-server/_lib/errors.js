import { logError as log } from './logger.js';

/**
 * Format dan kirim error response standar.
 * Semua endpoint WAJIB menggunakan helper ini untuk konsistensi.
 *
 * @param {import('http').ServerResponse} res
 * @param {number} status - HTTP status code
 * @param {string} code - Error code constant (dari Bagian 7.1 PRD)
 * @param {string} message - Pesan ramah untuk user
 */
export function sendError(res, status, code, message) {
  res.status(status).json({ message, code });
}

/**
 * Log error server-side dengan timestamp dan context.
 * TIDAK expose stack trace ke client.
 * Gunakan ini untuk log error yang tidak terduga (500).
 *
 * @param {string} context - Di mana error terjadi (misal endpoint path)
 * @param {Error} err - Error object
 */
export function logError(context, err) {
  log(context, err);
}
