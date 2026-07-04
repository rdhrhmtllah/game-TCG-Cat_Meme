<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-xl font-display font-bold flex items-center gap-2">
          <span class="text-2xl">📒</span> Binder
        </h1>
        <p class="text-muted text-xs mt-0.5">{{ filteredInventory.length }} kartu ditemukan</p>
      </div>
    </div>

    <!-- View Toggle -->
    <div class="flex mb-4 glass-panel p-1 gap-1">
      <button @click="showAll = false" class="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold transition-all"
        :class="!showAll ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-secondary'">
        Milikku
      </button>
      <button @click="showAll = true" class="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold transition-all"
        :class="showAll ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-secondary'">
        Semua Kartu
      </button>
    </div>

    <!-- Filter Chips -->
    <div class="flex gap-2 mb-5 touch-scroll-x pb-1">
      <button v-for="r in filters" :key="r.value" @click="activeRarity = r.value"
        class="px-4 py-2 rounded-full text-xs font-display font-semibold whitespace-nowrap transition-all border"
        :class="(activeRarity === r.value)
          ? r.activeClass
          : 'border-white/8 text-muted hover:border-white/15 hover:text-secondary'">
        {{ r.label }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="displayCards.length === 0" class="animate-fade-in">
      <div class="glass-panel p-10 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full glass-panel flex items-center justify-center">
          <span class="text-3xl">{{ showAll ? '🎴' : '📭' }}</span>
        </div>
        <p class="text-primary font-display font-semibold mb-1">
          {{ showAll ? 'Belum ada kartu dalam game.' : 'Kamu belum punya kartu.' }}
        </p>
        <p class="text-muted text-sm mb-5">
          {{ showAll ? 'Admin akan menambahkan kartu segera!' : 'Yuk buka pack pertamamu!' }}
        </p>
        <router-link v-if="!showAll" to="/gacha" class="btn-primary text-sm font-display">
          🎴 Buka Gacha
        </router-link>
      </div>
    </div>

    <!-- Card Grid -->
    <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      <div v-for="(item, idx) in displayCards" :key="item.id || item.cardId"
        class="relative cursor-pointer card-hover group animate-fade-in flex flex-col"
        :class="[
          item.owned ? 'opacity-100' : 'opacity-30 grayscale',
        ]"
        :style="{ animationDelay: Math.min(idx * 0.03, 0.3) + 's' }"
        @click="item.owned ? openDetail(item.inventoryItem || item) : null"
      >
        <!-- Card Frame Container -->
        <div class="aspect-[5/7] rounded-xl card-frame relative m-0.5 p-0.5"
          :class="'card-frame-' + (item.card?.rarity || 'Common').toLowerCase()">
          <!-- Card Image Wrapper -->
          <div class="w-full h-full rounded-lg overflow-hidden bg-surface-card relative">
            <img v-if="item.card?.imageUrl" :src="item.card.imageUrl" :alt="item.card.name"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            <div v-else class="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-b from-surface-card to-surface">
              {{ rarityEmoji(item.card?.rarity) }}
            </div>
            
            <!-- Holographic overlay on hover -->
            <div class="holo-overlay" />
          </div>

          <!-- Quantity badge -->
          <span v-if="item.quantity > 1"
            class="absolute -top-1 -right-1 bg-gradient-to-br from-accent to-accent-glow text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center z-10 shadow-lg shadow-accent/30 font-display">
            {{ item.quantity }}
          </span>

          <!-- Showcase star -->
          <span v-if="item.inventoryItem?.inShowcase"
            class="absolute top-1 left-1 text-legendary text-xs z-10 drop-shadow-lg animate-pulse-slow">⭐</span>
        </div>

        <!-- Metadata Below Card Frame -->
        <div class="mt-1 text-center px-1">
          <p class="text-[10px] font-display font-semibold text-white truncate leading-tight">
            {{ item.card?.name }}
          </p>
          <span class="rarity-badge text-[7px] py-0.5 px-1.5 mt-1 mx-auto inline-flex"
            :class="'rarity-' + (item.card?.rarity || 'Common').toLowerCase()">
            {{ item.card?.rarity }}
          </span>
        </div>
      </div>
    </div>

    <!-- ===== CARD DETAIL MODAL ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedCard" class="modal-overlay flex items-center justify-center p-4 animate-fade-in" @click.self="handleBackdropClick">
          <div class="modal-content w-full max-w-sm max-h-[92vh] transition-all duration-300"
            :class="[
              isCardZoomed ? 'bg-transparent border-transparent shadow-none overflow-visible' : 'glass-panel-strong overflow-y-auto'
            ]">
            <!-- Header -->
            <div class="flex items-start justify-between p-5 pb-0 transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }">
              <div>
                <h2 class="text-lg font-display font-bold">{{ selectedCard.card?.name }}</h2>
                <span class="rarity-badge mt-1" :class="'rarity-' + (selectedCard.card?.rarity || '').toLowerCase()">
                  {{ selectedCard.card?.rarity }}
                </span>
              </div>
              <button @click="closeDetail" class="text-muted hover:text-white p-1.5 glass-panel rounded-lg transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <!-- Card preview + flip -->
            <div class="p-4 relative" style="height: 320px;">
              <!-- Spotlight glow (hide during zoom for clean focus) -->
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
                :class="{ 'opacity-0': isCardZoomed }">
                <div class="w-48 h-60 rounded-3xl blur-2xl opacity-30"
                  :style="{ background: `radial-gradient(ellipse, ${detailGlowColor}, transparent 70%)` }"></div>
              </div>
              <Card3D
                :key="'detail-' + selectedCard.id"
                :image-url="selectedCard.card?.imageUrl"
                :rarity="selectedCard.card?.rarity"
                :name="selectedCard.card?.name"
                :description="selectedCard.card?.description"
                :hype-score="selectedCard.card?.hypeScore"
                :likes-per-sec="selectedCard.card?.likesPerSec"
                :element="selectedCard.card?.element"
                :foil-style="selectedCard.card?.foilStyle"
                :img-zoom="selectedCard.card?.imgZoom"
                :img-offset-x="selectedCard.card?.imgOffsetX"
                :img-offset-y="selectedCard.card?.imgOffsetY"
                mode="full"
                :allow-zoom="true"
                :focused="isCardZoomed"
                @zoom-change="isCardZoomed = $event"
                @click="isCardZoomed = true"
                class="w-full h-full cursor-pointer relative z-10"
              />
            </div>
            <p class="text-xs text-center text-muted -mt-1 mb-2 transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }">👆 Tap kartu untuk flip</p>

            <!-- Stats Grid -->
            <div class="grid grid-cols-3 gap-2 px-5 pb-3 text-center transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }">
              <div class="glass-panel p-2.5 rounded-xl">
                <p class="text-muted text-[10px] font-display uppercase tracking-wider">Hype</p>
                <p class="font-display font-bold text-sm mt-0.5">{{ selectedCard.card?.hypeScore }}</p>
              </div>
              <div class="glass-panel p-2.5 rounded-xl">
                <p class="text-muted text-[10px] font-display uppercase tracking-wider">Likes/dtk</p>
                <p class="font-display font-bold text-sm mt-0.5">{{ selectedCard.card?.likesPerSec }}</p>
              </div>
              <div class="glass-panel p-2.5 rounded-xl">
                <p class="text-muted text-[10px] font-display uppercase tracking-wider">Qty</p>
                <p class="font-display font-bold text-sm mt-0.5">×{{ selectedCard.quantity }}</p>
              </div>
            </div>

            <!-- Description -->
            <p class="px-5 text-sm text-secondary leading-relaxed transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }">{{ selectedCard.card?.description }}</p>

            <!-- Actions -->
            <div class="p-5 space-y-2.5 transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }">
              <button v-if="!selectedCard.inShowcase && !playerStore.isShowcaseFull"
                @click="handleShowcaseAction(selectedCard, 'add')" class="btn-primary w-full text-sm font-display">
                ⭐ Tambah ke Showcase
              </button>
              <button v-if="selectedCard.inShowcase"
                @click="handleShowcaseAction(selectedCard, 'remove')" class="btn-secondary w-full text-sm font-display">
                Keluarkan dari Showcase
              </button>

              <button v-if="selectedCard.quantity > 1 && !selectedCard.inShowcase"
                @click="showMarketForm = !showMarketForm" class="btn-secondary w-full text-sm font-display">
                💎 Jual ke Marketplace
              </button>

              <div v-if="showMarketForm" class="space-y-2 p-4 glass-panel rounded-xl">
                <p class="text-xs text-muted font-display">
                  Range harga: {{ Math.floor(selectedCard.card?.hypeScore * 0.5) }} – {{ Math.floor(selectedCard.card?.hypeScore * 5) }} coin
                </p>
                <input v-model="marketPrice" type="number"
                  class="input-premium"
                  :placeholder="'Harga coin'" />
                <div class="flex gap-2">
                  <button @click="handleListToMarket(selectedCard)" class="btn-primary flex-1 text-sm font-display">List</button>
                  <button @click="showMarketForm = false" class="btn-secondary text-sm font-display">Batal</button>
                </div>
              </div>

              <button v-if="!selectedCard.inShowcase"
                @click="handleSellToVault(selectedCard)" class="btn-secondary w-full text-sm font-display">
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
const isCardZoomed = ref(false);

