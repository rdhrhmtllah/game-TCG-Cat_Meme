<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">📒 Binder</h1>
      <span class="text-sm text-text-muted">{{ filteredInventory.length }} kartu</span>
    </div>

    <!-- View Toggle -->
    <div class="flex mb-3 bg-surface-card rounded-xl p-1 gap-1">
      <button @click="showAll = false" class="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
        :class="!showAll ? 'bg-accent text-white shadow-lg' : 'text-text-muted hover:text-text-secondary'">
        Milikku
      </button>
      <button @click="showAll = true" class="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
        :class="showAll ? 'bg-accent text-white shadow-lg' : 'text-text-muted hover:text-text-secondary'">
        Semua Kartu
      </button>
    </div>

    <!-- Filter Chips -->
    <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
      <button v-for="r in filters" :key="r.value" @click="activeRarity = r.value"
        class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border"
        :class="(activeRarity === r.value)
          ? r.activeClass
          : 'border-white/10 text-text-muted hover:border-white/20 hover:text-text-secondary'">
        {{ r.label }}
      </button>
    </div>

    <!-- Card Grid -->
    <div v-if="displayCards.length === 0">
      <div class="glass-panel p-8 text-center">
        <p class="text-4xl mb-3">📭</p>
        <p class="text-text-secondary font-medium mb-1">
          {{ showAll ? 'Belum ada kartu dalam game.' : 'Kamu belum punya kartu.' }}
        </p>
        <p class="text-text-muted text-sm mb-4">
          {{ showAll ? 'Admin akan menambahkan kartu segera!' : 'Yuk buka pack pertamamu!' }}
        </p>
        <router-link v-if="!showAll" to="/gacha" class="btn-primary text-sm">🎴 Buka Gacha</router-link>
      </div>
    </div>

    <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      <div v-for="item in displayCards" :key="item.id || item.cardId"
        class="relative cursor-pointer card-hover"
        :class="[item.owned ? 'opacity-100' : 'opacity-40 grayscale', 'card-frame-' + (item.card?.rarity || 'Common').toLowerCase()]"
        @click="item.owned ? openDetail(item.inventoryItem) : null"
      >
        <!-- Card Image -->
        <div class="aspect-[5/7] rounded-lg overflow-hidden bg-surface-card m-1">
          <img v-if="item.card?.imageUrl" :src="item.card.imageUrl" :alt="item.card.name"
            class="w-full h-full object-cover" loading="lazy" />
          <div v-else class="w-full h-full flex items-center justify-center text-3xl">
            {{ rarityEmoji(item.card?.rarity) }}
          </div>
          <!-- Name overlay at bottom -->
          <div class="absolute bottom-0 left-1 right-1 h-12 bg-gradient-to-t from-black/90 to-transparent rounded-b-lg flex items-end pb-1.5 px-2">
            <p class="text-[11px] font-semibold text-white truncate w-full text-center leading-tight">
              {{ item.card?.name }}
            </p>
          </div>
        </div>

        <!-- Quantity badge -->
        <span v-if="item.quantity > 1"
          class="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center z-10 shadow-md">
          {{ item.quantity }}
        </span>

        <!-- Showcase star -->
        <span v-if="item.inventoryItem?.inShowcase"
          class="absolute top-0.5 left-0.5 text-yellow-400 text-xs z-10 drop-shadow-lg">⭐</span>

        <!-- Rarity badge -->
        <span class="absolute bottom-3 right-1 rarity-badge text-[9px]"
          :class="'rarity-' + (item.card?.rarity || 'Common').toLowerCase()">
          {{ item.card?.rarity }}
        </span>
      </div>
    </div>

    <!-- Card Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedCard" class="modal-overlay flex items-center justify-center p-4" @click.self="closeDetail">
          <div class="modal-content glass-panel w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="flex items-start justify-between p-4 pb-0">
              <div>
                <h2 class="text-lg font-bold">{{ selectedCard.card?.name }}</h2>
                <span class="rarity-badge" :class="'rarity-' + (selectedCard.card?.rarity || '').toLowerCase()">
                  {{ selectedCard.card?.rarity }}
                </span>
              </div>
              <button @click="closeDetail" class="text-text-muted hover:text-white p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Card preview + flip -->
            <div class="p-4" style="height: 300px;">
              <Card3D
                :key="'detail-' + selectedCard.id"
                :image-url="selectedCard.card?.imageUrl"
                :rarity="selectedCard.card?.rarity"
                mode="full"
                class="w-full h-full cursor-pointer"
              />
            </div>
            <p class="text-xs text-center text-text-muted -mt-2">👆 Tap kartu untuk flip</p>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-2 px-4 pb-4 text-center text-sm">
              <div class="glass-panel p-2">
                <p class="text-text-muted text-xs">Hype</p>
                <p class="font-bold">{{ selectedCard.card?.hypeScore }}</p>
              </div>
              <div class="glass-panel p-2">
                <p class="text-text-muted text-xs">Likes/dtk</p>
                <p class="font-bold">{{ selectedCard.card?.likesPerSec }}</p>
              </div>
            </div>

            <!-- Description -->
            <p class="px-4 text-sm text-text-secondary">{{ selectedCard.card?.description }}</p>

            <!-- Actions -->
            <div class="p-4 space-y-2">
              <button v-if="!selectedCard.inShowcase && !playerStore.isShowcaseFull"
                @click="handleShowcaseAction(selectedCard, 'add')" class="btn-primary w-full text-sm">
                ⭐ Tambah ke Showcase
              </button>
              <button v-if="selectedCard.inShowcase"
                @click="handleShowcaseAction(selectedCard, 'remove')" class="btn-secondary w-full text-sm">
                Keluarkan dari Showcase
              </button>

              <button v-if="selectedCard.quantity > 1 && !selectedCard.inShowcase"
                @click="showMarketForm = !showMarketForm" class="btn-secondary w-full text-sm">
                💎 Jual ke Marketplace
              </button>

              <div v-if="showMarketForm" class="space-y-2 p-3 bg-surface-card rounded-xl">
                <p class="text-xs text-text-muted">
                  Range: {{ Math.floor(selectedCard.card?.hypeScore * 0.5) }} – {{ Math.floor(selectedCard.card?.hypeScore * 5) }} coin
                </p>
                <input v-model="marketPrice" type="number"
                  class="w-full px-3 py-2 bg-surface rounded-lg text-white text-sm border border-white/10 focus:border-accent focus:outline-none"
                  :placeholder="'Harga coin'" />
                <div class="flex gap-2">
                  <button @click="handleListToMarket(selectedCard)" class="btn-primary flex-1 text-sm">List</button>
                  <button @click="showMarketForm = false" class="btn-secondary text-sm">Batal</button>
                </div>
              </div>

              <button v-if="!selectedCard.inShowcase"
                @click="handleSellToVault(selectedCard)" class="btn-secondary w-full text-sm">
                🪙 Jual ke Sistem ({{ Math.floor(selectedCard.card?.hypeScore * 0.3) }} coin)
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import Card3D from '@/components/Card3D.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();

