import { db } from './db/client.js';
import { users, userMissions } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError } from './_lib/errors.js';
import { grantXp, XP_REWARDS } from './_lib/progression.js';

/**
 * GET  /api/missions        — daily quest hari ini + progress
 * POST /api/missions        — { missionKey } klaim quest selesai
 * POST /api/missions        — { action:'visit' } increment quest visit_binder (whitelist)
 *
 * Daily Quest: dari POOL besar, 5 quest dipilih per hari (seeded tanggal →
 * sama untuk semua pemain, stabil dalam sehari). Reset harian via missionDate.
 * Bonus "selesaikan semua" diberikan sekali (row key _daily_bonus).
 */

// Pool quest. login_daily selalu tampil (freebie); sisanya dirotasi.
const QUEST_POOL = [
  { key: 'open_pack',    title: '🎴 Buka Pack',      desc: 'Buka 1 booster pack',              target: 1, reward: 50,  xp: XP_REWARDS.mission, icon: '🎴' },
  { key: 'open_3_packs', title: '📦 Kolektor',       desc: 'Buka 3 booster pack',              target: 3, reward: 120, xp: 40, icon: '📦' },
  { key: 'sell_card',    title: '💰 Pedagang',       desc: 'Jual/pajang 1 kartu',              target: 1, reward: 40,  xp: XP_REWARDS.mission, icon: '💰' },
  { key: 'buy_market',   title: '🛒 Pemburu',        desc: 'Beli 1 kartu di marketplace',      target: 1, reward: 45,  xp: XP_REWARDS.mission, icon: '🛒' },
  { key: 'claim_idle',   title: '⚡ Yield Hunter',    desc: 'Klaim pendapatan pasif',           target: 1, reward: 30,  xp: XP_REWARDS.mission, icon: '⚡' },
  { key: 'spin_today',   title: '🎡 Peruntungan',    desc: 'Putar spin wheel hari ini',        target: 1, reward: 30,  xp: XP_REWARDS.mission, icon: '🎡' },
  { key: 'win_coinflip', title: '🪙 Hoki',           desc: 'Menang 1 coin flip',               target: 1, reward: 35,  xp: XP_REWARDS.mission, icon: '🪙' },
  { key: 'fuse_card',    title: '✨ Alkemis',        desc: 'Fusion 1 kali',                    target: 1, reward: 60,  xp: 25, icon: '✨' },
  { key: 'visit_binder', title: '📒 Kolektor Rajin', desc: 'Kunjungi halaman Binder',          target: 1, reward: 20,  xp: 10, icon: '📒' },
];

// Quest yang selalu muncul tiap hari
const ALWAYS = ['login_daily'];
const LOGIN_QUEST = { key: 'login_daily', title: '🌅 Hadir!', desc: 'Login hari ini', target: 1, reward: 25, xp: XP_REWARDS.mission, icon: '🌅' };

// Berapa quest rotasi selain yang selalu ada
const DAILY_ROTATION_COUNT = 4;
const BONUS_KEY = '_daily_bonus';
const BONUS_REWARD = { coins: 150, xp: XP_REWARDS.daily_quest_bonus };

// PRNG seeded (mulberry32) untuk shuffle deterministik per tanggal
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0;
  const rand = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dateSeed(dateStr) {
  // "YYYY-MM-DD" → integer seed
  return parseInt(dateStr.replace(/-/g, ''), 10) || 0;
}

// Daftar quest aktif hari ini (login + rotasi terpilih), deterministik.
export function getDailyQuests(dateStr) {
  const rotatable = QUEST_POOL.filter(q => !ALWAYS.includes(q.key));
  const picked = seededShuffle(rotatable, dateSeed(dateStr)).slice(0, DAILY_ROTATION_COUNT);
  return [LOGIN_QUEST, ...picked];
}

