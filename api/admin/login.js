import { adminLoginSchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * POST /api/admin/login
 * Validasi ADMIN_SECRET, set cookie httpOnly admin_session.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (parsed.data.secret !== ADMIN_SECRET) {
      return sendError(res, 403, 'FORBIDDEN', 'Secret tidak valid.');
    }

    // Set cookie httpOnly untuk persistensi sesi admin di browser
    res.setHeader('Set-Cookie', `admin_session=${ADMIN_SECRET}; HttpOnly; Path=/; Max-Age=43200; SameSite=Lax`);

    return res.status(200).json({ message: 'Login admin berhasil.' });
  } catch (err) {
    logError('/api/admin/login', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
}
