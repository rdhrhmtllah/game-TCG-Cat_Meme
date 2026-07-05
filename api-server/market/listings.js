import { db } from '../db/client.js';
import { marketplaceListings, masterCards, users } from '../db/schema.js';
import { eq, and, asc, desc, sql, ilike } from 'drizzle-orm';
import { marketListingsQuerySchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * GET /api/market/listings
 * Publik. Browse listing aktif dengan pagination & filter rarity.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const query = Object.fromEntries(url.searchParams);

    const parsed = marketListingsQuerySchema.safeParse(query);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const { page, limit, rarity, sort, search } = parsed.data;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(marketplaceListings.status, 'active')];
    if (rarity) {
      conditions.push(eq(masterCards.rarity, rarity));
    }
    if (search) {
      conditions.push(ilike(masterCards.name, `%${search}%`));
    }

    // Urutan hasil
    const orderBy = {
      newest: desc(marketplaceListings.createdAt),
      price_asc: asc(marketplaceListings.price),
      price_desc: desc(marketplaceListings.price),
      hype: desc(masterCards.hypeScore),
    }[sort] || desc(marketplaceListings.createdAt);

    // Hitung total
    const countResult = await db.select({ count: sql`COUNT(*)` })
      .from(marketplaceListings)
      .innerJoin(masterCards, eq(marketplaceListings.cardId, masterCards.id))
      .where(and(...conditions));

    const total = Number(countResult[0].count);

    // Ambil listing dengan detail
    const listings = await db.select({
      id: marketplaceListings.id,
      sellerId: marketplaceListings.sellerId,
      price: marketplaceListings.price,
      status: marketplaceListings.status,
      createdAt: marketplaceListings.createdAt,
      seller: {
        username: users.username,
      },
      card: {
        id: masterCards.id,
        name: masterCards.name,
        description: masterCards.description,
        rarity: masterCards.rarity,
        hypeScore: masterCards.hypeScore,
        likesPerSec: masterCards.likesPerSec,
        imageUrl: masterCards.imageUrl,
        element: masterCards.element,
        foilStyle: masterCards.foilStyle,
        imgZoom: masterCards.imgZoom,
        imgOffsetX: masterCards.imgOffsetX,
        imgOffsetY: masterCards.imgOffsetY,
      },
    })
      .from(marketplaceListings)
      .innerJoin(masterCards, eq(marketplaceListings.cardId, masterCards.id))
      .innerJoin(users, eq(marketplaceListings.sellerId, users.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return res.status(200).json({
      listings,
      pagination: { page, limit, total },
    });
  } catch (err) {
    logError('/api/market/listings', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
}