const filters = [
  { value: null, label: 'Semua', activeClass: 'bg-white/10 text-white border-white/15 shadow-sm' },
  { value: 'Common', label: 'Common', activeClass: 'bg-common/20 text-common-light border-common/30 shadow-sm shadow-common/10' },
  { value: 'Rare', label: 'Rare', activeClass: 'bg-rare/20 text-rare-light border-rare/30 shadow-sm shadow-rare/10' },
  { value: 'Epic', label: 'Epic', activeClass: 'bg-epic/20 text-epic-light border-epic/30 shadow-sm shadow-epic/10' },
  { value: 'Legendary', label: 'Legendary', activeClass: 'bg-legendary/20 text-legendary-light border-legendary/30 shadow-sm shadow-legendary/10' },
];

function rarityEmoji(r) {
  return { Common: '🐱', Rare: '🐈', Epic: '✨', Legendary: '👑' }[r] || '🐱';
}

const filteredInventory = computed(() => {
  return playerStore.inventory.filter(i => !activeRarity.value || i.card?.rarity === activeRarity.value);
});

const displayCards = computed(() => {
  if (showAll.value) {
    return playerStore.masterCards.map(mc => {
      const owned = playerStore.inventory.find(i => i.cardId === mc.id);
      return {
        id: mc.id, cardId: mc.id, card: mc,
        owned: !!owned, quantity: owned?.quantity || 0,
        inventoryItem: owned || null, inShowcase: owned?.inShowcase || false,
      };
    }).filter(c => !activeRarity.value || c.card?.rarity === activeRarity.value);
  }
  return filteredInventory.value.map(i => ({ ...i, owned: true }));
});

const detailGlowColor = computed(() => {
  const r = selectedCard.value?.card?.rarity;
  return { Common: 'rgba(148, 163, 184, 0.2)', Rare: 'rgba(56, 189, 248, 0.25)', Epic: 'rgba(168, 85, 247, 0.3)', Legendary: 'rgba(245, 158, 11, 0.35)' }[r] || 'rgba(124, 58, 237, 0.15)';
});

function openDetail(item) {
  selectedCard.value = item;
  showMarketForm.value = false;
  marketPrice.value = Math.floor(item.card?.hypeScore * 0.5);
}

function closeDetail() {
  selectedCard.value = null;
  showMarketForm.value = false;
  isCardZoomed.value = false;
}

function handleBackdropClick() {
  if (isCardZoomed.value) {
    isCardZoomed.value = false;
  } else {
    closeDetail();
  }
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
.modal-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-content { transform: scale(0.9) translateY(20px); }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
