import { verifyToken } from './jwt.js';
import { sendError } from './errors.js';

/**
 * Middleware verifikasi JWT untuk Vercel serverless functions.
 * Membaca header Authorization: Bearer <token>, verifikasi,
 * lalu inject req.userId dan req.username.
 *
 * Gunakan sebagai wrapper: export default requireAuth(async (req, res) => { ... })
 */
export default function requireAuth(handler) {
  return async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 401, 'UNAUTHORIZED', 'Silakan login terlebih dahulu.');
      }

      const token = authHeader.slice(7); // Hapus prefix "Bearer "
      const payload = verifyToken(token);

      // Inject ke req object
      req.userId = payload.userId;
      req.username = payload.username;

      return handler(req, res);
    } catch (err) {
      // Token expired atau invalid
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'UNAUTHORIZED', 'Sesi habis, silakan login kembali.');
      }
      console.error(`[requireAuth] ${new Date().toISOString()} Unexpected error:`, err.message);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
    }
  };
}
