import { db } from '../db/client.js';
import { userInventory, marketplaceListings, masterCards } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import requireAuth from '../_lib/requireAuth.js';
import { marketCancelSchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * POST /api/market/cancel
 * JWT required. Batalkan listing sendiri, kembalikan kartu ke inventory.
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const parsed = marketCancelSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const { listingId } = parsed.data;

    await db.transaction(async (tx) => {
      // Lock listing
      const [listing] = await tx.select()
        .from(marketplaceListings)
        .where(eq(marketplaceListings.id, listingId))
        ;

      if (!listing) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Listing tidak ditemukan.' };
      }

      // Validasi ownership
      if (listing.sellerId !== req.userId) {
        throw { status: 403, code: 'FORBIDDEN', message: 'Ini bukan listing kamu.' };
      }

      // Validasi masih active
      if (listing.status !== 'active') {
        throw { status: 409, code: 'MARKET_CONFLICT', message: 'Listing sudah tidak aktif.' };
      }

      // Set status canceled
      await tx.update(marketplaceListings)
        .set({ status: 'canceled' })
        .where(eq(marketplaceListings.id, listingId));

      // Kembalikan kartu ke inventory seller
      const [existingInv] = await tx.select()
        .from(userInventory)
        .where(and(
          eq(userInventory.userId, req.userId),
          eq(userInventory.cardId, listing.cardId)
        ));

      if (existingInv) {
        // Sudah punya baris → increment quantity
        await tx.update(userInventory)
          .set({ quantity: existingInv.quantity + 1 })
          .where(eq(userInventory.id, existingInv.id));
      } else {
        // Insert baris baru
        await tx.insert(userInventory).values({
          userId: req.userId,
          cardId: listing.cardId,
          quantity: 1,
          inShowcase: false,
          isAccountBound: false,
        });
      }
    });

    return res.status(200).json({
      message: 'Listing dibatalkan. Kartu kembali ke inventory kamu.',
    });
  } catch (err) {
    if (err.status && err.code) {
      return sendError(res, err.status, err.code, err.message);
    }
    logError('/api/market/cancel', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
