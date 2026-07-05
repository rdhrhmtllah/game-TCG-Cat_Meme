<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="premium-header mb-5 flex justify-between items-center w-full">
      <div class="flex items-center gap-3">
        <div class="premium-header-icon text-accent">
          <IconBase name="market" :size="20" />
        </div>
        <h1 class="premium-header-title">Marketplace</h1>
      </div>
      
      <!-- Coin Indicator -->
      <div class="flex items-center gap-1.5 px-3 py-1.5 glass-panel rounded-full shadow-inner select-none font-display" style="background: rgba(255,255,255,0.02);">
        <span class="text-[11px] text-muted font-semibold">Saldo:</span>
        <span class="text-xs font-black text-accent-glow flex items-center gap-1">
          🪙 {{ playerStore.coins.toLocaleString('id-ID') }}
        </span>
      </div>
    </div>

    <!-- Tabs — Glass -->
    <div class="glass-tabs mb-5">
      <button @click="activeTab = 'browse'"
        class="glass-tab" :class="{ 'glass-tab-active': activeTab === 'browse' }">
        Jelajahi
      </button>
      <button @click="activeTab = 'mine'"
        class="glass-tab" :class="{ 'glass-tab-active': activeTab === 'mine' }">
        Listing Saya
      </button>
    </div>

    <!-- Browse -->
    <template v-if="activeTab === 'browse'">
      <!-- Toolbar: search + sort -->
      <div class="flex gap-2 mb-3">
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>
            </svg>
          </span>
          <input v-model="searchQuery" type="text" placeholder="Cari nama kartu..."
            class="w-full glass-panel rounded-xl pl-9 pr-3 py-2.5 text-sm font-display text-white placeholder:text-muted/60 focus:outline-none focus:border-accent/40 transition-colors"
            style="background: rgba(255,255,255,0.02);" />
        </div>
        <div class="relative">
          <select v-model="activeSort" @change="page = 1"
            class="appearance-none glass-panel rounded-xl pl-3.5 pr-8 py-2.5 text-sm font-display text-white cursor-pointer focus:outline-none focus:border-accent/40"
            style="background: rgba(255,255,255,0.02);">
            <option v-for="s in sortOptions" :key="s.value" :value="s.value" style="background:#0F172A">{{ s.label }}</option>
          </select>
          <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
      </div>

      <!-- Filter chips -->
      <div class="flex gap-2 mb-4 touch-scroll-x pb-1">
        <button v-for="r in filters" :key="r.value" @click="activeRarity = r.value; page = 1"
          class="glass-chip"
          :class="(activeRarity === r.value) ? r.activeClass : ''">
          {{ r.label }}
        </button>
      </div>

      <!-- Result count -->
      <div v-if="!loading && listings.length" class="flex items-center justify-between mb-3 px-0.5">
        <p class="text-xs text-muted font-display">{{ total }} kartu dijual</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-2 gap-3">
        <div v-for="i in 4" :key="'sk'+i" class="aspect-[5/7] rounded-xl glass-panel animate-pulse"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="listings.length === 0" class="glass-panel p-10 text-center animate-fade-in mt-2">
        <div class="w-20 h-20 mx-auto mb-4 rounded-full glass-panel flex items-center justify-center" style="box-shadow: 0 0 30px rgba(124, 58, 237, 0.15);">
          <span class="text-4xl">{{ searchQuery ? '🔍' : '💎' }}</span>
        </div>
        <p class="text-primary font-display font-semibold mb-1">
          {{ searchQuery ? 'Tidak ada kartu cocok.' : 'Belum ada listing.' }}
        </p>
        <p class="text-muted text-sm">
          {{ searchQuery ? 'Coba kata kunci lain.' : 'Jadi yang pertama jual kartu dari Binder!' }}
        </p>
      </div>

      <!-- Gallery grid -->
      <div v-else class="grid grid-cols-2 gap-3">
        <div v-for="(listing, idx) in listings" :key="listing.id"
          class="market-tile group animate-fade-in"
          :style="{ animationDelay: Math.min(idx * 0.04, 0.3) + 's' }"
          @click="openDetail(listing)">

          <!-- Card art dengan glow rarity -->
          <div class="market-tile-art" :class="'tile-glow-' + (listing.card?.rarity || 'common').toLowerCase()">
            <Card2D
              :image-url="listing.card?.imageUrl"
              :rarity="listing.card?.rarity"
              :name="listing.card?.name"
              :description="listing.card?.description"
              :hype-score="listing.card?.hypeScore"
              :likes-per-sec="listing.card?.likesPerSec"
              :element="listing.card?.element"
              :foil-style="listing.card?.foilStyle"
              :img-zoom="listing.card?.imgZoom"
              :img-offset-x="listing.card?.imgOffsetX"
              :img-offset-y="listing.card?.imgOffsetY"
              :drop-rate="playerStore.dropRateOf(listing.card?.id)"
              :owned="true"
            />
            <!-- Rarity badge -->
            <span class="absolute top-1.5 left-1.5 rarity-badge text-[8px] font-black z-10"
              :class="'rarity-' + (listing.card?.rarity || '').toLowerCase()">
              {{ listing.card?.rarity }}
            </span>
            <!-- Zoom hint on hover -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
              <span class="text-xs font-display text-white/90 px-2 py-1 rounded-full glass-panel">👁 Lihat detail</span>
            </div>
          </div>

          <!-- Info + buy -->
          <div class="px-1 pt-2">
            <p class="font-display font-semibold text-[13px] text-white truncate leading-tight">{{ listing.card?.name }}</p>
            <p class="text-[10px] text-muted truncate mb-1.5">oleh {{ listing.seller?.username }}</p>
            <div class="flex items-center justify-between gap-1.5">
              <span class="font-display font-black text-sm flex items-center gap-1 whitespace-nowrap"
                :class="playerStore.coins < listing.price ? 'text-red-400/80' : 'text-amber-400'">
                🪙 {{ listing.price.toLocaleString('id-ID') }}
              </span>
              <button @click.stop="handleBuy(listing)"
                :disabled="playerStore.coins < listing.price || buyingId === listing.id"
                class="btn-primary text-xs px-3.5 py-1.5 font-display font-bold flex-shrink-0">
                {{ buyingId === listing.id ? '...' : 'Beli' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="listings.length && totalPages > 1" class="flex justify-center items-center gap-3 mt-6">
        <button @click="page--" :disabled="page <= 1" class="btn-secondary text-sm px-3.5 py-2 font-display">←</button>
        <span class="py-2 text-sm text-muted font-display">Hal {{ page }} / {{ totalPages }}</span>
        <button @click="page++" :disabled="page >= totalPages" class="btn-secondary text-sm px-3.5 py-2 font-display">→</button>
      </div>
    </template>

    <!-- My Listings -->
    <template v-if="activeTab === 'mine'">
      <div v-if="myListings.length === 0" class="glass-panel p-10 text-center animate-fade-in">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full glass-panel flex items-center justify-center" style="box-shadow: 0 0 25px rgba(124, 58, 237, 0.1);">
          <span class="text-3xl">📋</span>
        </div>
        <p class="text-primary font-display font-semibold mb-1">Belum ada listing.</p>
        <p class="text-muted text-sm">Jual kartu duplikat dari Binder!</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <div v-for="listing in myListings" :key="listing.id"
          class="market-tile group animate-fade-in" @click="openDetail(listing)">
          <div class="market-tile-art" :class="'tile-glow-' + (listing.card?.rarity || 'common').toLowerCase()">
            <Card2D
              :image-url="listing.card?.imageUrl"
              :rarity="listing.card?.rarity"
              :name="listing.card?.name"
              :description="listing.card?.description"
              :hype-score="listing.card?.hypeScore"
              :likes-per-sec="listing.card?.likesPerSec"
              :element="listing.card?.element"
              :foil-style="listing.card?.foilStyle"
              :img-zoom="listing.card?.imgZoom"
              :img-offset-x="listing.card?.imgOffsetX"
              :img-offset-y="listing.card?.imgOffsetY"
              :drop-rate="playerStore.dropRateOf(listing.card?.id)"
              :owned="true"
            />
            <span class="absolute top-1.5 left-1.5 rarity-badge text-[8px] font-black z-10"
              :class="'rarity-' + (listing.card?.rarity || '').toLowerCase()">
              {{ listing.card?.rarity }}
            </span>
          </div>
          <div class="px-1 pt-2">
            <p class="font-display font-semibold text-[13px] text-white truncate leading-tight">{{ listing.card?.name }}</p>
            <div class="flex items-center justify-between gap-1.5 mt-1.5">
              <span class="font-display font-black text-sm text-amber-400 flex items-center gap-1 whitespace-nowrap">
                🪙 {{ listing.price.toLocaleString('id-ID') }}
              </span>
              <button @click.stop="handleCancel(listing)" class="btn-danger text-xs px-3 py-1.5 font-display flex-shrink-0">Batal</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== CARD DETAIL MODAL ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedCard" class="modal-overlay flex items-center justify-center p-4 animate-fade-in" @click.self="selectedCard = null">
          
          <!-- Zoomed HUD (overlay layout when card is zoomed) -->
          <Transition name="fade-slide">
            <div v-if="isCardZoomed" class="fixed inset-0 z-40 flex flex-col justify-between p-6 pointer-events-none">
              <!-- Top bar: Close Button (clickable) -->
              <div class="flex justify-end w-full pointer-events-auto">
                <button @click.stop="isCardZoomed = false" class="text-white hover:text-accent p-2.5 glass-panel rounded-full transition-colors shadow-lg pointer-events-auto" style="background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.1);">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              
              <!-- Bottom stats HUD -->
              <div class="w-full max-w-sm mx-auto p-4 glass-panel rounded-2xl shadow-2xl flex flex-col gap-2 mt-auto" style="background: rgba(15,23,42,0.9); border: 1px solid rgba(255,255,255,0.08);">
                <div class="flex justify-between items-center">
                  <h3 class="font-display font-black text-white text-base tracking-tight truncate">{{ selectedCard.name }}</h3>
                  <span class="rarity-badge text-[8px] uppercase tracking-wider font-display font-black py-0.5 px-2 rounded text-black" :class="'rarity-bg-' + selectedCard.rarity.toLowerCase()">
                    {{ selectedCard.rarity }}
                  </span>
                </div>
                <div class="h-px bg-white/5 my-1"></div>
                <div class="flex justify-between items-center gap-2">
                  <div class="flex items-center gap-1 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                    <span class="text-[10px] text-muted">HYPE</span>
                    <span class="text-xs font-black text-accent-soft">{{ selectedCard.hypeScore }}</span>
                  </div>
                  <div class="flex items-center gap-1 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                    <span class="text-[10px] text-muted">YIELD</span>
                    <span class="text-xs font-black text-amber-400">👍 {{ selectedCard.likesPerSec }}/s</span>
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Detail Card Container -->
          <div class="glass-panel w-full max-w-sm rounded-2xl overflow-y-auto scrollbar-thin relative animate-scale-up"
            :class="{ 'opacity-0 scale-95 pointer-events-none': isCardZoomed }"
            style="max-height: 90vh; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255, 255, 255, 0.08);">
            
            <!-- Close Button (Absolute) -->
            <button @click="selectedCard = null" class="absolute top-4 right-4 text-muted hover:text-white transition-colors z-20 p-1.5 glass-panel rounded-full" style="background: rgba(255,255,255,0.02);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <!-- Modal Body Content -->
            <div class="py-5">
              
              <!-- Card preview + flip -->
              <div class="p-4 relative transition-all duration-300 origin-center flex items-center justify-center"
                :style="{ height: isCardZoomed ? '420px' : '320px' }">
                <Card3D
                  :key="'detail-' + selectedCard.id"
                  :image-url="selectedCard.imageUrl"
                  :rarity="selectedCard.rarity"
                  :name="selectedCard.name"
                  :description="selectedCard.description"
                  :hype-score="selectedCard.hypeScore"
                  :likes-per-sec="selectedCard.likesPerSec"
                  :element="selectedCard.element"
                  :foil-style="selectedCard.foilStyle"
                  :img-zoom="selectedCard.imgZoom"
                  :img-offset-x="selectedCard.imgOffsetX"
                  :img-offset-y="selectedCard.imgOffsetY"
                  :drop-rate="playerStore.dropRateOf(selectedCard.id)"
                  mode="full"
                  hd
                  :allow-zoom="true"
                  :focused="isCardZoomed"
                  @zoom-change="isCardZoomed = $event"
                  @click="isCardZoomed = true"
                  class="w-full h-full cursor-pointer relative z-10"
                />
              </div>
              <p class="text-xs text-center text-muted -mt-1 mb-3">👆 Tap kartu untuk flip</p>

              <!-- Stats Grid -->
              <div class="grid grid-cols-2 gap-2 px-5 pb-1 text-center">
                <div class="glass-panel p-2.5 rounded-xl">
                  <p class="text-muted text-[10px] font-display uppercase tracking-wider">Hype</p>
                  <p class="font-display font-bold text-sm mt-0.5">{{ selectedCard.hypeScore }}</p>
                </div>
                <div class="glass-panel p-2.5 rounded-xl">
                  <p class="text-muted text-[10px] font-display uppercase tracking-wider">Likes/dtk</p>
                  <p class="font-display font-bold text-sm mt-0.5">{{ selectedCard.likesPerSec }}</p>
                </div>
              </div>

              <!-- Peluang drop -->
              <div v-if="playerStore.dropRateOf(selectedCard.id) !== null"
                class="px-5 mt-2 flex items-center justify-between text-xs font-display">
                <span class="text-muted flex items-center gap-1">🎲 Peluang Drop</span>
                <span class="font-bold" :class="'text-' + (selectedCard.rarity || 'common').toLowerCase() + '-light'">
                  {{ formatRate(playerStore.dropRateOf(selectedCard.id)) }}
                </span>
              </div>

              <!-- Separator -->
              <div class="h-px bg-white/5 mx-5 my-3.5"></div>

              <!-- Description -->
              <p class="px-5 text-sm text-secondary leading-relaxed">{{ selectedCard.description }}</p>

              <!-- Listing Info Details (Price and Seller) -->
              <div class="mx-5 mt-4 p-4 glass-panel rounded-xl border border-white/5 bg-white/[0.01]">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xs text-muted">Penjual:</span>
                  <span class="text-xs font-display font-extrabold text-accent">{{ selectedListing?.seller?.username }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-muted">Harga:</span>
                  <span class="text-base font-display font-black text-amber-400 flex items-center gap-1">🪙 {{ selectedListing?.price.toLocaleString('id-ID') }}</span>
                </div>
              </div>

              <!-- Action: Buy or Cancel -->
              <div class="p-5">
                <button v-if="selectedListing?.sellerId === authStore.user?.id"
                  @click="handleCancelListingFromModal(selectedListing)" 
                  class="btn-danger w-full text-sm font-display py-3 rounded-xl">
                  ❌ Batalkan Listing Saya
                </button>
                <button v-else
                  @click="handleBuyFromModal(selectedListing)"
                  :disabled="playerStore.coins < selectedListing?.price || buyingId === selectedListing?.id"
                  class="btn-primary w-full text-sm font-display flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-glow hover:brightness-110 shadow-glow-sm hover:shadow-glow transition-all">
                  🛒 {{ buyingId === selectedListing?.id ? 'Memproses...' : 'Beli Kartu Ini' }}
                </button>

                <!-- Download kartu jadi JPG (HD) -->
                <button @click="handleDownloadCard(selectedCard)" :disabled="downloading"
                  class="btn-secondary w-full text-sm font-display flex items-center justify-center gap-2 py-3 rounded-xl mt-3">
                  {{ downloading ? '⏳ Menyiapkan gambar HD...' : '⬇️ Download Kartu (JPG HD)' }}
                </button>
              </div>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import { downloadCardImage } from '@/utils/cardRenderer.js';
import IconBase from '@/components/IconBase.vue';
import Card2D from '@/components/Card2D.vue';
import Card3D from '@/components/Card3D.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();

const selectedCard = ref(null);
const selectedListing = ref(null);
const downloading = ref(false);

async function handleDownloadCard(card) {
  if (!card || downloading.value) return;
  downloading.value = true;
  try {
    const res = await downloadCardImage({
      name: card.name, description: card.description, rarity: card.rarity,
      hypeScore: card.hypeScore, likesPerSec: card.likesPerSec, element: card.element,
      foilStyle: card.foilStyle, imageUrl: card.imageUrl,
      imgZoom: card.imgZoom, imgOffsetX: card.imgOffsetX, imgOffsetY: card.imgOffsetY,
      dropRate: playerStore.dropRateOf(card.id),
    });
    if (res.ok) toast.success('Kartu tersimpan sebagai JPG! 🖼️');
    else toast.error(res.reason || 'Gagal mengunduh kartu.');
  } catch (e) {
    toast.error('Gagal mengunduh kartu.');
  } finally { downloading.value = false; }
}
const isCardZoomed = ref(false);

const activeTab = ref('browse');
const activeRarity = ref(null);
const activeSort = ref('newest');
const searchQuery = ref('');
const listings = ref([]);
const myListings = ref([]);
const page = ref(1);
const limit = 12;
const total = ref(0);
const buyingId = ref(null);
const loading = ref(false);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

const filters = [
  { value: null, label: 'Semua', activeClass: 'bg-white/10 text-white !border-white/15 shadow-sm' },
  { value: 'Common', label: 'Common', activeClass: 'bg-common/20 text-common-light !border-common/30 shadow-sm shadow-common/10' },
  { value: 'Rare', label: 'Rare', activeClass: 'bg-rare/20 text-rare-light !border-rare/30 shadow-sm shadow-rare/10' },
  { value: 'Epic', label: 'Epic', activeClass: 'bg-epic/20 text-epic-light !border-epic/30 shadow-sm shadow-epic/10' },
  { value: 'Legendary', label: 'Legendary', activeClass: 'bg-legendary/20 text-legendary-light !border-legendary/30 shadow-sm shadow-legendary/10' },
];

const sortOptions = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Termurah' },
  { value: 'price_desc', label: 'Termahal' },
  { value: 'hype', label: 'Hype tertinggi' },
];

async function fetchListings() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: page.value, limit, sort: activeSort.value });
    if (activeRarity.value) params.set('rarity', activeRarity.value);
    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim());
    const res = await fetch(`/api/market/listings?${params}`);
    const data = await res.json();
    if (res.ok) {
      listings.value = data.listings;
      total.value = data.pagination?.total ?? data.listings.length;
    }
  } catch (e) { /* skeleton handles */ }
  finally { loading.value = false; }
}

