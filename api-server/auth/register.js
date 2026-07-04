import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { registerSchema } from '../_lib/schemas.js';
import { signToken } from '../_lib/jwt.js';
import { sendError, logError } from '../_lib/errors.js';
import { checkRateLimit } from '../_lib/rateLimit.js';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 10;

/**
 * POST /api/auth/register
 * Registrasi user baru — username + password, auto-login dengan JWT.
 */
export default async function handler(req, res) {
  // Rate limit: 5x/menit per IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`register:${ip}`, 5, 60_000)) {
    return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak percobaan. Coba lagi nanti.');
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    // Validasi input
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return sendError(res, 400, 'VALIDATION_ERROR', firstError.message);
    }

    const { username, password } = parsed.data;
    const normalizedUsername = username.toLowerCase();

    // Cek username unik
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);

    if (existing.length > 0) {
      return sendError(res, 409, 'USERNAME_TAKEN', 'Username sudah digunakan.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    // Insert user
    const [newUser] = await db.insert(users)
      .values({
        username: normalizedUsername,
        passwordHash,
        coins: 500,
      })
      .returning({
        id: users.id,
        username: users.username,
        coins: users.coins,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      });

    // Auto-login: sign JWT
    const token = signToken({ userId: newUser.id, username: newUser.username });

    return res.status(201).json({
      message: 'Akun berhasil dibuat! Selamat datang di MemeCats!',
      user: newUser,
      token,
    });
  } catch (err) {
    logError('/api/auth/register', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
}
