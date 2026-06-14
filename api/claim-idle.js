import { db } from './db/client.js';
import { users, userInventory, masterCards } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';
import { checkRateLimit } from './_lib/rateLimit.js';

const MAX_IDLE_SECONDS = 43200; // 12 jam
const COOLDOWN_SECONDS = 10;

/**
 * POST /api/claim-idle
 * JWT required. Klaim koin idle dari showcase.
 * Implementasi PERSIS sesuai Bagian 5.4 PRD.
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  // Rate limit: 10x/menit per user
  if (!checkRateLimit(`claim-idle:${req.userId}`, 10, 60_000)) {
    return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak klaim. Coba lagi nanti.');
  }

  try {
    // Ambil user
    const [user] = await db.select({
      id: users.id,
      coins: users.coins,
      lastClaimedAt: users.lastClaimedAt,
    })
      .from(users)
      .where(eq(users.id, req.userId));

    if (!user) {
      return sendError(res, 404, 'NOT_FOUND', 'User tidak ditemukan.');
    }

    // Hitung detik sejak klaim terakhir
    const now = Date.now();
    const lastClaimMs = new Date(user.lastClaimedAt).getTime();
    const secondsElapsed = Math.max(0, Math.floor((now - lastClaimMs) / 1000));

    // Cek cooldown
    if (secondsElapsed < COOLDOWN_SECONDS) {
      return sendError(res, 400, 'COOLDOWN_ACTIVE', `Tunggu minimal ${COOLDOWN_SECONDS} detik untuk klaim lagi!`);
    }

    // Cap ke 12 jam
    const cappedSeconds = Math.min(secondsElapsed, MAX_IDLE_SECONDS);

    // Ambil showcase cards
    const showcaseCards = await db.select({
      likesPerSec: masterCards.likesPerSec,
    })
      .from(userInventory)
      .innerJoin(masterCards, eq(userInventory.cardId, masterCards.id))
      .where(and(
        eq(userInventory.userId, req.userId),
        eq(userInventory.inShowcase, true)
      ));

    // Hitung total likes/sec
    const totalLikesPerSec = showcaseCards.reduce((sum, card) => sum + Number(card.likesPerSec), 0);

    // Edge case: showcase kosong → tetap klaim tapi 0 coin
    const coinsEarned = Math.floor(cappedSeconds * totalLikesPerSec);

    // Update user
    const [updatedUser] = await db.update(users)
      .set({
        coins: sql`coins + ${coinsEarned}`,
        lastClaimedAt: sql`NOW()`,
      })
      .where(eq(users.id, req.userId))
      .returning({ coins: users.coins });

    return res.status(200).json({
      message: coinsEarned > 0
        ? `Kamu mendapatkan ${coinsEarned} coin dari showcase!`
        : 'Isi showcase dengan kartu untuk mulai menghasilkan koin pasif!',
      coinsEarned,
      totalCurrentCoins: updatedUser[0].coins,
      secondsElapsed: cappedSeconds,
      totalLikesPerSec,
    });
  } catch (err) {
    logError('/api/claim-idle', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
