import { db } from '../db/client.js';
import { users, userInventory, masterCards } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import requireAuth from '../_lib/requireAuth.js';
import { sellToVaultSchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * POST /api/inventory/sell
 * Sell-to-Vault — jual kartu duplikat ke sistem untuk likuiditas instan.
 * Harga vendor: hypeScore * 0.3 (lebih rendah dari market 0.5x).
 * Tidak ada pajak, tidak ada sybil restriction.
 * Kartu yang sedang showcase TIDAK bisa dijual.
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    // Validasi input
    const parsed = sellToVaultSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const { cardInventoryId, quantity } = parsed.data;

    // Jalankan dalam transaksi
    const result = await db.transaction(async (tx) => {
      // Lock baris inventory user
      const [invRow] = await tx.select()
        .from(userInventory)
        .innerJoin(masterCards, eq(userInventory.cardId, masterCards.id))
        .where(and(
          eq(userInventory.id, cardInventoryId),
          eq(userInventory.userId, req.userId)
        ))
        ;

      if (!invRow) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Kartu tidak ditemukan di inventory kamu.' };
      }

      // Cek quantity cukup
      if (invRow.user_inventory.quantity < quantity) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Kamu tidak punya cukup kartu untuk dijual.' };
      }

      // Kartu di showcase tidak bisa dijual
      if (invRow.user_inventory.inShowcase) {
        throw { status: 403, code: 'CARD_IN_SHOWCASE', message: 'Kartu ini sedang di showcase. Keluarkan dulu dari showcase sebelum menjual.' };
      }

      // Harga vendor: hypeScore * 0.3
      const vendorPrice = Math.floor(invRow.master_cards.hypeScore * 0.3);
      const totalEarned = vendorPrice * quantity;

      // Kurangi quantity / hapus row jika 0
      const newQuantity = invRow.user_inventory.quantity - quantity;
      if (newQuantity <= 0) {
        await tx.delete(userInventory)
          .where(eq(userInventory.id, cardInventoryId));
      } else {
        await tx.update(userInventory)
          .set({ quantity: newQuantity })
          .where(eq(userInventory.id, cardInventoryId));
      }

      // Tambah coin ke user
      await tx.update(users)
        .set({ coins: sql`coins + ${totalEarned}` })
        .where(eq(users.id, req.userId));

      // Baca saldo terbaru
      const [updatedUser] = await tx.select({ coins: users.coins })
        .from(users)
        .where(eq(users.id, req.userId));

      return { totalEarned, totalCurrentCoins: updatedUser.coins };
    });

    return res.status(200).json({
      message: 'Kartu terjual ke sistem!',
      coinsEarned: result.totalEarned,
      totalCurrentCoins: result.totalCurrentCoins,
    });
  } catch (err) {
    if (err.status && err.code) {
      return sendError(res, err.status, err.code, err.message);
    }
    logError('/api/inventory/sell', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
