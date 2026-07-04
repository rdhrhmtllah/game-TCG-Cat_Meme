import { db } from './db/client.js';
import { users, userMissions, userInventory, marketplaceListings } from './db/schema.js';
import { eq, and, count, gte } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError } from './_lib/errors.js';

/**
 * GET /api/missions — Get daily missions + progress
 * POST /api/missions — Claim a completed mission
 *
 * Missions reset daily. Progress tracked per-day in userMissions table.
 * If no row exists for today, we compute progress from other tables.
 */

const MISSIONS = [
  { key: 'open_pack', title: '🎴 Buka Pack', desc: 'Buka 1 booster pack', target: 1, reward: 50, icon: '🎴' },
  { key: 'open_3_packs', title: '🎴 Kolektor', desc: 'Buka 3 booster pack', target: 3, reward: 120, icon: '📦' },
  { key: 'sell_card', title: '💰 Pedagang', desc: 'Jual 1 kartu ke sistem atau market', target: 1, reward: 40, icon: '💰' },
  { key: 'claim_idle', title: '⚡ Yield Hunter', desc: 'Klaim pendapatan pasif', target: 1, reward: 30, icon: '⚡' },
  { key: 'visit_binder', title: '📒 Kolektor Rajin', desc: 'Kunjungi halaman Binder', target: 1, reward: 20, icon: '📒' },
  { key: 'login_daily', title: '🌅 Hadir!', desc: 'Login hari ini', target: 1, reward: 25, icon: '🌅' },
];

export default requireAuth(async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0];

  if (req.method === 'GET') {
    try {
      // Get user's mission rows for today
      const rows = await db.select()
        .from(userMissions)
        .where(and(eq(userMissions.userId, req.userId), eq(userMissions.missionDate, today)));

      const rowMap = {};
      for (const r of rows) rowMap[r.missionKey] = r;

      const result = MISSIONS.map(m => ({
        ...m,
        progress: rowMap[m.key]?.progress || 0,
        claimed: rowMap[m.key]?.claimed || false,
        completed: (rowMap[m.key]?.progress || 0) >= m.target,
      }));

      return res.status(200).json({ missions: result, date: today });
    } catch (err) {
      return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memuat misi.');
    }
  }

  if (req.method === 'POST') {
    const { missionKey } = req.body || {};
    if (!missionKey) return sendError(res, 400, 'VALIDATION_ERROR', 'missionKey required');

    const mission = MISSIONS.find(m => m.key === missionKey);
    if (!mission) return sendError(res, 404, 'NOT_FOUND', 'Misi tidak ditemukan.');

    try {
      const result = await db.transaction(async (tx) => {
        const [row] = await tx.select()
          .from(userMissions)
          .where(and(
            eq(userMissions.userId, req.userId),
            eq(userMissions.missionKey, missionKey),
            eq(userMissions.missionDate, today),
          ));

        if (!row) throw { status: 400, code: 'NOT_STARTED', message: 'Misi belum dimulai.' };
        if (row.claimed) throw { status: 400, code: 'ALREADY_CLAIMED', message: 'Reward sudah diklaim.' };
        if (row.progress < mission.target) throw { status: 400, code: 'NOT_COMPLETE', message: 'Misi belum selesai.' };

        // Mark claimed
        await tx.update(userMissions)
          .set({ claimed: true })
          .where(eq(userMissions.id, row.id));

        // Add coins
        const [user] = await tx.select({ coins: users.coins })
          .from(users).where(eq(users.id, req.userId));
        const newCoins = user.coins + mission.reward;
        await tx.update(users).set({ coins: newCoins }).where(eq(users.id, req.userId));

        return { reward: mission.reward, coins: newCoins };
      });

      return res.status(200).json(result);
    } catch (err) {
      if (err.status) return sendError(res, err.status, err.code, err.message);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal klaim reward misi.');
    }
  }

  return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
});

/**
 * Helper: increment mission progress. Called from other APIs.
 * Usage: await incrementMission(userId, 'open_pack');
 */
export async function incrementMission(userId, missionKey) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const [existing] = await db.select()
      .from(userMissions)
      .where(and(
        eq(userMissions.userId, userId),
        eq(userMissions.missionKey, missionKey),
        eq(userMissions.missionDate, today),
      ));

    if (existing) {
      await db.update(userMissions)
        .set({ progress: existing.progress + 1 })
        .where(eq(userMissions.id, existing.id));
    } else {
      await db.insert(userMissions).values({
        userId,
        missionKey,
        progress: 1,
        claimed: false,
        missionDate: today,
      });
    }
  } catch(e) { /* silently fail — missions are non-critical */ }
}