export default requireAuth(async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0];
  const dailyQuests = getDailyQuests(today);

  if (req.method === 'GET') {
    try {
      const rows = await db.select()
        .from(userMissions)
        .where(and(eq(userMissions.userId, req.userId), eq(userMissions.missionDate, today)));

      const rowMap = {};
      for (const r of rows) rowMap[r.missionKey] = r;

      const quests = dailyQuests.map(m => ({
        ...m,
        progress: rowMap[m.key]?.progress || 0,
        claimed: rowMap[m.key]?.claimed || false,
        completed: (rowMap[m.key]?.progress || 0) >= m.target,
      }));

      const allClaimed = quests.every(q => q.claimed);
      const bonusClaimed = !!rowMap[BONUS_KEY]?.claimed;

      return res.status(200).json({
        missions: quests,
        date: today,
        bonus: { reward: BONUS_REWARD.coins, xp: BONUS_REWARD.xp, allClaimed, bonusClaimed },
      });
    } catch (err) {
      return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal memuat quest.');
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    // Aksi frontend ter-whitelist: kunjungi binder
    if (body.action === 'visit') {
      // hanya jika visit_binder termasuk quest aktif hari ini
      if (dailyQuests.some(q => q.key === 'visit_binder')) {
        await incrementMission(req.userId, 'visit_binder');
      }
      return res.status(200).json({ ok: true });
    }

    const { missionKey } = body;
    if (!missionKey) return sendError(res, 400, 'VALIDATION_ERROR', 'missionKey required');

    // Klaim bonus "selesaikan semua"
    if (missionKey === BONUS_KEY) {
      try {
        const result = await db.transaction(async (tx) => {
          const rows = await tx.select().from(userMissions)
            .where(and(eq(userMissions.userId, req.userId), eq(userMissions.missionDate, today)));
          const rowMap = {}; for (const r of rows) rowMap[r.missionKey] = r;

          const allClaimed = dailyQuests.every(q => rowMap[q.key]?.claimed);
          if (!allClaimed) throw { status: 400, code: 'NOT_COMPLETE', message: 'Selesaikan semua quest dulu.' };
          if (rowMap[BONUS_KEY]?.claimed) throw { status: 400, code: 'ALREADY_CLAIMED', message: 'Bonus sudah diklaim.' };

          await tx.insert(userMissions).values({
            userId: req.userId, missionKey: BONUS_KEY, progress: 1, claimed: true, missionDate: today,
          });
          const [updated] = await tx.update(users)
            .set({ coins: sql`${users.coins} + ${BONUS_REWARD.coins}` })
            .where(eq(users.id, req.userId)).returning({ coins: users.coins });
          const xpr = await grantXp(tx, req.userId, BONUS_REWARD.xp);

          return {
            reward: BONUS_REWARD.coins, coins: updated.coins + (xpr.coinBonus || 0), bonus: true,
            levelUp: xpr.leveledUp ? { level: xpr.newLevel, coinBonus: xpr.coinBonus } : null,
          };
        });
        return res.status(200).json(result);
      } catch (err) {
        if (err.status) return sendError(res, err.status, err.code, err.message);
        return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal klaim bonus.');
      }
    }

    // Klaim quest biasa (hanya yang aktif hari ini)
    const mission = dailyQuests.find(m => m.key === missionKey);
    if (!mission) return sendError(res, 404, 'NOT_FOUND', 'Quest tidak aktif hari ini.');

    try {
      const result = await db.transaction(async (tx) => {
        const [row] = await tx.select().from(userMissions)
          .where(and(
            eq(userMissions.userId, req.userId),
            eq(userMissions.missionKey, missionKey),
            eq(userMissions.missionDate, today),
          ));

        if (!row) throw { status: 400, code: 'NOT_STARTED', message: 'Quest belum dimulai.' };
        if (row.claimed) throw { status: 400, code: 'ALREADY_CLAIMED', message: 'Reward sudah diklaim.' };
        if (row.progress < mission.target) throw { status: 400, code: 'NOT_COMPLETE', message: 'Quest belum selesai.' };

        await tx.update(userMissions).set({ claimed: true }).where(eq(userMissions.id, row.id));

        // Coin atomik + XP retention
        const [updated] = await tx.update(users)
          .set({ coins: sql`${users.coins} + ${mission.reward}` })
          .where(eq(users.id, req.userId)).returning({ coins: users.coins });
        const xpr = await grantXp(tx, req.userId, mission.xp || XP_REWARDS.mission);

        return {
          reward: mission.reward, coins: updated.coins + (xpr.coinBonus || 0),
          levelUp: xpr.leveledUp ? { level: xpr.newLevel, coinBonus: xpr.coinBonus } : null,
        };
      });

      return res.status(200).json(result);
    } catch (err) {
      if (err.status) return sendError(res, err.status, err.code, err.message);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal klaim reward quest.');
    }
  }

  return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
});

/**
 * Helper: increment progress quest. Dipanggil dari API lain.
 * Aman dipanggil untuk key apapun (kalau tidak aktif hari ini, sekadar
 * tersimpan tanpa efek).
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
        userId, missionKey, progress: 1, claimed: false, missionDate: today,
      });
    }
  } catch (e) { /* silently fail — non-critical */ }
}
