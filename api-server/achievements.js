import { db } from './db/client.js';
import { users, userAchievements, userInventory } from './db/schema.js';
import { eq, and, count, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError } from './_lib/errors.js';
import { grantXp, XP_REWARDS } from './_lib/progression.js';

/**
 * GET /api/achievements — Get all achievements + user's claim status
 * POST /api/achievements — Claim an achievement reward
 */

const ACHIEVEMENTS = [
  { key: 'first_card', title: '🐱 Kolektor Pemula', desc: 'Dapatkan kartu pertamamu', condition: 'cards_owned >= 1', reward: 100, icon: '🐱' },
  { key: 'collect_5', title: '📚 Pengumpul', desc: 'Kumpulkan 5 kartu unik', condition: 'cards_owned >= 5', reward: 200, icon: '📚' },
  { key: 'collect_10', title: '🏅 Kolektor Sejati', desc: 'Kumpulkan 10 kartu unik', condition: 'cards_owned >= 10', reward: 500, icon: '🏅' },
  { key: 'collect_20', title: '🏆 Master Kolektor', desc: 'Kumpulkan 20 kartu unik', condition: 'cards_owned >= 20', reward: 1000, icon: '🏆' },
  { key: 'first_rare', title: '💠 Rare Hunter', desc: 'Dapatkan kartu Rare pertama', condition: 'has_rarity >= Rare', reward: 150, icon: '💠' },
  { key: 'first_epic', title: '💎 Epic Discovery', desc: 'Dapatkan kartu Epic pertama', condition: 'has_rarity >= Epic', reward: 300, icon: '💎' },
  { key: 'first_legendary', title: '👑 LEGENDARIS!', desc: 'Dapatkan kartu Legendary pertama', condition: 'has_rarity >= Legendary', reward: 1000, icon: '👑' },
  { key: 'streak_3', title: '🔥 3-Day Streak', desc: 'Login 3 hari berturut-turut', condition: 'login_streak >= 3', reward: 200, icon: '🔥' },
  { key: 'streak_7', title: '🔥🔥 7-Day Streak', desc: 'Login 7 hari berturut-turut', condition: 'login_streak >= 7', reward: 500, icon: '🔥' },
  { key: 'dex_50', title: '📖 Setengah Jalan', desc: 'Koleksi 50% Card Dex', condition: 'dex_progress >= 50', reward: 750, icon: '📖' },
  { key: 'rich_1000', title: '💰 Kaya Raya', desc: 'Miliki 1000 coin sekaligus', condition: 'coins >= 1000', reward: 100, icon: '💰' },
  { key: 'rich_5000', title: '🤑 Tajir Melintir', desc: 'Miliki 5000 coin sekaligus', condition: 'coins >= 5000', reward: 300, icon: '🤑' },
];

async function checkCondition(userId, condition) {
  if (condition.startsWith('cards_owned >=')) {
    const target = parseInt(condition.split('>= ')[1]);
    const [result] = await db.select({ cnt: count() })
      .from(userInventory)
      .where(eq(userInventory.userId, userId));
    return (result?.cnt || 0) >= target;
  }
  if (condition.startsWith('has_rarity >=')) {
    const rarity = condition.split('>= ')[1];
    const inv = await db.select({ cardId: userInventory.cardId })
      .from(userInventory)
      .where(eq(userInventory.userId, userId));
    if (inv.length === 0) return false;
    // We need to join with masterCards — simplified check
    const { masterCards: mc } = await import('./db/schema.js');
    const cards = await db.select({ rarity: mc.rarity })
      .from(mc)
      .where(sql`${mc.id} IN (${sql.join(inv.map(i => sql`${i.cardId}`), sql`, `)})`);
    return cards.some(c => c.rarity === rarity);
  }
  if (condition.startsWith('login_streak >=')) {
    const target = parseInt(condition.split('>= ')[1]);
    const [user] = await db.select({ loginStreak: users.loginStreak })
      .from(users).where(eq(users.id, userId));
    return (user?.loginStreak || 0) >= target;
  }
  if (condition.startsWith('dex_progress >=')) {
    const target = parseInt(condition.split('>= ')[1]);
    const { masterCards: mc } = await import('./db/schema.js');
    const [totalResult] = await db.select({ cnt: count() }).from(mc);
    const [ownedResult] = await db.select({ cnt: count() })
      .from(userInventory).where(eq(userInventory.userId, userId));
    const total = totalResult?.cnt || 1;
    const progress = Math.round(((ownedResult?.cnt || 0) / total) * 100);
    return progress >= target;
  }
  if (condition.startsWith('coins >=')) {
    const target = parseInt(condition.split('>= ')[1]);
    const [user] = await db.select({ coins: users.coins })
      .from(users).where(eq(users.id, userId));
    return (user?.coins || 0) >= target;
  }
  return false;
}

export default requireAuth(async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const claimed = await db.select({ achievementKey: userAchievements.achievementKey })
        .from(userAchievements)
        .where(eq(userAchievements.userId, req.userId));
      const claimedSet = new Set(claimed.map(c => c.achievementKey));

      const results = [];
      for (const ach of ACHIEVEMENTS) {
        const isClaimed = claimedSet.has(ach.key);
        const eligible = isClaimed ? true : await checkCondition(req.userId, ach.condition);
        results.push({ ...ach, claimed: isClaimed, eligible });
      }
      return res.status(200).json({ achievements: results });
    } catch (err) {
      return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memuat achievements.');
    }
  }

  if (req.method === 'POST') {
    const { achievementKey } = req.body || {};
    if (!achievementKey) return sendError(res, 400, 'VALIDATION_ERROR', 'achievementKey required');

    const ach = ACHIEVEMENTS.find(a => a.key === achievementKey);
    if (!ach) return sendError(res, 404, 'NOT_FOUND', 'Achievement tidak ditemukan.');

    try {
      const result = await db.transaction(async (tx) => {
        // Check not already claimed
        const [existing] = await tx.select()
          .from(userAchievements)
          .where(and(eq(userAchievements.userId, req.userId), eq(userAchievements.achievementKey, achievementKey)));
        if (existing) throw { status: 400, code: 'ALREADY_CLAIMED', message: 'Achievement sudah diklaim.' };

        // Check eligible
        const eligible = await checkCondition(req.userId, ach.condition);
        if (!eligible) throw { status: 400, code: 'NOT_ELIGIBLE', message: 'Syarat achievement belum terpenuhi.' };

        // Claim (grant coin atomik)
        await tx.insert(userAchievements).values({ userId: req.userId, achievementKey });
        const [updated] = await tx.update(users)
          .set({ coins: sql`${users.coins} + ${ach.reward}` })
          .where(eq(users.id, req.userId))
          .returning({ coins: users.coins });

        // XP retention + level-up
        const xpr = await grantXp(tx, req.userId, XP_REWARDS.achievement);

        return {
          reward: ach.reward, coins: updated.coins + (xpr.coinBonus || 0),
          levelUp: xpr.leveledUp ? { level: xpr.newLevel, coinBonus: xpr.coinBonus } : null,
        };
      });

      return res.status(200).json(result);
    } catch (err) {
      if (err.status) return sendError(res, err.status, err.code, err.message);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal klaim achievement.');
    }
  }

  return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
});
