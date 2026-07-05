// ═══════════════════════════════════════════════════════════════
// Progression: kurva XP/Level + grant XP atomik + konstanta pity.
// Kurva HARUS sama dengan src/utils/progression.js (frontend).
// ═══════════════════════════════════════════════════════════════
import { sql } from 'drizzle-orm';
import { users } from '../db/schema.js';

// XP yang dibutuhkan DI DALAM suatu level untuk naik ke level berikutnya.
export function xpForLevel(level) {
  return Math.floor(80 * Math.pow(level, 1.35));
}

// Hitung level + progres dari total XP.
// → { level, xpIntoLevel, xpForNext, totalXp }
export function computeLevel(totalXp) {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp || 0));
  // batasi iterasi (aman dari input aneh)
  while (level < 999) {
    const need = xpForLevel(level);
    if (remaining < need) break;
    remaining -= need;
    level++;
  }
  return { level, xpIntoLevel: remaining, xpForNext: xpForLevel(level), totalXp: Math.floor(totalXp || 0) };
}

// XP per aksi (retention). Kecil tapi bermakna.
export const XP_REWARDS = {
  open_pack: 25,
  claim_idle: 10,
  daily_login: 20,
  spin: 8,
  coin_flip: 5,
  fusion: 30,
  mission: 15,
  achievement: 40,
  daily_quest_bonus: 30,
};

// Pity gacha: jaminan Epic+ setelah N kartu tanpa Epic/Legendary.
export const PITY_THRESHOLD = 25;

// Bonus coin saat naik level (skalanya dengan level baru).
export function levelUpCoinBonus(newLevel) {
  return 50 * newLevel;
}

/**
 * Tambah XP secara atomik + tangani level-up dalam satu transaksi.
 * @param {*} tx  transaksi drizzle (atau db)
 * @param {number} userId
 * @param {number} amount  XP ditambahkan
 * @returns {{ leveledUp, oldLevel, newLevel, xp, coinBonus }}
 */
export async function grantXp(tx, userId, amount) {
  const amt = Math.max(0, Math.floor(amount || 0));
  if (amt === 0) return { leveledUp: false, oldLevel: 1, newLevel: 1, xp: 0, coinBonus: 0 };

  // Naikkan XP atomik, ambil xp & level lama
  const [row] = await tx.update(users)
    .set({ xp: sql`${users.xp} + ${amt}` })
    .where(sql`${users.id} = ${userId}`)
    .returning({ xp: users.xp, level: users.level });

  const oldLevel = row.level;
  const { level: newLevel } = computeLevel(row.xp);

  let coinBonus = 0;
  if (newLevel > oldLevel) {
    // Bonus coin akumulatif untuk semua level yang dilewati
    for (let l = oldLevel + 1; l <= newLevel; l++) coinBonus += levelUpCoinBonus(l);
    await tx.update(users)
      .set({ level: newLevel, coins: sql`${users.coins} + ${coinBonus}` })
      .where(sql`${users.id} = ${userId}`);
  }

  return { leveledUp: newLevel > oldLevel, oldLevel, newLevel, xp: row.xp, coinBonus };
}
