import { db } from './db/client.js';
import { users, redeemCodes, redeemCodeUses } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';
import { checkRateLimit } from './_lib/rateLimit.js';

/**
 * POST /api/redeem — Tukarkan kode promo. Body: { code }.
 * Validasi: aktif, dalam rentang tanggal, belum dipakai user, kuota belum habis.
 * Semua atomik dalam transaksi (race-safe: cap kuota + unique per-user).
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  // Batasi percobaan (anti tebak-kode)
  if (!checkRateLimit(`redeem:${req.userId}`, 10, 60_000)) {
    return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak percobaan. Coba lagi nanti.');
  }

  const raw = (req.body?.code || '').toString().trim().toUpperCase();
  if (raw.length < 3 || raw.length > 40) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Kode tidak valid.');
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [code] = await tx.select().from(redeemCodes).where(eq(redeemCodes.code, raw)).limit(1);
      if (!code) throw { status: 404, code: 'CODE_INVALID', message: 'Kode tidak ditemukan.' };
      if (!code.isActive) throw { status: 400, code: 'CODE_INACTIVE', message: 'Kode ini tidak aktif.' };

      const now = new Date();
      if (now < new Date(code.startsAt)) throw { status: 400, code: 'CODE_NOT_STARTED', message: 'Kode belum berlaku.' };
      if (now > new Date(code.endsAt)) throw { status: 400, code: 'CODE_EXPIRED', message: 'Kode sudah kadaluarsa.' };

      // Sudah pernah dipakai user ini?
      const [used] = await tx.select({ id: redeemCodeUses.id }).from(redeemCodeUses)
        .where(and(eq(redeemCodeUses.codeId, code.id), eq(redeemCodeUses.userId, req.userId))).limit(1);
      if (used) throw { status: 409, code: 'ALREADY_USED', message: 'Kamu sudah menukarkan kode ini.' };

      // Naikkan used_count race-safe dengan batas maxUses
      const [bumped] = await tx.update(redeemCodes)
        .set({ usedCount: sql`${redeemCodes.usedCount} + 1` })
        .where(and(
          eq(redeemCodes.id, code.id),
          sql`(${redeemCodes.maxUses} IS NULL OR ${redeemCodes.usedCount} < ${redeemCodes.maxUses})`
        ))
        .returning({ usedCount: redeemCodes.usedCount });
      if (!bumped) throw { status: 409, code: 'CODE_EXHAUSTED', message: 'Kuota kode ini sudah habis.' };

      // Catat pemakaian (unique constraint = backstop race per-user)
      await tx.insert(redeemCodeUses).values({ codeId: code.id, userId: req.userId });

      // Grant coin atomik
      const [u] = await tx.update(users)
        .set({ coins: sql`${users.coins} + ${code.coinReward}` })
        .where(eq(users.id, req.userId))
        .returning({ coins: users.coins });

      return { coinReward: code.coinReward, coins: u.coins };
    });

    return res.status(200).json({
      message: `Berhasil! +${result.coinReward} coin ditambahkan 🪙`,
      coinReward: result.coinReward,
      coins: result.coins,
    });
  } catch (err) {
    if (err?.status && err?.code) return sendError(res, err.status, err.code, err.message);
    if (err?.code === '23505') return sendError(res, 409, 'ALREADY_USED', 'Kamu sudah menukarkan kode ini.');
    logError('/api/redeem', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal menukarkan kode.');
  }
});
