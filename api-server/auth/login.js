import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
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
    // "username" bisa berupa username ATAU email — normalisasi lowercase
    const identifier = username.trim().toLowerCase();
    logInfo('login', `🔐 Login attempt: ${identifier}`, { ip });

    // Rate limit by IP
    if (!checkRateLimit(`login:ip:${ip}`, 5, 60_000)) {
      return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak percobaan. Coba lagi nanti.');
    }

    // Rate limit by identifier (anti-brute force per akun)
    if (!checkRateLimit(`login:user:${identifier}`, 5, 60_000)) {
      return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak percobaan untuk akun ini. Coba lagi nanti.');
    }

    // Cari user berdasarkan username ATAU email
    logInfo('login', `🔍 Querying DB for: ${identifier}`);
    const [foundUser] = await db.select()
      .from(users)
      .where(or(eq(users.username, identifier), eq(users.email, identifier)))
      .limit(1);

    if (!foundUser) {
      logInfo('login', `❌ User not found: ${identifier}`);
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Username/email atau password salah.');
    }

    // Tolak user yang di-ban (sebelum sign token)
    if (foundUser.banned) {
      logInfo('login', `⛔ Banned user login blocked: ${identifier}`);
      return sendError(res, 403, 'BANNED', 'Akun kamu diblokir. Hubungi admin.');
    }

    // Compare password
    logInfo('login', `🔑 Comparing password for: ${identifier}`);
    const isValid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!isValid) {
      logInfo('login', `❌ Invalid password for: ${identifier}`);
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Username/email atau password salah.');
    }

    // Sign JWT
    logInfo('login', `✍️ Signing JWT for: ${identifier} (userId=${foundUser.id})`);
    const token = signToken({ userId: foundUser.id, username: foundUser.username });

    logInfo('login', `✅ Login success: ${identifier}`);
    return res.status(200).json({
      message: 'Login berhasil! Selamat datang kembali!',
      user: {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
        coins: foundUser.coins,
        avatarUrl: foundUser.avatarUrl,
        createdAt: foundUser.createdAt,
        lastClaimedAt: foundUser.lastClaimedAt,
        xp: foundUser.xp,
        level: foundUser.level,
        pityCounter: foundUser.pityCounter,
        hasSeenTour: foundUser.hasSeenTour,
      },
      token,
    });
  } catch (err) {
    logError('/api/auth/login', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
}
