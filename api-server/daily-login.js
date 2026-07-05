import { db } from './db/client.js';
import { users, userMissions, userInventory, userAchievements } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError } from './_lib/errors.js';
import { grantXp, XP_REWARDS } from './_lib/progression.js';

/**
 * POST /api/daily-login
 * Claim daily login bonus. Streak = consecutive days.
 * Day 1: 50, Day 2: 75, Day 3: 100, Day 4: 125, Day 5: 150, Day 6: 200, Day 7+: 500
 */
const STREAK_REWARDS = [50, 75, 100, 125, 150, 200, 500];

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select({
        coins: users.coins,
        loginStreak: users.loginStreak,
        lastLoginDate: users.lastLoginDate,
      }).from(users).where(eq(users.id, req.userId));

      if (!user) throw { status: 404, code: 'NOT_FOUND', message: 'User not found' };

      const today = new Date().toISOString().split('T')[0];
      const lastLogin = user.lastLoginDate;

      // Already claimed today
      if (lastLogin === today) {
        return { alreadyClaimed: true, streak: user.loginStreak, reward: 0, coins: user.coins };
      }

      // Check if streak continues (yesterday) or resets
      let newStreak = 1;
      if (lastLogin) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (lastLogin === yesterdayStr) {
          newStreak = user.loginStreak + 1;
        }
      }

      const rewardIdx = Math.min(newStreak - 1, STREAK_REWARDS.length - 1);
      const reward = STREAK_REWARDS[rewardIdx];

      // Grant coin secara atomik (race-safe)
      const [updated] = await tx.update(users).set({
        coins: sql`${users.coins} + ${reward}`,
        loginStreak: newStreak,
        lastLoginDate: today,
      }).where(eq(users.id, req.userId)).returning({ coins: users.coins });

      // XP retention (+ level-up/bonus)
      const xpr = await grantXp(tx, req.userId, XP_REWARDS.daily_login);
      const newCoins = updated.coins + (xpr.coinBonus || 0);

      return {
        alreadyClaimed: false, streak: newStreak, reward, coins: newCoins,
        levelUp: xpr.leveledUp ? { level: xpr.newLevel, coinBonus: xpr.coinBonus } : null,
      };
    });

    // Track login_daily mission
    if (!result.alreadyClaimed) {
      try {
        const { incrementMission } = await import('./missions.js');
        await incrementMission(req.userId, 'login_daily');
      } catch(e) {}
    }

    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.code, err.message);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal klaim login harian.');
  }
});
