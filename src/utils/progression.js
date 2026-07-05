// Kurva XP/Level untuk render XP bar. HARUS sama dengan
// api-server/_lib/progression.js (backend). Konstanta pity ikut di sini.

export const PITY_THRESHOLD = 25;

export function xpForLevel(level) {
  return Math.floor(80 * Math.pow(level, 1.35));
}

// Bonus coin saat naik ke suatu level. HARUS sama dengan backend
// (api-server/_lib/progression.js → levelUpCoinBonus).
export function levelUpCoinBonus(level) {
  return 50 * level;
}

// Nilai XP per aksi. HARUS cocok dengan XP_REWARDS di backend.
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

// Daftar sumber XP yang ramah-pengguna (untuk panduan "Dari mana XP?").
// Diurutkan dari XP terbesar → terkecil.
export const XP_SOURCES = [
  { icon: '🏅', label: 'Klaim achievement', xp: XP_REWARDS.achievement, where: 'Activities' },
  { icon: '🔮', label: 'Fusion kartu', xp: XP_REWARDS.fusion, where: 'Activities' },
  { icon: '🎯', label: 'Selesaikan quest harian', xp: XP_REWARDS.daily_quest_bonus, where: 'Activities' },
  { icon: '🎴', label: 'Buka booster pack', xp: XP_REWARDS.open_pack, where: 'Gacha' },
  { icon: '📅', label: 'Klaim login harian', xp: XP_REWARDS.daily_login, where: 'Activities' },
  { icon: '📋', label: 'Selesaikan misi', xp: XP_REWARDS.mission, where: 'Activities' },
  { icon: '💰', label: 'Klaim yield pasif', xp: XP_REWARDS.claim_idle, where: 'Home' },
  { icon: '🎡', label: 'Main spin wheel', xp: XP_REWARDS.spin, where: 'Activities' },
  { icon: '🪙', label: 'Main coin flip', xp: XP_REWARDS.coin_flip, where: 'Activities' },
];

// Total XP → { level, xpIntoLevel, xpForNext, progress(0..1) }
export function computeLevel(totalXp) {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp || 0));
  while (level < 999) {
    const need = xpForLevel(level);
    if (remaining < need) break;
    remaining -= need;
    level++;
  }
  const xpForNext = xpForLevel(level);
  return {
    level,
    xpIntoLevel: remaining,
    xpForNext,
    progress: xpForNext > 0 ? Math.min(1, remaining / xpForNext) : 0,
  };
}
