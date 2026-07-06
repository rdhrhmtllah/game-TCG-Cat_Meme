import { adminLoginSchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';
import { checkRateLimit } from '../_lib/rateLimit.js';
import { verifyTurnstile } from '../_lib/turnstile.js';

/**
 * POST /api/admin/login
 * Validasi ADMIN_SECRET, set cookie httpOnly admin_session.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  // Rate limit percobaan tebak secret admin (5x/menit per IP)
  if (!checkRateLimit(`adminlogin:${ip}`, 5, 60_000)) {
    return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak percobaan. Coba lagi nanti.');
  }

  try {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    // Verifikasi anti-bot (Turnstile) sebelum cek secret
    const captcha = await verifyTurnstile(req.body?.turnstileToken, ip);
    if (!captcha.ok) {
      return sendError(res, 400, 'CAPTCHA_FAILED', captcha.reason);
    }

    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (parsed.data.secret !== ADMIN_SECRET) {
      return sendError(res, 403, 'FORBIDDEN', 'Secret tidak valid.');
    }

    const ttl = parsed.data.ttl || 43200;

    // Set cookie httpOnly untuk persistensi sesi admin di browser
    res.setHeader('Set-Cookie', `admin_session=${ADMIN_SECRET}; HttpOnly; Path=/; Max-Age=${ttl}; SameSite=Lax`);

    return res.status(200).json({ message: 'Login admin berhasil.', ttl });
  } catch (err) {
    logError('/api/admin/login', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
}
