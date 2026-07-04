import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { loginSchema } from '../_lib/schemas.js';
import { signToken } from '../_lib/jwt.js';
import { sendError, logError } from '../_lib/errors.js';
import { checkRateLimit } from '../_lib/rateLimit.js';
import { logInfo } from '../_lib/logger.js';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/login
 * Login dengan username + password, return JWT.
 */
export default async function handler(req, res) {
  // Rate limit: 5x/menit per IP DAN per username
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    // Validasi input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return sendError(res, 400, 'VALIDATION_ERROR', firstError.message);
    }

    const { username, password } = parsed.data;
    const normalizedUsername = username.toLowerCase();
    logInfo('login', `🔐 Login attempt: ${normalizedUsername}`, { ip });

    // Rate limit by IP
    if (!checkRateLimit(`login:ip:${ip}`, 5, 60_000)) {
      return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak percobaan. Coba lagi nanti.');
    }

    // Rate limit by username (anti-brute force per akun)
    if (!checkRateLimit(`login:user:${normalizedUsername}`, 5, 60_000)) {
      return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak percobaan untuk akun ini. Coba lagi nanti.');
    }

    // Cari user
    logInfo('login', `🔍 Querying DB for: ${normalizedUsername}`);
    const [foundUser] = await db.select()
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);

    if (!foundUser) {
      logInfo('login', `❌ User not found: ${normalizedUsername}`);
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Username atau password salah.');
    }

    // Compare password
    logInfo('login', `🔑 Comparing password for: ${normalizedUsername}`);
    const isValid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!isValid) {
      logInfo('login', `❌ Invalid password for: ${normalizedUsername}`);
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Username atau password salah.');
    }

    // Sign JWT
    logInfo('login', `✍️ Signing JWT for: ${normalizedUsername} (userId=${foundUser.id})`);
    const token = signToken({ userId: foundUser.id, username: foundUser.username });

    logInfo('login', `✅ Login success: ${normalizedUsername}`);
    return res.status(200).json({
      message: 'Login berhasil! Selamat datang kembali!',
      user: {
        id: foundUser.id,
        username: foundUser.username,
        coins: foundUser.coins,
        avatarUrl: foundUser.avatarUrl,
        createdAt: foundUser.createdAt,
        lastClaimedAt: foundUser.lastClaimedAt,
      },
      token,
    });
  } catch (err) {
    logError('/api/auth/login', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
}
