import { db } from './db/client.js';
import { users } from './db/schema.js';
import { eq, and, or, ne, isNull, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError } from './_lib/errors.js';
import { checkRateLimit } from './_lib/rateLimit.js';

/**
 * POST /api/spin-wheel
 * Daily fortune wheel spin. 1x per day.
 * Prizes: [10, 20, 30, 50, 75, 100, 150, 200, 300, 500]
 * Weighted: lower values more likely.
 */
const PRIZES = [
  { amount: 10, weight: 25, label: '10 🪙', color: '#94A3B8' },
  { amount: 20, weight: 20, label: '20 🪙', color: '#94A3B8' },
  { amount: 30, weight: 15, label: '30 🪙', color: '#38BDF8' },
  { amount: 50, weight: 12, label: '50 🪙', color: '#38BDF8' },
  { amount: 75, weight: 8, label: '75 🪙', color: '#38BDF8' },
  { amount: 100, weight: 7, label: '100 🪙', color: '#A855F7' },
  { amount: 150, weight: 5, label: '150 🪙', color: '#A855F7' },
  { amount: 200, weight: 4, label: '200 🪙', color: '#A855F7' },
  { amount: 300, weight: 2.5, label: '300 🪙', color: '#F59E0B' },
  { amount: 500, weight: 1.5, label: '500 🪙', color: '#F59E0B' },
];

function spinWheel() {
  const totalWeight = PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const prize of PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return PRIZES[0];
}

export default requireAuth(async function handler(req, res) {
  if (req.method === 'GET') {
    // Return prizes list + whether user can spin today
    try {
      const [user] = await db.select({ lastSpinDate: users.lastSpinDate })
        .from(users).where(eq(users.id, req.userId));
      const today = new Date().toISOString().split('T')[0];
      const canSpin = !user?.lastSpinDate || user.lastSpinDate !== today;
      return res.status(200).json({ prizes: PRIZES, canSpin });
    } catch(e) {
      return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memuat data spin.');
    }
  }

  if (req.method !== 'POST') return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');

  if (!checkRateLimit(`spin:${req.userId}`, 5, 60_000)) {
    return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu cepat. Coba lagi.');
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select({ lastSpinDate: users.lastSpinDate })
        .from(users).where(eq(users.id, req.userId));

      if (!user) throw { status: 404, code: 'NOT_FOUND', message: 'User not found' };

      const today = new Date().toISOString().split('T')[0];
      const prize = spinWheel();

      // Klaim spin harian secara atomik: cek lastSpinDate di UPDATE yang sama
      // supaya dua request bersamaan tidak bisa double-spin
      const [updated] = await tx.update(users).set({
        coins: sql`${users.coins} + ${prize.amount}`,
        lastSpinDate: today,
      }).where(and(
        eq(users.id, req.userId),
        or(isNull(users.lastSpinDate), ne(users.lastSpinDate, today)),
      )).returning({ coins: users.coins });

      if (!updated) {
        throw { status: 400, code: 'ALREADY_SPUN', message: 'Kamu sudah spin hari ini! Coba lagi besok.' };
      }

      // Determine prize index for wheel animation
      const prizeIndex = PRIZES.findIndex(p => p.amount === prize.amount);

      return { prize, prizeIndex, coins: updated.coins };
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.code, err.message);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal spin.');
  }
});
