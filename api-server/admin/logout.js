import { sendError } from '../_lib/errors.js';

/**
 * POST /api/admin/logout — Hapus cookie sesi admin.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }
  res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  return res.status(200).json({ ok: true });
}
