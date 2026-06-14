import { db } from './db/client.js';
import { masterCards } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { sendError, logError } from './_lib/errors.js';

/**
 * GET /api/master-cards
 * Publik — return semua kartu aktif. Support filter ?rarity=.
 * Cache 1 jam via Cache-Control header.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const rarity = url.searchParams.get('rarity');

    // Validasi rarity jika ada
    const validRarities = ['Common', 'Rare', 'Epic', 'Legendary'];
    if (rarity && !validRarities.includes(rarity)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Rarity tidak valid.');
    }

    const conditions = [eq(masterCards.isActive, true)];
    if (rarity) {
      conditions.push(eq(masterCards.rarity, rarity));
    }

    const cards = await db.select()
      .from(masterCards)
      .where(and(...conditions))
      .orderBy(masterCards.rarity, masterCards.name);

    // Cache headers (Bagian 14)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).json({ cards });
  } catch (err) {
    logError('/api/master-cards', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
}
