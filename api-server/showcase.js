import { db } from './db/client.js';
import { userInventory, masterCards } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { showcaseSchema } from './_lib/schemas.js';
import { sendError, logError } from './_lib/errors.js';

const MAX_SHOWCASE = 5;

/**
 * POST /api/showcase
 * JWT required. Add/remove kartu dari showcase (maks 5).
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    // Validasi input
    const parsed = showcaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    const { cardInventoryId, action } = parsed.data;

    // Verifikasi ownership
    const [invRow] = await db.select()
      .from(userInventory)
      .where(and(
        eq(userInventory.id, cardInventoryId),
        eq(userInventory.userId, req.userId)
      ));

    if (!invRow) {
      return sendError(res, 404, 'NOT_FOUND', 'Kartu tidak ditemukan di inventory kamu.');
    }

    if (action === 'add') {
      // Cek showcase belum penuh
      const showcaseCount = await db.select({ count: sql`COUNT(*)` })
        .from(userInventory)
        .where(and(
          eq(userInventory.userId, req.userId),
          eq(userInventory.inShowcase, true)
        ));

      if (Number(showcaseCount[0].count) >= MAX_SHOWCASE) {
        return sendError(res, 400, 'SHOWCASE_FULL', 'Showcase sudah penuh (maks 5 kartu).');
      }

      await db.update(userInventory)
        .set({ inShowcase: true })
        .where(eq(userInventory.id, cardInventoryId));
    } else if (action === 'remove') {
      await db.update(userInventory)
        .set({ inShowcase: false })
        .where(eq(userInventory.id, cardInventoryId));
    }

    // Return showcase terbaru
    const showcase = await db.select({
      id: userInventory.id,
      cardId: userInventory.cardId,
      quantity: userInventory.quantity,
      card: {
        id: masterCards.id,
        name: masterCards.name,
        description: masterCards.description,
        rarity: masterCards.rarity,
        hypeScore: masterCards.hypeScore,
        likesPerSec: masterCards.likesPerSec,
        imageUrl: masterCards.imageUrl,
      },
    })
      .from(userInventory)
      .innerJoin(masterCards, eq(userInventory.cardId, masterCards.id))
      .where(and(
        eq(userInventory.userId, req.userId),
        eq(userInventory.inShowcase, true)
      ));

    return res.status(200).json({ showcase });
  } catch (err) {
    logError('/api/showcase', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
