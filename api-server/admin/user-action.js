import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import requireAdmin from '../_lib/requireAdmin.js';
import { adminUserActionSchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';
import { computeLevel, xpForLevel } from '../_lib/progression.js';

const BCRYPT_COST = 10;

// Total XP minimum untuk berada di suatu level (Σ xpForLevel(1..level-1)).
function totalXpForLevel(level) {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpForLevel(l);
  return sum;
}

/**
 * POST /api/admin/user-action — Aksi admin ke satu user.
 * Body: { userId, action, amount?, value?, password? }
 * action: grant_xp | grant_coins | set_xp | set_coins | set_level | ban | unban | reset_password | delete
 */
export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  const parsed = adminUserActionSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
  }
  const { userId, action, amount, value, password } = parsed.data;

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return sendError(res, 404, 'NOT_FOUND', 'User tidak ditemukan.');

    switch (action) {
      case 'delete':
        await db.delete(users).where(eq(users.id, userId));
        return res.status(200).json({ ok: true, deleted: true });

      case 'ban':
      case 'unban':
        await db.update(users).set({ banned: action === 'ban' }).where(eq(users.id, userId));
        break;

      case 'reset_password': {
        if (!password) return sendError(res, 400, 'VALIDATION_ERROR', 'Password baru diperlukan (min 8 karakter).');
        const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
        await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
        break;
      }

      case 'grant_coins': {
        if (amount == null) return sendError(res, 400, 'VALIDATION_ERROR', 'amount diperlukan.');
        await db.update(users)
          .set({ coins: sql`GREATEST(0, ${users.coins} + ${amount})` })
          .where(eq(users.id, userId));
        break;
      }
      case 'set_coins': {
        if (value == null) return sendError(res, 400, 'VALIDATION_ERROR', 'value diperlukan.');
        await db.update(users).set({ coins: value }).where(eq(users.id, userId));
        break;
      }

      case 'grant_xp': {
        if (amount == null) return sendError(res, 400, 'VALIDATION_ERROR', 'amount diperlukan.');
        const newXp = Math.max(0, user.xp + amount);
        await db.update(users)
          .set({ xp: newXp, level: computeLevel(newXp).level })
          .where(eq(users.id, userId));
        break;
      }
      case 'set_xp': {
        if (value == null) return sendError(res, 400, 'VALIDATION_ERROR', 'value diperlukan.');
        await db.update(users)
          .set({ xp: value, level: computeLevel(value).level })
          .where(eq(users.id, userId));
        break;
      }
      case 'set_level': {
        if (value == null || value < 1) return sendError(res, 400, 'VALIDATION_ERROR', 'Level minimal 1.');
        const lvl = Math.min(999, value);
        const newXp = totalXpForLevel(lvl);
        await db.update(users).set({ xp: newXp, level: lvl }).where(eq(users.id, userId));
        break;
      }

      default:
        return sendError(res, 400, 'VALIDATION_ERROR', 'Aksi tidak dikenal.');
    }

    // Kembalikan user terbaru (aman) untuk refresh baris di UI
    const [updated] = await db.select({
      id: users.id, username: users.username, email: users.email,
      coins: users.coins, xp: users.xp, level: users.level,
      loginStreak: users.loginStreak, banned: users.banned,
    }).from(users).where(eq(users.id, userId)).limit(1);

    return res.status(200).json({ ok: true, user: updated });
  } catch (err) {
    logError('/api/admin/user-action', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal menjalankan aksi.');
  }
});