// Debounce pencarian supaya tidak spam API tiap ketik.
// Kalau page bukan 1, reset ke 1 (watcher page yang fetch); kalau sudah 1, fetch langsung.
let searchTimer = null;
watch(searchQuery, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (page.value !== 1) page.value = 1;
    else fetchListings();
  }, 350);
});

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

function openDetail(listing) {
  selectedCard.value = listing.card;
  selectedListing.value = listing;
  isCardZoomed.value = false;
}

async function handleBuyFromModal(listing) {
  if (!listing) return;
  selectedCard.value = null; // Close modal
  await handleBuy(listing);
}

async function handleCancelListingFromModal(listing) {
  if (!listing) return;
  selectedCard.value = null; // Close modal
  await handleCancel(listing);
}

// Perubahan filter yang sinkron (rarity+page atau sort+page) dibatch Vue → 1 fetch
watch([page, activeRarity, activeSort], () => fetchListings());
watch(activeTab, (tab) => { if (tab === 'mine') fetchMyListings(); });

function formatRate(r) {
  if (r === null || r === undefined) return '—';
  return (r < 1 ? r.toFixed(2) : r.toFixed(1)) + '%';
}

onMounted(async () => {
  await fetchListings();
  await fetchMyListings();
  playerStore.fetchDropRates();
});
</script>

<style scoped>
/* Galeri tile — kartu tampil besar, terangkat saat hover */
.market-tile {
  cursor: pointer;
  transition: transform var(--motion-duration-fast) var(--motion-ease-standard);
}
.market-tile:hover { transform: translateY(-4px); }

.market-tile-art {
  position: relative;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: box-shadow var(--motion-duration-fast) var(--motion-ease-standard);
}
.tile-glow-common    { box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
.tile-glow-rare      { box-shadow: 0 4px 16px rgba(56,189,248,0.22); }
.tile-glow-epic      { box-shadow: 0 4px 18px rgba(168,85,247,0.28); }
.tile-glow-legendary { box-shadow: 0 4px 22px rgba(245,158,11,0.34); }
.market-tile:hover .tile-glow-rare      { box-shadow: 0 8px 26px rgba(56,189,248,0.4); }
.market-tile:hover .tile-glow-epic      { box-shadow: 0 8px 28px rgba(168,85,247,0.45); }
.market-tile:hover .tile-glow-legendary { box-shadow: 0 8px 34px rgba(245,158,11,0.5); }
.market-tile:hover .tile-glow-common    { box-shadow: 0 8px 22px rgba(0,0,0,0.55); }
</style>
