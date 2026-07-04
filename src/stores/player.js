import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth.js';

export const usePlayerStore = defineStore('player', () => {
  const inventory = ref([]);
  const showcase = ref([]);
  const masterCards = ref([]);
  const hasSeenWelcome = ref(false);

  // Card Dex progress
  const totalCardsOwned = computed(() => {
    const uniqueIds = new Set(inventory.value.map(i => i.cardId));
    return uniqueIds.size;
  });

  const totalCardsInGame = computed(() => masterCards.value.length);

  const dexProgress = computed(() => {
    if (totalCardsInGame.value === 0) return 0;
    return Math.round((totalCardsOwned.value / totalCardsInGame.value) * 100);
  });

  // ── Yield Pasif Constants ──────────────────────────────
  const MAX_IDLE_SECONDS = 86400;
  const STREAK_MAX_DAYS = 14;
  const STREAK_BONUS_PER_DAY = 0.05;
  const COLLECTION_BONUS_PER_CARD = 0.03;
  const SYNERGY_THRESHOLD = 3;
  const SYNERGY_MULTIPLIER = 1.10;

  // Showcase likes/sec
  const totalLikesPerSec = computed(() => {
    return showcase.value.reduce((sum, card) => sum + (card.likesPerSec || 0), 0);
  });

  // ── Yield Pasif Computed ───────────────────────────────
  // Jumlah kartu unik yang dimiliki
  const uniqueCardsOwned = computed(() =>
    new Set(inventory.value.map(i => i.cardId)).size
  );

  // Bonus dari koleksi kartu unik
  const collectionBonus = computed(() =>
    parseFloat((uniqueCardsOwned.value * COLLECTION_BONUS_PER_CARD).toFixed(2))
  );

  // Streak multiplier (dari daily login)
  const streakMultiplier = computed(() => {
    const authStore = useAuthStore();
    const streak = Math.min(authStore.user?.loginStreak || 0, STREAK_MAX_DAYS);
    return parseFloat((1 + streak * STREAK_BONUS_PER_DAY).toFixed(2));
  });

  // Synergy multiplier (≥3 kartu element sama di showcase)
  const synergyMultiplier = computed(() => {
    const counts = {};
    for (const card of showcase.value) {
      const el = card.element || 'Normal';
      counts[el] = (counts[el] || 0) + 1;
    }
    const hasSynergy = Object.values(counts).some(c => c >= SYNERGY_THRESHOLD);
    return hasSynergy ? SYNERGY_MULTIPLIER : 1.0;
  });

  // Effective likes/sec (full formula client-side preview)
  const effectiveLikesPerSec = computed(() => {
    const base = totalLikesPerSec.value;
    const col = collectionBonus.value;
    const streak = streakMultiplier.value;
    const synergy = synergyMultiplier.value;
    return parseFloat(((base + col) * streak * synergy).toFixed(3));
  });

  // Total multiplier untuk display
  const totalYieldMultiplier = computed(() =>
    parseFloat((streakMultiplier.value * synergyMultiplier.value).toFixed(2))
  );

  // Progress menuju cap 24 jam (0-100)
  const yieldCapProgress = computed(() => {
    const authStore = useAuthStore();
    if (!authStore.user?.lastClaimedAt) return 0;
    const elapsed = Math.max(0, Math.floor(
      (Date.now() - new Date(authStore.user.lastClaimedAt).getTime()) / 1000
    ));
    return Math.min(100, (elapsed / MAX_IDLE_SECONDS) * 100);
  });

  // Element counts di showcase (untuk synergy display)
  const showcaseElementCounts = computed(() => {
    const counts = {};
    for (const card of showcase.value) {
      const el = card.element || 'Normal';
      counts[el] = (counts[el] || 0) + 1;
    }
    return counts;
  });

  // Full breakdown object
  const yieldBreakdown = computed(() => ({
    baseShowcaseRate: totalLikesPerSec.value,
    collectionBonus: collectionBonus.value,
    streakMultiplier: streakMultiplier.value,
    synergyMultiplier: synergyMultiplier.value,
    effectiveLikesPerSec: effectiveLikesPerSec.value,
    uniqueCardsOwned: uniqueCardsOwned.value,
    totalMultiplier: totalYieldMultiplier.value,
  }));

  // Featured card — highest rarity in showcase
  const featuredCard = computed(() => {
    if (showcase.value.length === 0) return null;
    const rarityOrder = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
    return showcase.value.reduce((best, card) =>
      (rarityOrder[card.rarity] || 0) > (rarityOrder[best.rarity] || 0) ? card : best
    , showcase.value[0]);
  });

  // Coins
  const coins = computed(() => {
    const authStore = useAuthStore();
    return authStore.user?.coins ?? 0;
  });

  // Check if showcase is full
  const isShowcaseFull = computed(() => showcase.value.length >= 5);

  // Safe JSON parser — handles empty responses (e.g. backend down)
  async function safeJson(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (!text || text.trim() === '') {
        throw { status: res.status, code: 'BACKEND_OFFLINE', message: 'Server tidak merespon.' };
      }
      throw { status: res.status, code: 'INVALID_RESPONSE', message: `Respon tidak valid (${res.status}).` };
    }
  }

  async function fetchMasterCards() {
    const res = await fetch('/api/master-cards');
    const data = await safeJson(res);
    if (res.ok) masterCards.value = data.cards;
  }

  async function fetchInventory() {
    const authStore = useAuthStore();
    if (!authStore.token) return;
    const res = await fetch('/api/inventory', {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await safeJson(res);
    if (res.ok) {
      inventory.value = data.inventory;
      showcase.value = data.inventory.filter(i => i.inShowcase).map(i => ({
        ...i.card,
        cardInventoryId: i.id,
        quantity: i.quantity,
      }));
    }
  }

  async function refreshAfterAction() {
    const authStore = useAuthStore();
    await Promise.all([
      authStore.fetchMe(),
      fetchInventory(),
    ]);
  }

  function reset() {
    inventory.value = [];
    showcase.value = [];
    masterCards.value = [];
    hasSeenWelcome.value = false;
  }

  return {
    inventory,
    showcase,
    masterCards,
    hasSeenWelcome,
    totalCardsOwned,
    totalCardsInGame,
    dexProgress,
    totalLikesPerSec,
    coins,
    isShowcaseFull,
    featuredCard,
    // Yield Pasif
    uniqueCardsOwned,
    collectionBonus,
    streakMultiplier,
    synergyMultiplier,
    effectiveLikesPerSec,
    totalYieldMultiplier,
    yieldCapProgress,
    showcaseElementCounts,
    yieldBreakdown,
    fetchMasterCards,
    fetchInventory,
    refreshAfterAction,
    reset,
  };
});
