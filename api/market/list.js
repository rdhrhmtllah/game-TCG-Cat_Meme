import { db } from '../db/client.js';
import { userInventory, marketplaceListings, masterCards } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import requireAuth from '../_lib/requireAuth.js';
import { marketListSchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * POST /api/market/list
 * JWT required. List kartu dari inventory ke marketplace.
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const parsed = marketListSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const { cardInventoryId, price } = parsed.data;

    // Verifikasi ownership + ambil detail kartu
    const [invRow] = await db.select()
      .from(userInventory)
      .innerJoin(masterCards, eq(userInventory.cardId, masterCards.id))
      .where(and(
        eq(userInventory.id, cardInventoryId),
        eq(userInventory.userId, req.userId)
      ));

    if (!invRow) {
      return sendError(res, 404, 'NOT_FOUND', 'Kartu tidak ditemukan di inventory kamu.');
    }

    // Cek trade lock
    if (invRow.user_inventory.tradeLockedUntil && new Date(invRow.user_inventory.tradeLockedUntil) > new Date()) {
      return sendError(res, 403, 'TRADE_LOCKED', 'Kartu ini masih dalam cooldown trade. Tunggu 24 jam sejak pembelian.');
    }

    // Cek tidak sedang showcase
    if (invRow.user_inventory.inShowcase) {
      return sendError(res, 403, 'CARD_IN_SHOWCASE', 'Kartu ini sedang di showcase. Keluarkan dulu dari showcase.');
    }

    // Cek harga dalam range
    const hypeScore = invRow.master_cards.hypeScore;
    const minPrice = Math.floor(hypeScore * 0.5);
    const maxPrice = Math.floor(hypeScore * 5.0);

    if (price < minPrice || price > maxPrice) {
      return sendError(res, 400, 'PRICE_OUT_OF_RANGE', `Harga harus antara ${minPrice} – ${maxPrice} coin.`);
    }

    // Cek quantity cukup (min 1)
    if (invRow.user_inventory.quantity < 1) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Kamu tidak punya cukup kartu.');
    }

    // Kurangi inventory + buat listing
    await db.transaction(async (tx) => {
      // Kurangi 1 dari inventory
      const newQty = invRow.user_inventory.quantity - 1;
      if (newQty <= 0) {
        await tx.delete(userInventory).where(eq(userInventory.id, cardInventoryId));
      } else {
        await tx.update(userInventory)
          .set({ quantity: newQty })
          .where(eq(userInventory.id, cardInventoryId));
      }

      // Insert listing
      await tx.insert(marketplaceListings).values({
        sellerId: req.userId,
        cardId: invRow.master_cards.id,
        price,
        status: 'active',
      });
    });

    return res.status(200).json({
      message: 'Kartu berhasil dipajang di pasar!',
    });
  } catch (err) {
    logError('/api/market/list', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
