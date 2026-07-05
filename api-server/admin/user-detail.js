import { db } from '../db/client.js';
import { users, userInventory, userAchievements } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import requireAdmin from '../_lib/requireAdmin.js';
import { sendError, logError } from '../_lib/errors.js';
import { computeLevel } from '../_lib/progression.js';

/**
 * GET /api/admin/user-detail?id= — Detail lengkap satu user (tanpa passwordHash).
 */
export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const id = parseInt(url.searchParams.get('id') || '');
    if (!id) return sendError(res, 400, 'VALIDATION_ERROR', 'Parameter id diperlukan.');

    const [user] = await db.select({
      id: users.id, username: users.username, email: users.email,
      coins: users.coins, xp: users.xp, level: users.level,
      loginStreak: users.loginStreak, lastLoginDate: users.lastLoginDate,
      createdAt: users.createdAt, lastClaimedAt: users.lastClaimedAt,
      pityCounter: users.pityCounter, referralCode: users.referralCode,
      hasSeenTour: users.hasSeenTour, banned: users.banned,
    }).from(users).where(eq(users.id, id)).limit(1);

    if (!user) return sendError(res, 404, 'NOT_FOUND', 'User tidak ditemukan.');

    const [inv, ach] = await Promise.all([
      db.select({
        totalCards: sql`COALESCE(SUM(${userInventory.quantity}), 0)`,
        uniqueCards: sql`COUNT(DISTINCT ${userInventory.cardId})`,
        showcaseCount: sql`COUNT(*) FILTER (WHERE ${userInventory.inShowcase} = true)`,
      }).from(userInventory).where(eq(userInventory.userId, id)),
      db.select({ count: sql`COUNT(*)` }).from(userAchievements).where(eq(userAchievements.userId, id)),
    ]);

    // Info progres level untuk konteks (xp ke level berikutnya)
    const levelInfo = computeLevel(user.xp);

    return res.status(200).json({
      user: {
        ...user,
        totalCards: Number(inv[0].totalCards),
        uniqueCards: Number(inv[0].uniqueCards),
        showcaseCount: Number(inv[0].showcaseCount),
        achievementsCount: Number(ach[0].count),
        levelInfo: { xpIntoLevel: levelInfo.xpIntoLevel, xpForNext: levelInfo.xpForNext },
      },
    });
  } catch (err) {
    logError('/api/admin/user-detail', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal mengambil detail user.');
  }
});
