import { db } from './db/client.js';
import { users, masterCards, userInventory } from './db/schema.js';
import { eq, and, gte, sql, inArray } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import { incrementMission } from './missions.js';
import { rollRarity, weightedPick, fallbackOrder, RARITY_RANK } from './_lib/gachaOdds.js';
import { grantXp, XP_REWARDS, PITY_THRESHOLD, LEGENDARY_PITY } from './_lib/progression.js';

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
      const [user] = await tx.select({ coins: users.coins, createdAt: users.createdAt, pityCounter: users.pityCounter, legendaryPity: users.legendaryPity })
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

      // ── Preload seluruh kartu aktif SEKALI, dikelompokkan per rarity ──
      // Dulu tiap kartu meng-query pool LALU fetch ulang kartu (≈10 round-trip
      // per pack). Master card statis selama satu pull, jadi cukup 1 query lalu
      // pilih di memori — kritikal untuk latensi lintas-region (Vercel↔Neon).
      const activeCards = await tx.select()
        .from(masterCards)
        .where(eq(masterCards.isActive, true));
      const poolByRarity = { Common: [], Rare: [], Epic: [], Legendary: [] };
      for (const c of activeCards) (poolByRarity[c.rarity] ||= []).push(c);

      // Pull 5 kartu. Pity ala Genshin: Epic+ dijamin tiap PITY_THRESHOLD kartu,
      // Legendary dijamin tiap LEGENDARY_PITY kartu tanpa Legendary.
      const draws = [];
      let pity = user.pityCounter || 0;
      let legPity = user.legendaryPity || 0;
      let pityTriggered = false;

      for (let i = 0; i < CARDS_PER_PACK; i++) {
        // Prioritas: pity Legendary (5★) dulu, lalu pity Epic+ (4★).
        let forced = null;
        if (legPity >= LEGENDARY_PITY) forced = 'Legendary';
        else if (pity >= PITY_THRESHOLD) forced = 'Epic';
        if (forced) pityTriggered = true;

        const targetRarity = forced || rollRarity();

        // Urutan pencarian bila pool target kosong. Saat pity, dahulukan Epic+
        // (jaminan). Normal: DEGRADE ke rarity lebih umum, jangan naik ke
        // Legendary — cegah banjir Legendary saat pool Common/Epic kosong.
        const searchOrder = forced
          ? [forced, forced === 'Legendary' ? 'Epic' : 'Legendary', 'Rare', 'Common']
          : fallbackOrder(targetRarity);

        // Weighted pick dari pool in-memory (kartu berbobot rendah = lebih
        // langka dalam rarity-nya). Tanpa query DB per kartu.
        let selectedCard = null;
        for (const rarity of searchOrder) {
          const pool = poolByRarity[rarity];
          if (pool && pool.length > 0) { selectedCard = weightedPick(pool); break; }
        }

        if (!selectedCard) {
          throw { status: 503, code: 'CARD_POOL_EMPTY', message: 'Tidak ada kartu tersedia. Seed database dengan: npm run db:seed' };
        }

        // Update pity. Epic+ mereset pity Epic; Legendary juga mereset pity Legendary.
        if (selectedCard.rarity === 'Legendary') {
          pity = 0; legPity = 0;
        } else if (selectedCard.rarity === 'Epic') {
          pity = 0; legPity++;
        } else {
          pity++; legPity++;
        }

        draws.push(selectedCard);
      }

      // ── Inventory dalam batch: baca kepemilikan 5 kartu SEKALI, lalu tulis
      // per kartu unik. Dulu 2 query/kartu (baca+tulis) = 10 round-trip. ──
      const distinctIds = [...new Set(draws.map((c) => c.id))];
      const existingRows = await tx.select()
        .from(userInventory)
        .where(and(
          eq(userInventory.userId, req.userId),
          inArray(userInventory.cardId, distinctIds),
        ));
      const invByCard = new Map(existingRows.map((r) => [r.cardId, r]));

      // Susun cardsDrawn dengan isNew & quantityOwned konsisten walau kartu
      // sama muncul >1× dalam pack ini (baseline kepemilikan + urutan tarik).
      const cardsDrawn = [];
      const drawnSoFar = new Map();
      for (const card of draws) {
        const baseQty = invByCard.get(card.id)?.quantity || 0;
        const already = drawnSoFar.get(card.id) || 0;
        const isNew = baseQty === 0 && already === 0;
        const quantityOwned = baseQty + already + 1;
        drawnSoFar.set(card.id, already + 1);
        cardsDrawn.push({ ...card, isNew, quantityOwned });
      }

      // Tulis inventory: 1 statement per kartu unik (update kalau sudah punya,
      // insert kalau baru) — dijumlahkan sesuai berapa kali kartu itu ditarik.
      for (const [cardId, count] of drawnSoFar) {
        const ex = invByCard.get(cardId);
        if (ex) {
          await tx.update(userInventory)
            .set({ quantity: ex.quantity + count })
            .where(eq(userInventory.id, ex.id));
        } else {
          await tx.insert(userInventory).values({
            userId: req.userId,
            cardId,
            quantity: count,
            inShowcase: false,
            isAccountBound,
          });
        }
      }

      // Simpan pity counter final (Epic+ & Legendary)
      await tx.update(users)
        .set({ pityCounter: pity, legendaryPity: legPity })
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
        legendaryPity: legPity,
        legendaryPityThreshold: LEGENDARY_PITY,
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
