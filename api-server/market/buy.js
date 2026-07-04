import { db } from '../db/client.js';
import { users, userInventory, marketplaceListings, masterCards } from '../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import requireAuth from '../_lib/requireAuth.js';
import { marketBuySchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';
import { checkRateLimit } from '../_lib/rateLimit.js';

const SYBIL_LOCK_HOURS = 72;
const TAX_RATE = 0.05; // 5% pajak marketplace
const TRADE_COOLDOWN_HOURS = 24;

/**
 * POST /api/market/buy
 * JWT required. Beli listing dari marketplace — atomic transaction.
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  // Rate limit: 20x/menit per user
  if (!checkRateLimit(`market-buy:${req.userId}`, 20, 60_000)) {
    return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu banyak transaksi. Coba lagi nanti.');
  }

  try {
    const parsed = marketBuySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const { listingId } = parsed.data;

    const result = await db.transaction(async (tx) => {
      // Lock listing
      const [listing] = await tx.select()
        .from(marketplaceListings)
        .where(eq(marketplaceListings.id, listingId))
        ;

      if (!listing) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Listing tidak ditemukan.' };
      }

      // Cek status masih active
      if (listing.status !== 'active') {
        throw { status: 409, code: 'MARKET_CONFLICT', message: 'Kartu sudah terjual atau dibatalkan.' };
      }

      // Cek bukan beli dari sendiri
      if (listing.sellerId === req.userId) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Kamu tidak bisa membeli kartu sendiri.' };
      }

      // Lock buyer
      const [buyer] = await tx.select({ coins: users.coins, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, req.userId))
        ;

      if (!buyer) {
        throw { status: 404, code: 'NOT_FOUND', message: 'User tidak ditemukan.' };
      }

      // Cek saldo buyer
      if (buyer.coins < listing.price) {
        throw { status: 400, code: 'INSUFFICIENT_FUNDS', message: 'Koin tidak cukup untuk membeli kartu ini.' };
      }

      // Ambil kartu dari inventory seller
      const [cardRow] = await tx.select()
        .from(userInventory)
        .innerJoin(masterCards, eq(userInventory.cardId, masterCards.id))
        .where(and(
          eq(userInventory.userId, listing.sellerId),
          eq(userInventory.cardId, listing.cardId)
        ))
        ;

      // Cek sybil lock
      if (cardRow?.user_inventory?.isAccountBound) {
        const buyerCreatedAt = new Date(buyer.createdAt).getTime();
        const hoursSinceCreation = (Date.now() - buyerCreatedAt) / (1000 * 60 * 60);
        if (hoursSinceCreation < SYBIL_LOCK_HOURS) {
          throw { status: 403, code: 'FORBIDDEN_SYBIL_LOCK', message: 'Akun kamu belum cukup umur untuk membeli kartu ini. Tunggu hingga akun berusia 72 jam.' };
        }
      }

      // Hitung pajak
      const tax = Math.floor(listing.price * TAX_RATE);
      const sellerEarnings = listing.price - tax;

      // Klaim listing secara atomik: hanya satu buyer yang bisa mengubah
      // active → sold (race-safe untuk dua pembeli bersamaan)
      const [claimed] = await tx.update(marketplaceListings)
        .set({ status: 'sold' })
        .where(and(
          eq(marketplaceListings.id, listingId),
          eq(marketplaceListings.status, 'active'),
        ))
        .returning({ id: marketplaceListings.id });

      if (!claimed) {
        throw { status: 409, code: 'MARKET_CONFLICT', message: 'Kartu sudah terjual atau dibatalkan.' };
      }

      // Kurangi coin buyer secara atomik + syarat saldo cukup
      const [debited] = await tx.update(users)
        .set({ coins: sql`${users.coins} - ${listing.price}` })
        .where(and(eq(users.id, req.userId), gte(users.coins, listing.price)))
        .returning({ coins: users.coins });

      if (!debited) {
        throw { status: 400, code: 'INSUFFICIENT_FUNDS', message: 'Koin tidak cukup untuk membeli kartu ini.' };
      }

      // Tambah coin seller
      await tx.update(users)
        .set({ coins: sql`coins + ${sellerEarnings}` })
        .where(eq(users.id, listing.sellerId));

      // Transfer kartu ke buyer: upsert inventory
      const [existingBuyerInv] = await tx.select()
        .from(userInventory)
        .where(and(
          eq(userInventory.userId, req.userId),
          eq(userInventory.cardId, listing.cardId)
        ));

      const tradeLockedUntil = new Date(Date.now() + TRADE_COOLDOWN_HOURS * 60 * 60 * 1000);

      if (existingBuyerInv) {
        // Sudah punya → increment quantity
        await tx.update(userInventory)
          .set({
            quantity: existingBuyerInv.quantity + 1,
            tradeLockedUntil,
            isAccountBound: false, // bound di-reset saat kartu berpindah lewat market
          })
          .where(eq(userInventory.id, existingBuyerInv.id));
      } else {
        // Insert baru untuk buyer
        await tx.insert(userInventory).values({
          userId: req.userId,
          cardId: listing.cardId,
          quantity: 1,
          inShowcase: false,
          isAccountBound: false, // Reset bound saat di-buy
          tradeLockedUntil,
        });
      }

      return {
        cardIdPurchased: listing.cardId,
        pricePaid: listing.price,
        tax,
      };
    });

    return res.status(200).json({
      message: 'Kartu berhasil dibeli!',
      ...result,
    });
  } catch (err) {
    if (err.status && err.code) {
      return sendError(res, err.status, err.code, err.message);
    }
    logError('/api/market/buy', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
