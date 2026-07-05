import { db } from './db/client.js';
import { masterCards } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { sendError, logError } from './_lib/errors.js';
import { RARITY_BASE_CHANCE, computeDropRates } from './_lib/gachaOdds.js';

/**
 * GET /api/gacha-rates
 * Publik. Peluang drop tiap kartu aktif (transparansi gacha).
 * dropRate = baseChance(rarity) × dropWeight / Σ dropWeight se-rarity.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    const cards = await db.select({
      id: masterCards.id,
      name: masterCards.name,
      rarity: masterCards.rarity,
      dropWeight: masterCards.dropWeight,
      imageUrl: masterCards.imageUrl,
      element: masterCards.element,
    })
      .from(masterCards)
      .where(eq(masterCards.isActive, true))
      .orderBy(masterCards.rarity, masterCards.name);

    const rateMap = computeDropRates(cards);
    const withRates = cards.map(c => ({
      ...c,
      dropRate: parseFloat((rateMap[c.id] || 0).toFixed(3)),
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

    return res.status(200).json({
      rarityChances: RARITY_BASE_CHANCE,
      cards: withRates,
    });
  } catch (err) {
    logError('/api/gacha-rates', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
}
