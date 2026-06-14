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

  // Showcase likes/sec
  const totalLikesPerSec = computed(() => {
    return showcase.value.reduce((sum, card) => sum + (card.likesPerSec || 0), 0);
  });

  // Coins
  const coins = computed(() => {
    const authStore = useAuthStore();
    return authStore.user?.coins ?? 0;
  });

  // Check if showcase is full
  const isShowcaseFull = computed(() => showcase.value.length >= 5);

  async function fetchMasterCards() {
    const res = await fetch('/api/master-cards');
    const data = await res.json();
    if (res.ok) masterCards.value = data.cards;
  }

  async function fetchInventory() {
    const authStore = useAuthStore();
    if (!authStore.token) return;
    const res = await fetch('/api/inventory', {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await res.json();
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
    fetchMasterCards,
    fetchInventory,
    refreshAfterAction,
    reset,
  };
});
