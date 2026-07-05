// ═══════════════════════════════════════════════════════════════
// Sumber tunggal peluang gacha (dipakai gacha.js + endpoint rates)
// Model 2 tahap: (1) roll rarity dari base chance, (2) weighted pick
// kartu DALAM rarity berdasarkan dropWeight tiap kartu.
// ═══════════════════════════════════════════════════════════════

// Peluang dasar per tier rarity (%). Total = 100.
export const RARITY_BASE_CHANCE = { Legendary: 2, Epic: 8, Rare: 20, Common: 70 };

// Urutan dari paling langka ke paling umum (untuk fallback pool kosong)
export const RARITY_ORDER = ['Legendary', 'Epic', 'Rare', 'Common'];

// Rank untuk sorting reveal (higher = rarer)
export const RARITY_RANK = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };

/**
 * Roll rarity berdasarkan RARITY_BASE_CHANCE (akumulasi dari yang paling umum
 * supaya distribusi persis: Common 70, Rare 20, Epic 8, Legendary 2).
 */
export function rollRarity(rand = Math.random) {
  const r = rand() * 100;
  let acc = 0;
  // akumulasi dari umum → langka
  for (let i = RARITY_ORDER.length - 1; i >= 0; i--) {
    const rarity = RARITY_ORDER[i];
    acc += RARITY_BASE_CHANCE[rarity] || 0;
    if (r < acc) return rarity;
  }
  return 'Common';
}

/**
 * Urutan pencarian kartu bila pool rarity target KOSONG.
 * Prinsip: degradasi ke rarity yang LEBIH UMUM dulu (tidak pernah "naik
 * kelas" ke yang lebih langka kecuali benar-benar tak ada pilihan lain).
 * Mencegah bug: roll Common/Epic yang pool-nya kosong malah jadi Legendary.
 * Contoh Epic → [Epic, Rare, Common, Legendary]; Common → [Common, Rare, Epic, Legendary].
 */
export function fallbackOrder(target) {
  const all = Object.keys(RARITY_RANK); // Common, Rare, Epic, Legendary
  const t = RARITY_RANK[target] ?? 0;
  const moreCommon = all.filter(r => RARITY_RANK[r] < t).sort((a, b) => RARITY_RANK[b] - RARITY_RANK[a]);
  const rarer = all.filter(r => RARITY_RANK[r] > t).sort((a, b) => RARITY_RANK[a] - RARITY_RANK[b]);
  return [target, ...moreCommon, ...rarer];
}

/**
 * Pilih 1 item dari pool proporsional dengan dropWeight.
 * @param {Array<{id:number, dropWeight:number}>} items
 * @returns item terpilih
 */
export function weightedPick(items, rand = Math.random) {
  if (!items.length) return null;
  const total = items.reduce((s, it) => s + Math.max(0, Number(it.dropWeight) || 0), 0);
  if (total <= 0) return items[Math.floor(rand() * items.length)]; // fallback merata
  let r = rand() * total;
  for (const it of items) {
    r -= Math.max(0, Number(it.dropWeight) || 0);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/**
 * Hitung peluang efektif (%) tiap kartu aktif:
 *   dropRate = baseChance(rarity) × dropWeight / Σ dropWeight se-rarity
 * @param {Array<{id:number, rarity:string, dropWeight:number}>} activeCards
 * @returns {Object} map cardId → dropRate(%)
 */
export function computeDropRates(activeCards) {
  const sums = {};
  for (const c of activeCards) {
    const w = Math.max(0, Number(c.dropWeight) || 0);
    sums[c.rarity] = (sums[c.rarity] || 0) + w;
  }
  const map = {};
  for (const c of activeCards) {
    const base = RARITY_BASE_CHANCE[c.rarity] || 0;
    const w = Math.max(0, Number(c.dropWeight) || 0);
    map[c.id] = sums[c.rarity] > 0 ? (base * w) / sums[c.rarity] : 0;
  }
  return map;
}
