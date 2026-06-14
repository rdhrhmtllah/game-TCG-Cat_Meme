<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <h1 class="text-xl font-bold mb-4">💎 Marketplace</h1>

    <!-- Tabs -->
    <div class="flex bg-surface-card rounded-xl p-1 gap-1 mb-4">
      <button @click="activeTab = 'browse'" class="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'browse' ? 'bg-accent text-white shadow-lg' : 'text-muted hover:text-secondary'">
        Jelajahi
      </button>
      <button @click="activeTab = 'mine'" class="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'mine' ? 'bg-accent text-white shadow-lg' : 'text-muted hover:text-secondary'">
        Listing Saya
      </button>
    </div>

    <!-- Browse -->
    <template v-if="activeTab === 'browse'">
      <div class="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button v-for="r in filters" :key="r.value" @click="activeRarity = r.value; page = 1"
          class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border"
          :class="(activeRarity === r.value) ? r.activeClass : 'border-white/10 text-muted hover:border-white/20 hover:text-secondary'">
          {{ r.label }}
        </button>
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-3">
        <LoadingSkeleton type="rect" :count="3" height="80px" />
      </div>

      <div v-else-if="listings.length === 0" class="glass-panel p-8 text-center">
        <p class="text-4xl mb-3">💎</p>
        <p class="text-secondary font-medium">Belum ada listing.</p>
        <p class="text-muted text-sm">Jadi yang pertama jual kartu!</p>
      </div>

      <div v-else class="space-y-3">
        <div v-for="listing in listings" :key="listing.id"
          class="glass-panel p-3 flex items-center gap-4 card-hover">
          <div class="w-16 h-22 rounded-lg overflow-hidden flex-shrink-0 card-frame"
            :class="'card-frame-' + (listing.card?.rarity || 'Common').toLowerCase()">
            <img v-if="listing.card?.imageUrl" :src="listing.card.imageUrl" class="w-full h-full object-cover" />
            <span v-else class="w-full h-full flex items-center justify-center text-2xl">
              {{ {Common:'🐱',Rare:'🐈',Epic:'✨',Legendary:'👑'}[listing.card?.rarity] || '🐱' }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ listing.card?.name }}</p>
            <span class="rarity-badge text-[10px]" :class="'rarity-' + (listing.card?.rarity || '').toLowerCase()">
              {{ listing.card?.rarity }}
            </span>
            <p class="text-sm text-muted mt-0.5">🪙 {{ listing.price.toLocaleString('id-ID') }}</p>
            <p class="text-xs text-muted">Penjual: {{ listing.seller?.username }}</p>
          </div>
          <button @click="handleBuy(listing)" :disabled="playerStore.coins < listing.price || buyingId === listing.id"
            class="btn-primary text-sm px-4">
            {{ buyingId === listing.id ? '...' : 'Beli' }}
          </button>
        </div>

        <!-- Pagination -->
        <div class="flex justify-center gap-3 mt-4">
          <button @click="page--" :disabled="page <= 1" class="btn-secondary text-sm px-3 py-1.5">←</button>
          <span class="py-1.5 text-sm text-muted">Hal {{ page }}</span>
          <button @click="page++" :disabled="listings.length < limit" class="btn-secondary text-sm px-3 py-1.5">→</button>
        </div>
      </div>
    </template>

    <!-- My Listings -->
    <template v-if="activeTab === 'mine'">
      <div v-if="myListings.length === 0" class="glass-panel p-8 text-center">
        <p class="text-4xl mb-3">📋</p>
        <p class="text-secondary font-medium">Belum ada listing.</p>
        <p class="text-muted text-sm">Jual kartu duplikat dari Binder!</p>
      </div>

      <div v-else class="space-y-3">
        <div v-for="listing in myListings" :key="listing.id"
          class="glass-panel p-3 flex items-center gap-4">
          <div class="w-16 h-22 rounded-lg overflow-hidden flex-shrink-0 card-frame"
            :class="'card-frame-' + (listing.card?.rarity || 'Common').toLowerCase()">
            <img v-if="listing.card?.imageUrl" :src="listing.card.imageUrl" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ listing.card?.name }}</p>
            <p class="text-sm text-muted">🪙 {{ listing.price.toLocaleString('id-ID') }}</p>
          </div>
          <button @click="handleCancel(listing)" class="btn-danger text-sm px-4">Batal</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import LoadingSkeleton from '@/components/LoadingSkeleton.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();

const activeTab = ref('browse');
const activeRarity = ref(null);
const listings = ref([]);
const myListings = ref([]);
const page = ref(1);
const limit = 20;
const buyingId = ref(null);
const loading = ref(false);

const filters = [
  { value: null, label: 'Semua', activeClass: 'bg-white/10 text-white border-white/20' },
  { value: 'Common', label: 'Common', activeClass: 'bg-common/30 text-common-light border-common/50' },
  { value: 'Rare', label: 'Rare', activeClass: 'bg-rare/30 text-rare-light border-rare/50' },
  { value: 'Epic', label: 'Epic', activeClass: 'bg-epic/30 text-epic-light border-epic/50' },
  { value: 'Legendary', label: 'Legendary', activeClass: 'bg-legendary/30 text-legendary-light border-legendary/50' },
];

async function fetchListings() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: page.value, limit });
    if (activeRarity.value) params.set('rarity', activeRarity.value);
    const res = await fetch(`/api/market/listings?${params}`);
    const data = await res.json();
    if (res.ok) listings.value = data.listings;
  } catch (e) { /* handled by skeleton */ }
  finally { loading.value = false; }
}

async function fetchMyListings() {
  const res = await fetch('/api/market/listings?limit=50');
  const data = await res.json();
  if (res.ok) {
    myListings.value = data.listings.filter(
      l => l.sellerId === authStore.user?.id && l.status === 'active'
    );
  }
}

async function handleBuy(listing) {
  buyingId.value = listing.id;
  try {
    const res = await fetch('/api/market/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ listingId: listing.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === 'MARKET_CONFLICT') {
        toast.info('Kartu sudah dibeli orang lain! Refresh...');
        await fetchListings();
        return;
      }
      throw data;
    }
    toast.success(`Kartu dibeli! -${data.pricePaid} coin`);
    await playerStore.refreshAfterAction();
    await fetchListings();
  } catch (e) {
    toast.error(e.message || 'Gagal membeli.');
  } finally {
    buyingId.value = null;
  }
}

async function handleCancel(listing) {
  try {
    const res = await fetch('/api/market/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ listingId: listing.id }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    toast.success('Listing dibatalkan, kartu kembali.');
    await playerStore.fetchInventory();
    await fetchMyListings();
  } catch (e) {
    toast.error(e.message || 'Gagal membatalkan.');
  }
}

watch([page, activeRarity], () => fetchListings());
watch(activeTab, (tab) => { if (tab === 'mine') fetchMyListings(); });

onMounted(async () => {
  await fetchListings();
  await fetchMyListings();
});
</script>
