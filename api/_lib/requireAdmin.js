import { sendError } from './errors.js';

/**
 * Middleware verifikasi ADMIN_SECRET.
 * Cek header Authorization: Bearer <ADMIN_SECRET> exact-match.
 * Untuk admin cookie-based login, cek juga cookie admin_session.
 */
export default function requireAdmin(handler) {
  return async (req, res) => {
    const ADMIN_SECRET = process.env.ADMIN_SECRET;

    if (!ADMIN_SECRET) {
      console.error('[requireAdmin] ADMIN_SECRET tidak dikonfigurasi.');
      return sendError(res, 500, 'INTERNAL_ERROR', 'Konfigurasi server tidak lengkap.');
    }

    // Cek header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token === ADMIN_SECRET) {
        return handler(req, res);
      }
    }

    // Cek cookie admin_session (untuk UI admin setelah login via /api/admin/login)
    // Cookie diset oleh endpoint admin/login.js dengan httpOnly
    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies.admin_session === ADMIN_SECRET) {
      return handler(req, res);
    }

    return sendError(res, 403, 'FORBIDDEN', 'Akses ditolak. Admin secret tidak valid.');
  };
}

/**
 * Parse cookie string ke object key-value.
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [key, ...val] = pair.trim().split('=');
    if (key) cookies[key] = val.join('=');
  });
  return cookies;
}
