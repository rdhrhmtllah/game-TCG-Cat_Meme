<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <h1 class="text-xl font-bold mb-4">📒 Binder</h1>

    <!-- Filter -->
    <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
      <button
        v-for="r in ['Semua', 'Common', 'Rare', 'Epic', 'Legendary']"
        :key="r"
        @click="activeRarity = r === 'Semua' ? null : r"
        class="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
        :class="(activeRarity === r || (r === 'Semua' && !activeRarity))
          ? 'bg-purple-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
      >
        {{ r }}
      </button>
    </div>

    <!-- Inventory Grid -->
    <div v-if="filteredInventory.length === 0">
      <EmptyState
        icon="📭"
        title="Binder kosong"
        message="Kamu belum punya kartu. Yuk buka pack pertamamu!"
        cta-label="Buka Gacha"
        cta-to="/gacha"
      />
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      <div
        v-for="item in filteredInventory"
        :key="item.id"
        @click="openDetail(item)"
        class="glass-panel p-3 cursor-pointer card-hover relative"
      >
        <!-- Quantity badge -->
        <span
          v-if="item.quantity > 1"
          class="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full z-10"
        >
          x{{ item.quantity }}
        </span>

        <!-- Mini card preview with Card3D -->
        <div class="aspect-[5/7] rounded-lg mb-2 overflow-hidden">
          <Card3D
            :image-url="item.card?.imageUrl"
            :rarity="item.card?.rarity"
            mode="mini"
          />
        </div>

        <p class="text-sm font-medium truncate">{{ item.card?.name }}</p>
        <p class="text-xs" :class="rarityTextClass(item.card?.rarity)">{{ item.card?.rarity }}</p>
      </div>
    </div>

    <!-- Card Detail Modal -->
    <div
      v-if="selectedCard"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      @click.self="selectedCard = null"
    >
      <div class="glass-panel w-full sm:max-w-sm p-6 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-lg font-bold">{{ selectedCard.card?.name }}</h2>
            <span class="rarity-badge" :class="'rarity-' + selectedCard.card?.rarity?.toLowerCase()">
              {{ selectedCard.card?.rarity }}
            </span>
          </div>
          <button @click="selectedCard = null" class="text-gray-500 hover:text-white text-xl">&times;</button>
        </div>

        <p class="text-sm text-gray-400 mb-4">{{ selectedCard.card?.description }}</p>

        <div class="grid grid-cols-2 gap-3 text-sm mb-4">
          <div class="glass-panel p-2 text-center">
            <p class="text-gray-500">Hype</p>
            <p class="font-bold">{{ selectedCard.card?.hypeScore }}</p>
          </div>
          <div class="glass-panel p-2 text-center">
            <p class="text-gray-500">Likes/detik</p>
            <p class="font-bold">{{ selectedCard.card?.likesPerSec }}</p>
          </div>
          <div class="glass-panel p-2 text-center">
            <p class="text-gray-500">Dimiliki</p>
            <p class="font-bold">{{ selectedCard.quantity }}</p>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="space-y-2">
          <button
            v-if="!selectedCard.inShowcase && !playerStore.isShowcaseFull"
            @click="handleShowcaseAction(selectedCard, 'add')"
            class="btn-primary w-full"
          >
            ⭐ Tambah ke Showcase
          </button>
          <button
            v-if="selectedCard.inShowcase"
            @click="handleShowcaseAction(selectedCard, 'remove')"
            class="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            ⭐ Keluarkan dari Showcase
          </button>
          <button
            v-if="selectedCard.quantity > 1 && !selectedCard.inShowcase"
            @click="showMarketForm = true"
            class="w-full px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
          >
            💎 Jual ke Marketplace
          </button>
          <button
            v-if="selectedCard.quantity > 0 && !selectedCard.inShowcase"
            @click="handleSellToVault(selectedCard)"
            class="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            🪙 Jual ke Sistem ({{ Math.floor(selectedCard.card?.hypeScore * 0.3) }} coin)
          </button>
        </div>

        <!-- Market listing form -->
        <div v-if="showMarketForm" class="mt-4 p-3 bg-gray-800 rounded-lg">
          <p class="text-sm text-gray-400 mb-2">
            Harga: {{ Math.floor(selectedCard.card?.hypeScore * 0.5) }} – {{ Math.floor(selectedCard.card?.hypeScore * 5) }} coin
          </p>
          <input
            v-model="marketPrice"
            type="number"
            class="w-full px-3 py-2 bg-gray-700 rounded-lg text-white mb-2"
            :placeholder="'Harga dalam coin'"
          />
          <div class="flex gap-2">
            <button @click="handleListToMarket(selectedCard)" class="btn-primary flex-1">List</button>
            <button @click="showMarketForm = false" class="px-4 py-2 bg-gray-600 rounded-lg">Batal</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import EmptyState from '@/components/EmptyState.vue';
import Card3D from '@/components/Card3D.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();

const activeRarity = ref(null);
const selectedCard = ref(null);
const showMarketForm = ref(false);
const marketPrice = ref(0);

const filteredInventory = computed(() => {
  if (!activeRarity.value) return playerStore.inventory;
  return playerStore.inventory.filter(i => i.card?.rarity === activeRarity.value);
});

function rarityEmoji(rarity) {
  return { Common: '🐱', Rare: '🐈', Epic: '✨', Legendary: '👑' }[rarity] || '🐱';
}

function rarityBgClass(rarity) {
  return {
    Common: 'bg-common/20 border border-common/30',
    Rare: 'bg-rare/20 border border-rare/30',
    Epic: 'bg-epic/20 border border-epic/30',
    Legendary: 'bg-legendary/20 border border-legendary/30',
  }[rarity] || 'bg-gray-800';
}

function rarityTextClass(rarity) {
  return {
    Common: 'text-common-light',
    Rare: 'text-rare-light',
    Epic: 'text-epic-light',
    Legendary: 'text-legendary-light',
  }[rarity] || 'text-gray-400';
}

function openDetail(item) {
  selectedCard.value = item;
  showMarketForm.value = false;
  marketPrice.value = Math.floor(item.card?.hypeScore * 0.5);
}

async function handleShowcaseAction(item, action) {
  try {
    const res = await fetch('/api/showcase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ cardInventoryId: item.id, action }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    await playerStore.fetchInventory();
    selectedCard.value = null;
  } catch (e) {
    console.error('Showcase action failed:', e);
  }
}

async function handleSellToVault(item) {
  try {
    const res = await fetch('/api/inventory/sell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ cardInventoryId: item.id, quantity: 1 }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    await playerStore.refreshAfterAction();
    selectedCard.value = null;
  } catch (e) {
    console.error('Sell to vault failed:', e);
  }
}

async function handleListToMarket(item) {
  try {
    const res = await fetch('/api/market/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ cardInventoryId: item.id, price: parseInt(marketPrice.value) }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    await playerStore.fetchInventory();
    selectedCard.value = null;
    showMarketForm.value = false;
  } catch (e) {
    console.error('Market list failed:', e);
  }
}

onMounted(async () => {
  await Promise.all([
    playerStore.fetchInventory(),
    playerStore.fetchMasterCards(),
  ]);
});
</script>
