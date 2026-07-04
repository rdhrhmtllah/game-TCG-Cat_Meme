import jwt from 'jsonwebtoken';
import { logWarn } from './logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '7d';

// Validasi saat module load (development safety net)
if (!JWT_SECRET) {
  logWarn('jwt', 'JWT_SECRET tidak diset — autentikasi akan gagal. Cek file .env kamu.');
}

/**
 * Sign JWT token untuk user.
 * Payload: { userId, username }
 * @throws {Error} jika JWT_SECRET tidak diset
 */
export function signToken({ userId, username }) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET tidak dikonfigurasi di environment. Cek .env file.');
  }
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verifikasi dan decode JWT token.
 * Return payload { userId, username, iat, exp } atau throw error.
 */
export function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET tidak dikonfigurasi di environment. Cek .env file.');
  }
  return jwt.verify(token, JWT_SECRET);
}
