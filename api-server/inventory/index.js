import { db } from '../db/client.js';
import { userInventory, masterCards } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import requireAuth from '../_lib/requireAuth.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * GET /api/inventory
 * JWT required. Return semua kartu yang dimiliki user dengan detail master_cards.
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const inventory = await db.select({
      id: userInventory.id,
      cardId: userInventory.cardId,
      quantity: userInventory.quantity,
      inShowcase: userInventory.inShowcase,
      isAccountBound: userInventory.isAccountBound,
      tradeLockedUntil: userInventory.tradeLockedUntil,
      card: {
        id: masterCards.id,
        name: masterCards.name,
        description: masterCards.description,
        rarity: masterCards.rarity,
        hypeScore: masterCards.hypeScore,
        likesPerSec: masterCards.likesPerSec,
        imageUrl: masterCards.imageUrl,
        isPlaceholderImage: masterCards.isPlaceholderImage,
        element: masterCards.element,
        foilStyle: masterCards.foilStyle,
        imgZoom: masterCards.imgZoom,
        imgOffsetX: masterCards.imgOffsetX,
        imgOffsetY: masterCards.imgOffsetY,
      },
    })
      .from(userInventory)
      .innerJoin(masterCards, eq(userInventory.cardId, masterCards.id))
      .where(eq(userInventory.userId, req.userId))
      .orderBy(masterCards.rarity, masterCards.name);

    return res.status(200).json({ inventory });
  } catch (err) {
    logError('/api/inventory', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
