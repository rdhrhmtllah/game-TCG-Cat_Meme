import { db } from '../db/client.js';
import { users, masterCards } from '../db/schema.js';
import { desc, sql } from 'drizzle-orm';
import requireAdmin from '../_lib/requireAdmin.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * GET /api/admin/stats — Ringkasan dashboard admin.
 * Agregat user, ekonomi, kartu, dan top users.
 */
export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const [userAgg, cardAgg, topUsers] = await Promise.all([
      db.select({
        total: sql`COUNT(*)`,
        newToday: sql`COUNT(*) FILTER (WHERE ${users.createdAt} >= CURRENT_DATE)`,
        new7d: sql`COUNT(*) FILTER (WHERE ${users.createdAt} >= CURRENT_DATE - INTERVAL '7 days')`,
        activeToday: sql`COUNT(*) FILTER (WHERE ${users.lastLoginDate} = CURRENT_DATE)`,
        banned: sql`COUNT(*) FILTER (WHERE ${users.banned} = true)`,
        totalCoins: sql`COALESCE(SUM(${users.coins}), 0)`,
        totalXp: sql`COALESCE(SUM(${users.xp}), 0)`,
        avgLevel: sql`COALESCE(ROUND(AVG(${users.level})::numeric, 1), 0)`,
        maxLevel: sql`COALESCE(MAX(${users.level}), 0)`,
      }).from(users),

      db.select({
        total: sql`COUNT(*)`,
        active: sql`COUNT(*) FILTER (WHERE ${masterCards.isActive} = true)`,
      }).from(masterCards),

      db.select({
        id: users.id,
        username: users.username,
        level: users.level,
        xp: users.xp,
        coins: users.coins,
        banned: users.banned,
      }).from(users).orderBy(desc(users.xp)).limit(5),
    ]);

    const u = userAgg[0];
    const c = cardAgg[0];

    return res.status(200).json({
      users: {
        total: Number(u.total),
        newToday: Number(u.newToday),
        new7d: Number(u.new7d),
        activeToday: Number(u.activeToday),
        banned: Number(u.banned),
      },
      economy: {
        totalCoins: Number(u.totalCoins),
        totalXp: Number(u.totalXp),
        avgLevel: Number(u.avgLevel),
        maxLevel: Number(u.maxLevel),
      },
      cards: {
        total: Number(c.total),
        active: Number(c.active),
      },
      topUsers: topUsers.map(t => ({
        id: t.id, username: t.username, level: t.level, xp: t.xp, coins: t.coins, banned: t.banned,
      })),
    });
  } catch (err) {
    logError('/api/admin/stats', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal mengambil statistik.');
  }
});
