import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '7d';

/**
 * Sign JWT token untuk user.
 * Payload: { userId, username }
 */
export function signToken({ userId, username }) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verifikasi dan decode JWT token.
 * Return payload { userId, username, iat, exp } atau throw error.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
