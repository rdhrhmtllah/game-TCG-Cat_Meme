import { db } from './db/client.js';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';

/**
 * GET /api/me
 * Ambil profil user yang sedang login.
 * TIDAK mengembalikan passwordHash.
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      coins: users.coins,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      lastClaimedAt: users.lastClaimedAt,
    })
      .from(users)
      .where(eq(users.id, req.userId))
      .limit(1);

    if (!user) {
      return sendError(res, 404, 'NOT_FOUND', 'User tidak ditemukan.');
    }

    return res.status(200).json({ user });
  } catch (err) {
    logError('/api/me', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
