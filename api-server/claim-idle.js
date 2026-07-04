import { db } from './db/client.js';
import { users, userInventory, masterCards } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import { incrementMission } from './missions.js';

// ── Yield Constants ──────────────────────────────────────────
const MAX_IDLE_SECONDS = 86400;       // 24 jam (naik dari 43200)
const COOLDOWN_SECONDS = 10;         // cooldown antar klaim
const STREAK_MAX_DAYS = 14;          // max streak untuk multiplier
const STREAK_BONUS_PER_DAY = 0.05;   // +5% per hari streak
const COLLECTION_BONUS_PER_CARD = 0.03; // +0.03 likes/sec per kartu unik
const SYNERGY_BONUS_THRESHOLD = 3;   // minimal kartu element sama
const SYNERGY_BONUS_MULTIPLIER = 1.10; // +10% multiplier

/**
 * POST /api/claim-idle
 * JWT required. Klaim koin idle dari showcase + collection + streak + synergy.
 * Formula: (showcaseLikes + collectionBonus) × streakMult × synergyMult × waktu
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
    const result = await db.transaction(async (tx) => {
      // ── 1. Ambil user dengan lock ──────────────────────────
      const [user] = await tx.select({
        id: users.id,
        coins: users.coins,
        lastClaimedAt: users.lastClaimedAt,
        loginStreak: users.loginStreak,
      })
        .from(users)
        .where(eq(users.id, req.userId))
        ;

      if (!user) {
        throw { status: 404, code: 'NOT_FOUND', message: 'User tidak ditemukan.' };
      }

      // ── 2. Hitung waktu sejak klaim terakhir ────────────────
      const now = Date.now();
      const lastClaimMs = new Date(user.lastClaimedAt).getTime();
      const secondsElapsed = Math.max(0, Math.floor((now - lastClaimMs) / 1000));

      // Cek cooldown
      if (secondsElapsed < COOLDOWN_SECONDS) {
        throw {
          status: 400,
          code: 'COOLDOWN_ACTIVE',
          message: `Tunggu minimal ${COOLDOWN_SECONDS} detik untuk klaim lagi!`,
        };
      }

      const cappedSeconds = Math.min(secondsElapsed, MAX_IDLE_SECONDS);

      // ── 3. Ambil showcase cards ────────────────────────────
      const showcaseCards = await tx.select({
        likesPerSec: masterCards.likesPerSec,
        element: masterCards.element,
      })
        .from(userInventory)
        .innerJoin(masterCards, eq(userInventory.cardId, masterCards.id))
        .where(and(
          eq(userInventory.userId, req.userId),
          eq(userInventory.inShowcase, true)
        ));

      // ── 4. Hitung Base Showcase Rate ──────────────────────
      const baseShowcaseRate = showcaseCards.reduce(
        (sum, card) => sum + Number(card.likesPerSec), 0
      );

      // ── 5. Hitung Collection Bonus ────────────────────────
      const [uniqueResult] = await tx.select({
        count: sql`COUNT(DISTINCT ${userInventory.cardId})`,
      })
        .from(userInventory)
        .where(eq(userInventory.userId, req.userId));

      const uniqueCardsOwned = Number(uniqueResult.count);
      const collectionBonus = uniqueCardsOwned * COLLECTION_BONUS_PER_CARD;

      // ── 6. Hitung Streak Multiplier ────────────────────────
      const streak = Math.min(user.loginStreak || 0, STREAK_MAX_DAYS);
      const streakMultiplier = 1 + streak * STREAK_BONUS_PER_DAY;

      // ── 7. Hitung Synergy Multiplier ───────────────────────
      const elementCounts = {};
      for (const card of showcaseCards) {
        const el = card.element || 'Normal';
        elementCounts[el] = (elementCounts[el] || 0) + 1;
      }
      const hasSynergy = Object.values(elementCounts).some(
        count => count >= SYNERGY_BONUS_THRESHOLD
      );
      const synergyMultiplier = hasSynergy ? SYNERGY_BONUS_MULTIPLIER : 1.0;

      // ── 8. Hitung Effective Rate & Earnings ─────────────────
      const effectiveRate = (baseShowcaseRate + collectionBonus)
        * streakMultiplier
        * synergyMultiplier;

      const coinsEarned = Math.floor(cappedSeconds * effectiveRate);

      // ── 9. Update user ─────────────────────────────────────
      const [updatedUser] = await tx.update(users)
        .set({
          coins: sql`coins + ${coinsEarned}`,
          lastClaimedAt: sql`NOW()`,
        })
        .where(eq(users.id, req.userId))
        .returning({ coins: users.coins });

      // ── 10. Return result ──────────────────────────────────
      const breakdown = {
        baseShowcaseRate: parseFloat(baseShowcaseRate.toFixed(2)),
        collectionBonus: parseFloat(collectionBonus.toFixed(2)),
        streakMultiplier: parseFloat(streakMultiplier.toFixed(2)),
        synergyMultiplier: parseFloat(synergyMultiplier.toFixed(2)),
        uniqueCardsOwned,
        loginStreak: user.loginStreak || 0,
        secondsElapsed: cappedSeconds,
        maxCapSeconds: MAX_IDLE_SECONDS,
      };

      return {
        coinsEarned,
        totalCurrentCoins: updatedUser[0].coins,
        effectiveRate: parseFloat(effectiveRate.toFixed(3)),
        breakdown,
      };
    });

    // ── Response ──────────────────────────────────────────────
    const msg = result.coinsEarned > 0
      ? `Kamu mendapatkan ${result.coinsEarned.toLocaleString('id-ID')} coin dari yield pasif!`
      : result.breakdown.baseShowcaseRate === 0
        ? 'Isi showcase dengan kartu untuk mulai menghasilkan koin pasif!'
        : `Belum ada koin terkumpul. Tunggu beberapa saat lagi.`;

    // Track mission (di luar transaksi)
    incrementMission(req.userId, 'claim_idle').catch(() => {});

    return res.status(200).json({
      message: msg,
      ...result,
    });

  } catch (err) {
    if (err.status && err.code) {
      return sendError(res, err.status, err.code, err.message);
    }
    logError('/api/claim-idle', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
