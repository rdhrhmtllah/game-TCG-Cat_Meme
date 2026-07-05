import { db } from './db/client.js';
import { users, userInventory } from './db/schema.js';
import { eq, sql, desc } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';

/**
 * GET /api/leaderboard?metric=level|collection|coins
 * Peringkat all-time. Top 50 + rank pemain sendiri.
 */
const LIMIT = 50;

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const metric = url.searchParams.get('metric') || 'level';
    if (!['level', 'collection', 'coins'].includes(metric)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Metric tidak valid.');
    }

    let top = [];
    let meValue = 0;
    let meRank = null;

    if (metric === 'collection') {
      // Ranking berdasarkan jumlah kartu unik (COUNT DISTINCT cardId)
      const rows = await db.select({
        id: users.id,
        username: users.username,
        level: users.level,
        value: sql`COUNT(DISTINCT ${userInventory.cardId})`.mapWith(Number),
      })
        .from(users)
        .leftJoin(userInventory, eq(userInventory.userId, users.id))
        .groupBy(users.id, users.username, users.level)
        .orderBy(desc(sql`COUNT(DISTINCT ${userInventory.cardId})`))
        .limit(LIMIT);
      top = rows.map((r, i) => ({ rank: i + 1, id: r.id, username: r.username, level: r.level, value: r.value }));

      // Nilai + rank pemain
      const [meRow] = await db.select({ value: sql`COUNT(DISTINCT ${userInventory.cardId})`.mapWith(Number) })
        .from(userInventory).where(eq(userInventory.userId, req.userId));
      meValue = meRow?.value || 0;
      const [{ higher }] = await db.select({
        higher: sql`COUNT(*)`.mapWith(Number),
      }).from(
        db.select({ uid: userInventory.userId, cnt: sql`COUNT(DISTINCT ${userInventory.cardId})`.as('cnt') })
          .from(userInventory).groupBy(userInventory.userId).as('sub')
      ).where(sql`sub.cnt > ${meValue}`);
      meRank = (higher || 0) + 1;
    } else {
      // level / coins — langsung dari users
      const col = metric === 'coins' ? users.coins : users.level;
      const order = metric === 'coins'
        ? [desc(users.coins), desc(users.level)]
        : [desc(users.level), desc(users.xp)];
      const rows = await db.select({
        id: users.id, username: users.username, level: users.level, coins: users.coins, xp: users.xp,
      }).from(users).orderBy(...order).limit(LIMIT);
      top = rows.map((r, i) => ({
        rank: i + 1, id: r.id, username: r.username, level: r.level,
        value: metric === 'coins' ? r.coins : r.level,
      }));

      const [me] = await db.select({ level: users.level, coins: users.coins })
        .from(users).where(eq(users.id, req.userId));
      meValue = metric === 'coins' ? (me?.coins || 0) : (me?.level || 1);
      const [{ higher }] = await db.select({ higher: sql`COUNT(*)`.mapWith(Number) })
        .from(users).where(sql`${col} > ${meValue}`);
      meRank = (higher || 0) + 1;
    }

    return res.status(200).json({
      metric,
      top,
      me: { rank: meRank, value: meValue, id: req.userId },
    });
  } catch (err) {
    logError('/api/leaderboard', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
