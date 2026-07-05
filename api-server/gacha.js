import { db } from './db/client.js';
import { users, masterCards, userInventory } from './db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import { incrementMission } from './missions.js';
import { rollRarity, weightedPick, fallbackOrder, RARITY_RANK } from './_lib/gachaOdds.js';
import { grantXp, XP_REWARDS, PITY_THRESHOLD } from './_lib/progression.js';

const GACHA_COST = 100;
const CARDS_PER_PACK = 5;
const SYBIL_LOCK_HOURS = 72;

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
      const [user] = await tx.select({ coins: users.coins, createdAt: users.createdAt, pityCounter: users.pityCounter })
        .from(users)
        .where(eq(users.id, req.userId))
        ;

      if (!user) {
        throw { status: 404, code: 'NOT_FOUND', message: 'User tidak ditemukan.' };
      }

      // Kurangi coin secara atomik + bersyarat (race-safe: dua request
      // bersamaan tidak bisa double-spend karena cek saldo terjadi di
      // UPDATE yang sama, bukan read-then-write)
      const [debited] = await tx.update(users)
        .set({ coins: sql`${users.coins} - ${GACHA_COST}` })
        .where(and(eq(users.id, req.userId), gte(users.coins, GACHA_COST)))
        .returning({ coins: users.coins });

      if (!debited) {
        throw { status: 400, code: 'INSUFFICIENT_FUNDS', message: 'Koin tidak cukup! Butuh 100 coin untuk buka pack.' };
      }

      // Determine account bound status
      const userCreatedAt = new Date(user.createdAt).getTime();
      const hoursSinceCreation = (Date.now() - userCreatedAt) / (1000 * 60 * 60);
      const isAccountBound = hoursSinceCreation < SYBIL_LOCK_HOURS;

      // Pull 5 cards (dengan pity: jaminan Epic+ tiap PITY_THRESHOLD kartu)
      const cardsDrawn = [];
      let pity = user.pityCounter || 0;
      let pityTriggered = false;

      for (let i = 0; i < CARDS_PER_PACK; i++) {
        // Pity: bila sudah PITY_THRESHOLD kartu tanpa Epic+, paksa Epic+
        // (Legendary 20% / Epic 80% mengikuti rasio base chance 2:8)
        const forced = pity >= PITY_THRESHOLD
          ? (Math.random() < 0.2 ? 'Legendary' : 'Epic')
          : null;
        if (forced) pityTriggered = true;

        const targetRarity = forced || rollRarity();
        let selectedCard = null;

        // Urutan pencarian bila pool target kosong. Saat pity, dahulukan Epic+
        // (jaminan). Normal: DEGRADE ke rarity lebih umum, jangan naik ke
        // Legendary — cegah banjir Legendary saat pool Common/Epic kosong.
        const searchOrder = forced
          ? [forced, forced === 'Legendary' ? 'Epic' : 'Legendary', 'Rare', 'Common']
          : fallbackOrder(targetRarity);

        for (const rarity of searchOrder) {
          // Ambil pool + dropWeight → weighted pick (kartu berbobot rendah
          // = lebih langka dalam rarity-nya)
          const pool = await tx.select({ id: masterCards.id, dropWeight: masterCards.dropWeight })
            .from(masterCards)
            .where(and(eq(masterCards.rarity, rarity), eq(masterCards.isActive, true)));

          if (pool.length > 0) {
            const picked = weightedPick(pool);
            [selectedCard] = await tx.select()
              .from(masterCards)
              .where(eq(masterCards.id, picked.id));
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

        // Update pity: dapat Epic/Legendary → reset; selain itu → +1
        if (selectedCard.rarity === 'Epic' || selectedCard.rarity === 'Legendary') {
          pity = 0;
        } else {
          pity++;
        }

        cardsDrawn.push({
          ...selectedCard,
          isNew,
          quantityOwned,
        });
      }

      // Simpan pity counter final
      await tx.update(users)
        .set({ pityCounter: pity })
        .where(eq(users.id, req.userId));

      // Grant XP (menangani level-up + bonus coin di dalam transaksi)
      const xpResult = await grantXp(tx, req.userId, XP_REWARDS.open_pack);

      // Sort: Common first → Legendary last (for dramatic reveal)
      cardsDrawn.sort((a, b) => (RARITY_RANK[a.rarity] || 0) - (RARITY_RANK[b.rarity] || 0));

      // Best card = last in sorted array
      const bestCard = cardsDrawn[cardsDrawn.length - 1];

      return {
        cardsDrawn,
        cardDrawn: bestCard, // backward compat
        highestRarity: bestCard.rarity,
        coinsRemaining: debited.coins + (xpResult.coinBonus || 0),
        pityCounter: pity,
        pityThreshold: PITY_THRESHOLD,
        pityTriggered,
        levelUp: xpResult.leveledUp ? { level: xpResult.newLevel, coinBonus: xpResult.coinBonus } : null,
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