const activeRarity = ref(null);
const showAll = ref(false);
const selectedCard = ref(null);
const showMarketForm = ref(false);
const marketPrice = ref(0);

const filters = [
  { value: null, label: 'Semua', activeClass: 'bg-white/10 text-white border-white/20' },
  { value: 'Common', label: 'Common', activeClass: 'bg-common/30 text-common-light border-common/50' },
  { value: 'Rare', label: 'Rare', activeClass: 'bg-rare/30 text-rare-light border-rare/50' },
  { value: 'Epic', label: 'Epic', activeClass: 'bg-epic/30 text-epic-light border-epic/50' },
  { value: 'Legendary', label: 'Legendary', activeClass: 'bg-legendary/30 text-legendary-light border-legendary/50' },
];

function rarityEmoji(r) {
  return { Common: '🐱', Rare: '🐈', Epic: '✨', Legendary: '👑' }[r] || '🐱';
}

// Build display cards from inventory + masterCards
const displayCards = computed(() => {
  if (showAll.value) {
    // Show all master cards, marking owned ones
    return playerStore.masterCards.map(mc => {
      const owned = playerStore.inventory.find(i => i.cardId === mc.id);
      return {
        id: mc.id,
        cardId: mc.id,
        card: mc,
        owned: !!owned,
        quantity: owned?.quantity || 0,
        inventoryItem: owned || null,
        inShowcase: owned?.inShowcase || false,
      };
    }).filter(c => !activeRarity.value || c.card?.rarity === activeRarity.value);
  }
  // Show owned only
  return playerStore.inventory
    .filter(i => !activeRarity.value || i.card?.rarity === activeRarity.value)
    .map(i => ({
      ...i,
      owned: true,
    }));
});

function openDetail(item) {
  selectedCard.value = item;
  showMarketForm.value = false;
  marketPrice.value = Math.floor(item.card?.hypeScore * 0.5);
}

function closeDetail() {
  selectedCard.value = null;
  showMarketForm.value = false;
}

async function handleShowcaseAction(item, action) {
  try {
    const res = await fetch('/api/showcase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ cardInventoryId: item.id, action }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    await playerStore.fetchInventory();
    toast.success(action === 'add' ? 'Ditambah ke showcase!' : 'Dikeluarkan dari showcase.');
    closeDetail();
  } catch (e) {
    toast.error(e.message || 'Gagal.');
  }
}

async function handleSellToVault(item) {
  try {
    const res = await fetch('/api/inventory/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ cardInventoryId: item.id, quantity: 1 }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    await playerStore.refreshAfterAction();
    toast.success(`+${data.coinsEarned} coin!`);
    closeDetail();
  } catch (e) {
    toast.error(e.message || 'Gagal menjual.');
  }
}

async function handleListToMarket(item) {
  try {
    const res = await fetch('/api/market/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ cardInventoryId: item.id, price: parseInt(marketPrice.value) }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    await playerStore.fetchInventory();
    toast.success('Kartu dipajang di market!');
    closeDetail();
  } catch (e) {
    toast.error(e.message || 'Gagal listing.');
  }
}

onMounted(async () => {
  await Promise.all([playerStore.fetchInventory(), playerStore.fetchMasterCards()]);
});
</script>

<style scoped>
.modal-enter-active { transition: all 0.25s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-content { transform: scale(0.9); }
</style>
