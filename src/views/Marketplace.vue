<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <h1 class="text-xl font-bold mb-4">💎 Marketplace</h1>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4">
      <button
        @click="activeTab = 'browse'"
        class="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        :class="activeTab === 'browse' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'"
      >
        Jelajahi
      </button>
      <button
        @click="activeTab = 'mine'"
        class="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        :class="activeTab === 'mine' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'"
      >
        Listing Saya
      </button>
    </div>

    <!-- Browse Listings -->
    <div v-if="activeTab === 'browse'">
      <!-- Filter -->
      <div class="flex gap-2 mb-3 overflow-x-auto pb-2">
        <button
          v-for="r in ['Semua', 'Common', 'Rare', 'Epic', 'Legendary']"
          :key="r"
          @click="activeRarity = r === 'Semua' ? null : r; page = 1"
          class="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="(activeRarity === r || (r === 'Semua' && !activeRarity))
            ? 'bg-purple-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
        >
          {{ r }}
        </button>
      </div>

      <div v-if="listings.length === 0">
        <EmptyState
          icon="💎"
          title="Belum ada listing"
          message="Tidak ada kartu yang dijual saat ini. Cek lagi nanti!"
        />
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="listing in listings"
          :key="listing.id"
          class="glass-panel p-4 flex items-center gap-4"
        >
          <div class="w-14 h-20 rounded-lg flex-shrink-0 overflow-hidden">
            <Card3D
              :image-url="listing.card?.imageUrl"
              :rarity="listing.card?.rarity"
              mode="mini"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ listing.card?.name }}</p>
            <span class="rarity-badge text-xs" :class="'rarity-' + listing.card?.rarity?.toLowerCase()">
              {{ listing.card?.rarity }}
            </span>
            <p class="text-sm text-gray-400 mt-1">🪙 {{ listing.price.toLocaleString('id-ID') }} coin</p>
          </div>
          <button
            @click="handleBuy(listing)"
            :disabled="playerStore.coins < listing.price || buyingId === listing.id"
            class="btn-primary text-sm"
          >
            {{ buyingId === listing.id ? '...' : 'Beli' }}
          </button>
        </div>

        <!-- Pagination -->
        <div class="flex justify-center gap-2 mt-4">
          <button
            @click="page--"
            :disabled="page <= 1"
            class="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-50"
          >
            ←
          </button>
          <span class="px-3 py-1 text-sm text-gray-400">{{ page }}</span>
          <button
            @click="page++"
            :disabled="listings.length < limit"
            class="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>
    </div>

    <!-- My Listings -->
    <div v-if="activeTab === 'mine'">
      <div v-if="myListings.length === 0">
        <EmptyState
          icon="💎"
          title="Belum ada listing"
          message="Kamu belum menjual kartu. Jual kartu duplikat dari Binder!"
        />
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="listing in myListings"
          :key="listing.id"
          class="glass-panel p-4 flex items-center gap-4"
        >
          <div class="w-14 h-20 rounded-lg flex-shrink-0 overflow-hidden">
            <Card3D
              :image-url="listing.card?.imageUrl"
              :rarity="listing.card?.rarity"
              mode="mini"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ listing.card?.name }}</p>
            <p class="text-sm text-gray-400">🪙 {{ listing.price.toLocaleString('id-ID') }} coin</p>
          </div>
          <button
            @click="handleCancel(listing)"
            class="px-3 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import EmptyState from '@/components/EmptyState.vue';
import Card3D from '@/components/Card3D.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();

const activeTab = ref('browse');
const activeRarity = ref(null);
const listings = ref([]);
const myListings = ref([]);
const page = ref(1);
const limit = 20;
const buyingId = ref(null);

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

async function fetchListings() {
  const params = new URLSearchParams({ page: page.value, limit });
  if (activeRarity.value) params.set('rarity', activeRarity.value);
  const res = await fetch(`/api/market/listings?${params}`);
  const data = await res.json();
  if (res.ok) listings.value = data.listings;
}

async function fetchMyListings() {
  // Fetch all listings and filter for current user's active ones
  const res = await fetch('/api/market/listings?limit=50');
  const data = await res.json();
  if (res.ok && authStore.user) {
    myListings.value = data.listings.filter(
      l => l.sellerId === authStore.user.id && l.status === 'active'
    );
  }
}

async function handleBuy(listing) {
  buyingId.value = listing.id;
  try {
    const res = await fetch('/api/market/buy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ listingId: listing.id }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    await playerStore.refreshAfterAction();
    await fetchListings();
  } catch (e) {
    // Will be handled by toast in future phase
    console.error('Buy failed:', e);
  } finally {
    buyingId.value = null;
  }
}

async function handleCancel(listing) {
  try {
    const res = await fetch('/api/market/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ listingId: listing.id }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    await playerStore.fetchInventory();
    await fetchMyListings();
  } catch (e) {
    console.error('Cancel failed:', e);
  }
}

watch([page, activeRarity], () => {
  fetchListings();
});

onMounted(async () => {
  await Promise.all([
    fetchListings(),
    fetchMyListings(),
  ]);
});
</script>
