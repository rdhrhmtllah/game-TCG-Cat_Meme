import { db } from './db/client.js';
import { users, coinFlipHistory } from './db/schema.js';
import { eq } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError } from './_lib/errors.js';
import { checkRateLimit } from './_lib/rateLimit.js';

/**
 * POST /api/coin-flip
 * Bet coins, 50/50 chance to double or lose.
 * Min bet: 10, Max bet: 500
 */
const MIN_BET = 10;
const MAX_BET = 500;

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');

  if (!checkRateLimit(`flip:${req.userId}`, 20, 60_000)) {
    return sendError(res, 429, 'VALIDATION_ERROR', 'Terlalu cepat. Tunggu sebentar.');
  }

  const { bet, choice } = req.body || {};
  const betAmount = parseInt(bet);

  if (!betAmount || betAmount < MIN_BET || betAmount > MAX_BET) {
    return sendError(res, 400, 'VALIDATION_ERROR', `Bet harus antara ${MIN_BET} dan ${MAX_BET} coin.`);
  }

  if (!choice || !['heads', 'tails'].includes(choice)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Pilih heads atau tails.');
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select({ coins: users.coins })
        .from(users).where(eq(users.id, req.userId));

      if (!user) throw { status: 404, code: 'NOT_FOUND', message: 'User not found' };
      if (user.coins < betAmount) throw { status: 400, code: 'INSUFFICIENT_FUNDS', message: 'Koin tidak cukup untuk taruhan.' };

      // Flip the coin
      const flipResult = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = flipResult === choice;
      const coinChange = won ? betAmount : -betAmount;
      const newCoins = user.coins + coinChange;

      await tx.update(users).set({ coins: newCoins }).where(eq(users.id, req.userId));

      // Audit log
      await tx.insert(coinFlipHistory).values({
        userId: req.userId,
        betAmount,
        result: won ? 'win' : 'lose',
      });

      return {
        flipResult,
        choice,
        won,
        betAmount,
        coinChange: won ? betAmount : -betAmount,
        coins: newCoins,
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.code, err.message);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal flip coin.');
  }
});
