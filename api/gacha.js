import { db } from './db/client.js';
import { users, masterCards, userInventory } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';
import { checkRateLimit } from './_lib/rateLimit.js';

const GACHA_COST = 100;
const SYBIL_LOCK_HOURS = 72;

// Tabel distribusi rarity (Bagian 5.2)
const RARITY_TABLE = [
  { rarity: 'Legendary', min: 0, max: 2.0 },
  { rarity: 'Epic', min: 2.01, max: 10.0 },
  { rarity: 'Rare', min: 10.01, max: 30.0 },
  { rarity: 'Common', min: 30.01, max: 100.0 },
];

// Urutan fallback jika pool rarity kosong
const FALLBACK_ORDER = ['Legendary', 'Epic', 'Rare', 'Common'];

function determineRarity(roll) {
  for (const tier of RARITY_TABLE) {
    if (roll >= tier.min && roll <= tier.max) return tier.rarity;
  }
  return 'Common';
}

function getNextFallbackRarity(currentRarity) {
  const idx = FALLBACK_ORDER.indexOf(currentRarity);
  if (idx === -1 || idx === FALLBACK_ORDER.length - 1) return null;
  return FALLBACK_ORDER[idx + 1];
}

/**
 * POST /api/gacha
 * JWT required. Pull 1 kartu acak seharga 100 coin.
 * Implementasi PERSIS sesuai Bagian 5.3 PRD.
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  // Rate limit: 30x/menit per user
  if (!checkRateLimit(`gacha:${req.userId}`, 30, 60_000)) {
    return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak buka pack. Coba lagi nanti.');
  }

  try {
    // 1. Buka transaksi dengan lock baris user
    const result = await db.transaction(async (tx) => {
      // Lock baris user
      const [user] = await tx.select({ coins: users.coins, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, req.userId))
        .for('update');

      if (!user) {
        throw { status: 404, code: 'NOT_FOUND', message: 'User tidak ditemukan.' };
      }

      // 2. Cek saldo cukup
      if (user.coins < GACHA_COST) {
        throw { status: 400, code: 'INSUFFICIENT_FUNDS', message: 'Koin tidak cukup! Butuh 100 coin untuk buka pack.' };
      }

      // 3. Kurangi coin
      await tx.update(users)
        .set({ coins: user.coins - GACHA_COST })
        .where(eq(users.id, req.userId));

      // 4. Roll & tentukan rarity
      const roll = Math.random() * 100;
      let targetRarity = determineRarity(roll);

      // 5. Pool kosong guard — fallback rarity
      let selectedCard = null;
      let attemptedRarity = targetRarity;

      while (!selectedCard) {
        const pool = await tx.select({ id: masterCards.id })
          .from(masterCards)
          .where(and(eq(masterCards.rarity, attemptedRarity), eq(masterCards.isActive, true)));

        if (pool.length > 0) {
          // Pilih 1 kartu acak dari pool
          const randomIdx = Math.floor(Math.random() * pool.length);
          const cardId = pool[randomIdx].id;

          [selectedCard] = await tx.select()
            .from(masterCards)
            .where(eq(masterCards.id, cardId));
        } else {
          // Pool kosong → turunkan rarity
          const nextRarity = getNextFallbackRarity(attemptedRarity);
          if (!nextRarity) {
            // Seluruh pool kosong → rollback
            throw { status: 503, code: 'CARD_POOL_EMPTY', message: 'Tidak ada kartu tersedia saat ini.' };
          }
          attemptedRarity = nextRarity;
        }
      }

      // 6. Tentukan isAccountBound
      const userCreatedAt = new Date(user.createdAt).getTime();
      const hoursSinceCreation = (Date.now() - userCreatedAt) / (1000 * 60 * 60);
      const isAccountBound = hoursSinceCreation < SYBIL_LOCK_HOURS;

      // 7. Upsert user_inventory
      const [existingInv] = await tx.select()
        .from(userInventory)
        .where(and(
          eq(userInventory.userId, req.userId),
          eq(userInventory.cardId, selectedCard.id)
        ));

      let quantityOwned = 1;
      let isNew = true;

      if (existingInv) {
        // Sudah punya → increment quantity
        await tx.update(userInventory)
          .set({ quantity: existingInv.quantity + 1 })
          .where(eq(userInventory.id, existingInv.id));
        quantityOwned = existingInv.quantity + 1;
        isNew = false;
      } else {
        // Belum punya → insert baru
        await tx.insert(userInventory).values({
          userId: req.userId,
          cardId: selectedCard.id,
          quantity: 1,
          inShowcase: false,
          isAccountBound,
        });
      }

      return {
        cardDrawn: {
          ...selectedCard,
          isNew,
          quantityOwned,
        },
        coinsRemaining: user.coins - GACHA_COST,
      };
    });

    return res.status(200).json({
      message: `🎴 Kamu dapat ${result.cardDrawn.rarity}: ${result.cardDrawn.name}!`,
      ...result,
    });
  } catch (err) {
    // Re-throw known errors
    if (err.status && err.code) {
      return sendError(res, err.status, err.code, err.message);
    }
    logError('/api/gacha', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
