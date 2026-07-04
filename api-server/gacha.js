import { db } from './db/client.js';
import { users, masterCards, userInventory } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import { incrementMission } from './missions.js';

const GACHA_COST = 100;
const CARDS_PER_PACK = 5;
const SYBIL_LOCK_HOURS = 72;

// Tabel distribusi rarity (Bagian 5.2)
const RARITY_TABLE = [
  { rarity: 'Legendary', min: 0, max: 2.0 },
  { rarity: 'Epic', min: 2.01, max: 10.0 },
  { rarity: 'Rare', min: 10.01, max: 30.0 },
  { rarity: 'Common', min: 30.01, max: 100.0 },
];

// Urutan rarity dari paling langka ke paling umum
const RARITY_ORDER = ['Legendary', 'Epic', 'Rare', 'Common'];

// Rarity rank for sorting (higher = rarer)
const RARITY_RANK = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };

function determineRarity(roll) {
  for (const tier of RARITY_TABLE) {
    if (roll >= tier.min && roll <= tier.max) return tier.rarity;
  }
  return 'Common';
}

/**
 * POST /api/gacha
 * JWT required. Open a booster pack: 5 random cards for 100 coins.
 * Cards are sorted Common → Rare → Epic → Legendary for dramatic reveal.
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
    const result = await db.transaction(async (tx) => {
      // Lock baris user
      const [user] = await tx.select({ coins: users.coins, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, req.userId))
        ;

      if (!user) {
        throw { status: 404, code: 'NOT_FOUND', message: 'User tidak ditemukan.' };
      }

      // Cek saldo cukup
      if (user.coins < GACHA_COST) {
        throw { status: 400, code: 'INSUFFICIENT_FUNDS', message: 'Koin tidak cukup! Butuh 100 coin untuk buka pack.' };
      }

      // Kurangi coin
      await tx.update(users)
        .set({ coins: user.coins - GACHA_COST })
        .where(eq(users.id, req.userId));

      // Determine account bound status
      const userCreatedAt = new Date(user.createdAt).getTime();
      const hoursSinceCreation = (Date.now() - userCreatedAt) / (1000 * 60 * 60);
      const isAccountBound = hoursSinceCreation < SYBIL_LOCK_HOURS;

      // Pull 5 cards
      const cardsDrawn = [];

      for (let i = 0; i < CARDS_PER_PACK; i++) {
        const roll = Math.random() * 100;
        const targetRarity = determineRarity(roll);
        let selectedCard = null;

        // Coba target rarity dulu, lalu fallback ke rarity lain (search SEMUA)
        const searchOrder = [
          targetRarity,
          ...RARITY_ORDER.filter(r => r !== targetRarity),
        ];

        for (const rarity of searchOrder) {
          const pool = await tx.select({ id: masterCards.id })
            .from(masterCards)
            .where(and(eq(masterCards.rarity, rarity), eq(masterCards.isActive, true)));

          if (pool.length > 0) {
            const randomIdx = Math.floor(Math.random() * pool.length);
            const cardId = pool[randomIdx].id;
            [selectedCard] = await tx.select()
              .from(masterCards)
              .where(eq(masterCards.id, cardId));
            break;
          }
        }

        if (!selectedCard) {
          throw { status: 503, code: 'CARD_POOL_EMPTY', message: 'Tidak ada kartu tersedia. Seed database dengan: npm run db:seed' };
        }

        // Upsert user_inventory
        const [existingInv] = await tx.select()
          .from(userInventory)
          .where(and(
            eq(userInventory.userId, req.userId),
            eq(userInventory.cardId, selectedCard.id)
          ));

        let quantityOwned = 1;
        let isNew = true;

        if (existingInv) {
          await tx.update(userInventory)
            .set({ quantity: existingInv.quantity + 1 })
            .where(eq(userInventory.id, existingInv.id));
          quantityOwned = existingInv.quantity + 1;
          isNew = false;
        } else {
          await tx.insert(userInventory).values({
            userId: req.userId,
            cardId: selectedCard.id,
            quantity: 1,
            inShowcase: false,
            isAccountBound,
          });
        }

        cardsDrawn.push({
          ...selectedCard,
          isNew,
          quantityOwned,
        });
      }

      // Sort: Common first → Legendary last (for dramatic reveal)
      cardsDrawn.sort((a, b) => (RARITY_RANK[a.rarity] || 0) - (RARITY_RANK[b.rarity] || 0));

      // Best card = last in sorted array
      const bestCard = cardsDrawn[cardsDrawn.length - 1];

      return {
        cardsDrawn,
        cardDrawn: bestCard, // backward compat
        highestRarity: bestCard.rarity,
        coinsRemaining: user.coins - GACHA_COST,
      };
    });

    // Track missions
    incrementMission(req.userId, 'open_pack').catch(() => {});
    incrementMission(req.userId, 'open_3_packs').catch(() => {});

    return res.status(200).json({
      message: `🎴 Pack dibuka! ${result.cardsDrawn.length} kartu didapat! Best: ${result.highestRarity}!`,
      ...result,
    });
  } catch (err) {
    if (err.status && err.code) {
      return sendError(res, err.status, err.code, err.message);
    }
    logError('/api/gacha', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
