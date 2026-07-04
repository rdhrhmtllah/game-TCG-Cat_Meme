import { db } from './db/client.js';
import { users, userInventory, masterCards } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError } from './_lib/errors.js';

/**
 * POST /api/card-fusion
 * Fuse 3 cards of same rarity → get 1 card of next rarity + bonus coins.
 * Common → Rare (+50 coins), Rare → Epic (+100), Epic → Legendary (+200)
 * Cannot fuse Legendary.
 * Body: { cardInventoryId: number } — the card to fuse (must have qty >= 3)
 */

const FUSION_MAP = {
  Common: { next: 'Rare', bonus: 50 },
  Rare: { next: 'Epic', bonus: 100 },
  Epic: { next: 'Legendary', bonus: 200 },
};

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');

  const { cardInventoryId } = req.body || {};
  if (!cardInventoryId) return sendError(res, 400, 'VALIDATION_ERROR', 'cardInventoryId required');

  try {
    const result = await db.transaction(async (tx) => {
      // Get the inventory item
      const [inv] = await tx.select()
        .from(userInventory)
        .where(and(eq(userInventory.id, cardInventoryId), eq(userInventory.userId, req.userId)));

      if (!inv) throw { status: 404, code: 'NOT_FOUND', message: 'Kartu tidak ditemukan.' };
      if (inv.quantity < 3) throw { status: 400, code: 'INSUFFICIENT_CARDS', message: 'Butuh minimal 3 kartu yang sama untuk fusion.' };

      // Get the card info
      const [card] = await tx.select().from(masterCards).where(eq(masterCards.id, inv.cardId));
      if (!card) throw { status: 404, code: 'NOT_FOUND', message: 'Kartu master tidak ditemukan.' };

      const fusion = FUSION_MAP[card.rarity];
      if (!fusion) throw { status: 400, code: 'CANNOT_FUSE', message: 'Kartu Legendary tidak bisa di-fuse.' };

      // Remove 3 cards
      const newQty = inv.quantity - 3;
      if (newQty <= 0) {
        await tx.delete(userInventory).where(eq(userInventory.id, inv.id));
      } else {
        await tx.update(userInventory).set({ quantity: newQty }).where(eq(userInventory.id, inv.id));
      }

      // Pick random card of next rarity
      const pool = await tx.select({ id: masterCards.id })
        .from(masterCards)
        .where(and(eq(masterCards.rarity, fusion.next), eq(masterCards.isActive, true)));

      if (pool.length === 0) throw { status: 503, code: 'POOL_EMPTY', message: `Tidak ada kartu ${fusion.next} tersedia.` };

      const randomCard = pool[Math.floor(Math.random() * pool.length)];
      const [newCard] = await tx.select().from(masterCards).where(eq(masterCards.id, randomCard.id));

      // Add to inventory (upsert)
      const [existingNew] = await tx.select()
        .from(userInventory)
        .where(and(eq(userInventory.userId, req.userId), eq(userInventory.cardId, newCard.id)));

      let isNew = true;
      if (existingNew) {
        await tx.update(userInventory)
          .set({ quantity: existingNew.quantity + 1 })
          .where(eq(userInventory.id, existingNew.id));
        isNew = false;
      } else {
        await tx.insert(userInventory).values({
          userId: req.userId, cardId: newCard.id, quantity: 1,
          inShowcase: false, isAccountBound: false,
        });
      }

      // Add bonus coins
      const [user] = await tx.select({ coins: users.coins }).from(users)
        .where(eq(users.id, req.userId));
      const newCoins = user.coins + fusion.bonus;
      await tx.update(users).set({ coins: newCoins }).where(eq(users.id, req.userId));

      return {
        fusedCard: card,
        fusedQuantity: 3,
        resultCard: { ...newCard, isNew },
        bonusCoins: fusion.bonus,
        coins: newCoins,
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.code, err.message);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal fusion kartu.');
  }
});
