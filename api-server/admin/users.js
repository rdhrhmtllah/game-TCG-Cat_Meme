import { db } from '../db/client.js';
import { users, userInventory } from '../db/schema.js';
import { and, eq, or, ilike, asc, desc, sql } from 'drizzle-orm';
import requireAdmin from '../_lib/requireAdmin.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * GET /api/admin/users — Daftar user dengan search/filter/sort/paginasi.
 * Query: page, limit(≤50), search(username/email), sort, sortDir, filter(all|banned|active)
 */
export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;
    const search = (url.searchParams.get('search') || '').trim();
    const filter = url.searchParams.get('filter') || 'all'; // all | banned | active
    const sortBy = url.searchParams.get('sort') || 'createdAt';
    const sortDir = url.searchParams.get('sortDir') || 'desc';

    const conditions = [];
    if (search) {
      conditions.push(or(
        ilike(users.username, `%${search}%`),
        ilike(users.email, `%${search}%`),
      ));
    }
    if (filter === 'banned') conditions.push(eq(users.banned, true));
    else if (filter === 'active') conditions.push(eq(users.banned, false));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const sortColumns = {
      createdAt: users.createdAt, coins: users.coins, xp: users.xp,
      level: users.level, username: users.username, loginStreak: users.loginStreak,
    };
    const sortColumn = sortColumns[sortBy] || users.createdAt;
    const orderFn = sortDir === 'asc' ? asc : desc;

    // Jumlah kartu unik dimiliki per user (subquery)
    let listQuery = db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      coins: users.coins,
      xp: users.xp,
      level: users.level,
      loginStreak: users.loginStreak,
      createdAt: users.createdAt,
      banned: users.banned,
      cardsOwned: sql`(SELECT COUNT(DISTINCT ${userInventory.cardId}) FROM ${userInventory} WHERE ${userInventory.userId} = ${users.id})`,
    }).from(users);
    if (whereClause) listQuery = listQuery.where(whereClause);
    const list = await listQuery.orderBy(orderFn(sortColumn)).limit(limit).offset(offset);

    let countQuery = db.select({ count: sql`COUNT(*)` }).from(users);
    if (whereClause) countQuery = countQuery.where(whereClause);
    const total = Number((await countQuery)[0].count);

    return res.status(200).json({
      users: list.map(u => ({ ...u, cardsOwned: Number(u.cardsOwned) })),
      pagination: { page, limit, total },
    });
  } catch (err) {
    logError('/api/admin/users', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal mengambil daftar user.');
  }
});
