import { db } from '../db/client.js';
import { masterCards, userInventory, marketplaceListings } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import requireAdmin from '../_lib/requireAdmin.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * GET /api/admin/card-usage?id= — Cek kepemilikan kartu sebelum hapus permanen.
 * Return: berapa user memiliki, total salinan, jumlah di showcase, listing aktif.
 */
export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const id = parseInt(new URL(req.url, 'http://localhost').searchParams.get('id') || '');
    if (!id) return sendError(res, 400, 'VALIDATION_ERROR', 'Parameter id diperlukan.');

    const [card] = await db.select({ id: masterCards.id, name: masterCards.name, rarity: masterCards.rarity })
      .from(masterCards).where(eq(masterCards.id, id)).limit(1);
    if (!card) return sendError(res, 404, 'NOT_FOUND', 'Kartu tidak ditemukan.');

    const [inv, listings] = await Promise.all([
      db.select({
        owners: sql`COUNT(DISTINCT ${userInventory.userId})`,
        copies: sql`COALESCE(SUM(${userInventory.quantity}), 0)`,
        showcase: sql`COUNT(*) FILTER (WHERE ${userInventory.inShowcase} = true)`,
      }).from(userInventory).where(eq(userInventory.cardId, id)),
      db.select({
        active: sql`COUNT(*) FILTER (WHERE ${marketplaceListings.status} = 'active')`,
      }).from(marketplaceListings).where(eq(marketplaceListings.cardId, id)),
    ]);

    return res.status(200).json({
      card,
      owners: Number(inv[0].owners),
      copies: Number(inv[0].copies),
      showcase: Number(inv[0].showcase),
      listings: Number(listings[0].active),
    });
  } catch (err) {
    logError('/api/admin/card-usage', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal mengecek pemakaian kartu.');
  }
});
