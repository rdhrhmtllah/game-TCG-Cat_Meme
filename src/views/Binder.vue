<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="premium-header">
        <div class="premium-header-icon text-accent">
          <IconBase name="binder" :size="20" />
        </div>
        <div>
          <h1 class="premium-header-title">Binder</h1>
          <p class="text-muted text-xs mt-0.5">{{ filteredInventory.length }} kartu ditemukan</p>
        </div>
      </div>
    </div>

    <!-- ===== SHOWCASE CABINET (LEMARI KHUSUS) ===== -->
    <div class="mb-6 relative overflow-hidden rounded-2xl p-0.5"
      style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(124, 58, 237, 0.2), rgba(56, 189, 248, 0.3)); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);">
      <div class="glass-panel-strong p-5 rounded-[14px] relative z-10">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-sm font-display font-bold text-legendary-light flex items-center gap-1.5">
              <span>🏆</span> Showcase Cabinet
            </h2>
            <p class="text-muted text-[11px] mt-0.5">Lemari pajangan kartu kebanggaanmu. Kartu di sini menghasilkan koin pasif!</p>
          </div>
          <span class="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-muted font-display font-bold">
            {{ playerStore.showcase.length }}/5 Slot
          </span>
        </div>

        <!-- 5 Slots Cabinet Grid -->
        <div class="grid grid-cols-5 gap-3">
          <div v-for="slot in 5" :key="'showcase-slot-' + slot"
            class="aspect-[5/7] rounded-xl relative !overflow-visible group transition-all duration-300 flex items-center justify-center"
            :class="playerStore.showcase[slot - 1]
              ? 'cursor-pointer hover:scale-105'
              : 'border-2 border-dashed border-white/8 hover:border-white/15 hover:border-accent/30 bg-white/[0.01] hover:bg-white/[0.03] flex flex-col items-center justify-center cursor-pointer'"
            @click="playerStore.showcase[slot - 1] ? openDetail(playerStore.showcase[slot - 1]) : scrollToGrid()"
          >
            <!-- Slot Has Card (Card2D: ringan & tanpa WebGL, anti kartu-putih) -->
            <template v-if="playerStore.showcase[slot - 1]">
              <Card2D
                :image-url="playerStore.showcase[slot - 1].imageUrl"
                :rarity="playerStore.showcase[slot - 1].rarity"
                :name="playerStore.showcase[slot - 1].name"
                :description="playerStore.showcase[slot - 1].description"
                :hype-score="playerStore.showcase[slot - 1].hypeScore"
                :likes-per-sec="playerStore.showcase[slot - 1].likesPerSec"
                :element="playerStore.showcase[slot - 1].element"
                :foil-style="playerStore.showcase[slot - 1].foilStyle"
                :img-zoom="playerStore.showcase[slot - 1].imgZoom"
                :img-offset-x="playerStore.showcase[slot - 1].imgOffsetX"
                :img-offset-y="playerStore.showcase[slot - 1].imgOffsetY"
              />
              <!-- Tiny remove overlay button on hover -->
              <button @click.stop="handleShowcaseActionDirect(playerStore.showcase[slot - 1], 'remove')"
                class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/90 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md hover:bg-red-400"
                title="Keluarkan dari showcase">
                ✕
              </button>
            </template>

            <!-- Empty Slot -->
            <template v-else>
              <span class="text-lg text-white/20 group-hover:text-white/40 transition-colors font-display">+</span>
              <span class="text-[8px] text-muted/60 mt-1 uppercase tracking-wider font-display font-bold">Slot</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- View Toggle — Glass Tabs -->
    <div class="glass-tabs mb-4" ref="gridSectionRef">
      <button @click="showAll = false"
        class="glass-tab" :class="{ 'glass-tab-active': !showAll }">
        Milikku
      </button>
      <button @click="showAll = true"
        class="glass-tab" :class="{ 'glass-tab-active': showAll }">
        Semua Kartu
      </button>
    </div>

    <!-- Filter Chips -->
    <div class="flex gap-2 mb-5 touch-scroll-x pb-1">
      <button v-for="r in filters" :key="r.value" @click="activeRarity = r.value"
        class="glass-chip"
        :class="(activeRarity === r.value) ? r.activeClass : ''">
        {{ r.label }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="displayCards.length === 0" class="animate-fade-in">
      <div class="glass-panel p-10 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full glass-panel flex items-center justify-center" style="box-shadow: 0 0 25px rgba(124, 58, 237, 0.1);">
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
        class="relative cursor-pointer group animate-fade-in flex flex-col binder-card"
        :class="[
          item.owned ? 'opacity-100' : 'opacity-30 grayscale',
        ]"
        :data-tour="(item.owned && idx === firstOwnedIndex) ? 'card-item' : null"
        :style="{ animationDelay: Math.min(idx * 0.03, 0.3) + 's' }"
        @click="item.owned ? openDetail(item.inventoryItem || item) : null"
      >
        <!-- Card 2D Representation (High performance, sharp vector elements) -->
        <Card2D
          :image-url="item.card?.imageUrl"
          :rarity="item.card?.rarity"
          :name="item.card?.name"
          :description="item.card?.description"
          :hype-score="item.card?.hypeScore"
          :likes-per-sec="item.card?.likesPerSec"
          :element="item.card?.element"
          :img-zoom="item.card?.imgZoom"
          :img-offset-x="item.card?.imgOffsetX"
          :img-offset-y="item.card?.imgOffsetY"
          :drop-rate="playerStore.dropRateOf(item.card?.id)"
          :owned="item.owned"
        />

        <!-- Quantity badge (Moved outside card-frame to prevent overflow clipping) -->
        <span v-if="item.quantity > 1"
          class="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-accent to-accent-glow text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center z-20 shadow-lg shadow-accent/30 font-display">
          {{ item.quantity }}
        </span>

        <!-- Showcase indicator (Gold star mirroring quantity badge) -->
        <span v-if="item.inventoryItem?.inShowcase"
          class="absolute -top-1.5 -left-1.5 bg-gradient-to-br from-amber-400 to-amber-600 text-white text-[9.5px] w-[18px] h-[18px] rounded-full flex items-center justify-center z-20 shadow-lg shadow-amber-500/20 font-display animate-pulse-slow">
          ⭐
        </span>
      </div>
    </div>

    <!-- ===== CARD DETAIL MODAL ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedCard" class="modal-overlay flex items-center justify-center p-4 animate-fade-in" @click.self="handleBackdropClick">
          
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

              <!-- Bottom info: Rarity, Name, Stats (like gacha reveal!) -->
              <div class="w-full max-w-sm mx-auto text-center pointer-events-auto bg-black/75 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-2xl"
                style="margin-bottom: env(safe-area-inset-bottom, 24px); box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
                <span class="inline-block text-[10px] font-display font-bold tracking-[0.25em] px-3 py-1 rounded-full mb-2.5"
                  :class="'rarity-' + (selectedCard.card?.rarity || '').toLowerCase()">
                  {{ selectedCard.card?.rarity }}
                </span>
                <h3 class="text-xl font-display font-black leading-tight text-white mb-3">
                  {{ selectedCard.card?.name }}
                </h3>
                
                <!-- Stat chips like Gacha Reveal -->
                <div class="flex items-center justify-center gap-2">
                  <span class="glass-panel px-3 py-1.5 text-xs font-display flex items-center gap-1.5 text-white/90">
                    <span class="text-muted text-[10px]">HYPE</span>
                    <span class="font-bold text-accent">{{ selectedCard.card?.hypeScore }}</span>
                  </span>
                  <span class="glass-panel px-3 py-1.5 text-xs font-display flex items-center gap-1.5 text-white/90">
                    <span class="text-muted text-[10px]">YIELD</span>
                    <span class="font-bold text-accent">{{ selectedCard.card?.likesPerSec }}/s</span>
                  </span>
                  <span v-if="selectedCard.card?.element" class="glass-panel px-3 py-1.5 text-xs font-display text-white/90">
                    {{ selectedCard.card?.element }}
                  </span>
                </div>

                <!-- Click to flip info -->
                <p class="text-[10px] text-muted mt-3.5">👆 Tap kartu untuk membalikkan</p>
              </div>
            </div>
          </Transition>

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
            <div class="p-4 relative transition-all duration-300 origin-center flex items-center justify-center"
              :style="{ height: isCardZoomed ? '420px' : '320px' }">
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
                :drop-rate="playerStore.dropRateOf(selectedCard.card?.id)"
                mode="full"
                hd
                :allow-zoom="true"
                :focused="isCardZoomed"
                @zoom-change="isCardZoomed = $event"
                @click="isCardZoomed = true"
                class="w-full h-full cursor-pointer relative z-10"
              />
            </div>
            <p class="text-xs text-center text-muted -mt-1 mb-3 transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }">👆 Tap kartu untuk flip</p>

            <!-- Stats Grid with Rarity Accent -->
            <div class="grid grid-cols-3 gap-2 px-5 pb-1 text-center transition-opacity duration-300"
              :class="[
                { 'opacity-0 pointer-events-none': isCardZoomed },
                'stats-grid-' + (selectedCard.card?.rarity || 'Common').toLowerCase()
              ]">
              <div class="glass-panel p-2.5 rounded-xl stat-box">
                <p class="text-muted text-[10px] font-display uppercase tracking-wider">Hype</p>
                <p class="font-display font-bold text-sm mt-0.5">{{ selectedCard.card?.hypeScore }}</p>
              </div>
              <div class="glass-panel p-2.5 rounded-xl stat-box">
                <p class="text-muted text-[10px] font-display uppercase tracking-wider">Likes/dtk</p>
                <p class="font-display font-bold text-sm mt-0.5">{{ selectedCard.card?.likesPerSec }}</p>
              </div>
              <div class="glass-panel p-2.5 rounded-xl stat-box">
                <p class="text-muted text-[10px] font-display uppercase tracking-wider">Qty</p>
                <p class="font-display font-bold text-sm mt-0.5">×{{ selectedCard.quantity }}</p>
              </div>
            </div>

            <!-- Peluang drop -->
            <div v-if="playerStore.dropRateOf(selectedCard.card?.id) !== null"
              class="px-5 mt-2 flex items-center justify-between text-xs font-display transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }">
              <span class="text-muted flex items-center gap-1">🎲 Peluang Drop</span>
              <span class="font-bold" :class="'text-' + (selectedCard.card?.rarity || 'common').toLowerCase() + '-light'">
                {{ formatRate(playerStore.dropRateOf(selectedCard.card?.id)) }}
              </span>
            </div>

            <!-- Separator -->
            <div class="h-px bg-white/5 mx-5 my-3.5 transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }"></div>

            <!-- Description -->
            <p class="px-5 text-sm text-secondary leading-relaxed transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }">{{ selectedCard.card?.description }}</p>

            <!-- Actions Section -->
            <div class="p-5 space-y-4 transition-opacity duration-300"
              :class="{ 'opacity-0 pointer-events-none': isCardZoomed }">
              
              <!-- Showcase Placement -->
              <button v-if="!selectedCard.inShowcase && !playerStore.isShowcaseFull"
                @click="handleShowcaseAction(selectedCard, 'add')"
                data-tour="showcase-btn"
                class="btn-primary w-full text-sm font-display flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-glow-sm hover:shadow-glow transition-all duration-300">
                🏆 Pajang di Showcase Cabinet
              </button>
              
              <button v-else-if="selectedCard.inShowcase"
                @click="handleShowcaseAction(selectedCard, 'remove')"
                class="btn-secondary w-full text-sm font-display flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/35 text-red-400 hover:bg-red-500/10 transition-all duration-300">
                ❌ Keluarkan dari Showcase
              </button>

              <!-- Download kartu jadi JPG (HD) -->
              <button @click="handleDownloadCard(selectedCard.card)" :disabled="downloading"
                class="btn-secondary w-full text-sm font-display flex items-center justify-center gap-2 py-3 rounded-xl">
                {{ downloading ? '⏳ Menyiapkan gambar HD...' : '⬇️ Download Kartu (JPG HD)' }}
              </button>

              <!-- Sell Options Group -->
              <div class="space-y-2.5">
                <p class="text-[10px] font-display font-bold uppercase tracking-wider text-muted/80 px-1">💰 Opsi Penjualan Kartu</p>
                
                <div class="grid grid-cols-2 gap-3">
                  <!-- Option 1: Marketplace (P2P) -->
                  <div class="glass-panel p-3.5 rounded-xl hover:border-accent/40 cursor-pointer flex flex-col justify-between transition-all duration-300 group/sell"
                    :class="[
                      (selectedCard.quantity > 1 && !selectedCard.inShowcase) ? 'opacity-100 hover:bg-white/[0.02]' : 'opacity-40 cursor-not-allowed'
                    ]"
                    @click="(selectedCard.quantity > 1 && !selectedCard.inShowcase) ? showMarketForm = !showMarketForm : null">
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-display font-extrabold text-white group-hover/sell:text-accent transition-colors">💎 Market</span>
                        <span class="text-[7.5px] bg-accent/20 text-accent-soft px-1.5 py-0.5 rounded font-display font-bold">P2P</span>
                      </div>
                      <p class="text-[9px] text-muted leading-snug">Jual ke pemain lain dengan harga kustom.</p>
                    </div>
                    <span class="text-[9px] font-display font-black text-accent mt-3 flex items-center gap-1 group-hover/sell:translate-x-1 transition-all">
                      Listing →
                    </span>
                  </div>

                  <!-- Option 2: Sell to Vault (System) -->
                  <div class="glass-panel p-3.5 rounded-xl hover:border-red-500/30 cursor-pointer flex flex-col justify-between transition-all duration-300 group/sell"
                    :class="[
                      !selectedCard.inShowcase ? 'opacity-100 hover:bg-white/[0.02]' : 'opacity-40 cursor-not-allowed'
                    ]"
                    @click="!selectedCard.inShowcase ? handleSellToVault(selectedCard) : null">
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-display font-extrabold text-white group-hover/sell:text-red-400 transition-colors">🪙 Vault</span>
                        <span class="text-[7.5px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-display font-bold">INSTAN</span>
                      </div>
                      <p class="text-[9px] text-muted leading-snug">Jual langsung ke sistem secara instan.</p>
                    </div>
                    <span class="text-[9px] font-display font-black text-amber-400 mt-3 flex items-center gap-0.5 group-hover/sell:scale-105 transition-all">
                      Dapatkan {{ Math.floor(selectedCard.card?.hypeScore * 0.3) }} coin
                    </span>
                  </div>
                </div>
              </div>

              <!-- Marketplace Price Input Sub-form (Expanded) -->
              <Transition name="fade-slide">
                <div v-if="showMarketForm" class="space-y-3 p-4 glass-panel rounded-xl border border-accent/20 bg-slate-900/40 shadow-glow-sm">
                  <div class="flex justify-between items-center pb-1.5 border-b border-white/5">
                    <span class="text-xs font-display font-bold text-white">💰 Tentukan Harga Jual</span>
                    <span class="text-[9px] text-muted font-display">Range: {{ Math.floor(selectedCard.card?.hypeScore * 0.5) }} – {{ Math.floor(selectedCard.card?.hypeScore * 5) }}</span>
                  </div>

                  <div class="relative">
                    <input v-model="marketPrice" type="number"
                      class="input-premium pl-8 text-sm font-display font-black text-amber-400"
                      :placeholder="'Harga koin'" />
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🪙</span>
                  </div>

                  <div class="flex gap-2">
                    <button @click="handleListToMarket(selectedCard)" class="btn-primary flex-1 text-xs py-2 rounded-lg font-display">
                      Listing Kartu
                    </button>
                    <button @click="showMarketForm = false" class="btn-secondary text-xs py-2 rounded-lg font-display">
                      Batal
                    </button>
                  </div>
                </div>
              </Transition>

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
import { downloadCardImage } from '@/utils/cardRenderer.js';
import Card3D from '@/components/Card3D.vue';
import Card2D from '@/components/Card2D.vue';
import IconBase from '@/components/IconBase.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();

const activeRarity = ref(null);
const showAll = ref(false);
const selectedCard = ref(null);
const showMarketForm = ref(false);
const marketPrice = ref(0);
const isCardZoomed = ref(false);
const gridSectionRef = ref(null);

const filters = [
  { value: null, label: 'Semua', activeClass: 'bg-white/10 text-white !border-white/15 shadow-sm' },
  { value: 'Common', label: 'Common', activeClass: 'bg-common/20 text-common-light !border-common/30 shadow-sm shadow-common/10' },
  { value: 'Rare', label: 'Rare', activeClass: 'bg-rare/20 text-rare-light !border-rare/30 shadow-sm shadow-rare/10' },
  { value: 'Epic', label: 'Epic', activeClass: 'bg-epic/20 text-epic-light !border-epic/30 shadow-sm shadow-epic/10' },
  { value: 'Legendary', label: 'Legendary', activeClass: 'bg-legendary/20 text-legendary-light !border-legendary/30 shadow-sm shadow-legendary/10' },
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

// Indeks kartu pertama yang dimiliki — target anchor tour "card-item"
const firstOwnedIndex = computed(() => displayCards.value.findIndex(c => c.owned));

const detailGlowColor = computed(() => {
  const r = selectedCard.value?.card?.rarity;
  return { Common: 'rgba(148, 163, 184, 0.2)', Rare: 'rgba(56, 189, 248, 0.25)', Epic: 'rgba(168, 85, 247, 0.3)', Legendary: 'rgba(245, 158, 11, 0.35)' }[r] || 'rgba(124, 58, 237, 0.15)';
});

function scrollToGrid() {
  if (gridSectionRef.value) {
    gridSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast.info('Pilih salah satu kartu milikmu di bawah untuk menambahkannya ke showcase!');
  }
}

function openDetail(item) {
  // If the passed item is from playerStore.showcase, it's just the card metadata.
  // We need to resolve the proper inventory item to perform actions!
  const targetId = item.id || item.cardId;
  const invItem = playerStore.inventory.find(i => i.id === targetId || i.cardId === targetId);
  
  if (invItem) {
    selectedCard.value = invItem;
  } else {
    selectedCard.value = item;
  }
  
  showMarketForm.value = false;
  marketPrice.value = Math.floor((selectedCard.value.card?.hypeScore || 100) * 0.5);
  window.dispatchEvent(new CustomEvent('tour:card-detail')); // untuk onboarding tour
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

async function handleShowcaseActionDirect(item, action) {
  // Find correct inventory ID
  const invItem = playerStore.inventory.find(i => i.cardId === item.cardId || i.id === item.id);
  if (!invItem) return;
  await handleShowcaseAction(invItem, action);
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
    if (action === 'add') window.dispatchEvent(new CustomEvent('tour:card-showcased')); // onboarding tour
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

function formatRate(r) {
  if (r === null || r === undefined) return '—';
  return (r < 1 ? r.toFixed(2) : r.toFixed(1)) + '%';
}

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

onMounted(async () => {
  await Promise.all([playerStore.fetchInventory(), playerStore.fetchMasterCards(), playerStore.fetchDropRates()]);
  // Quest harian: kunjungi Binder (di-ignore kalau quest itu tidak aktif hari ini)
  if (authStore.token) {
    fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ action: 'visit' }),
    }).catch(() => {});
  }
});
</script>

<style scoped>
.modal-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-content { transform: scale(0.9) translateY(20px); }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

/* Binder card hover effect */
.binder-card {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.binder-card:hover {
  transform: translateY(-4px) scale(1.03);
}
.binder-card:active {
  transform: translateY(-1px) scale(0.98);
}

/* Card stats overlay from bottom */
.card-stats-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 8px;
  background: linear-gradient(0deg, rgba(5, 8, 22, 0.9) 0%, rgba(5, 8, 22, 0.6) 60%, transparent 100%);
  transform: translateY(100%);
  opacity: 0;
  transition: all 0.25s var(--motion-ease-standard);
  pointer-events: none;
  border-radius: 0 0 inherit inherit;
}
.binder-card:hover .card-stats-overlay {
  transform: translateY(0);
  opacity: 1;
}

/* Rarity-specific stats grids */
.stat-box {
  transition: all 0.3s ease;
}
.stats-grid-common .stat-box { border-color: rgba(255, 255, 255, 0.08); }
.stats-grid-rare .stat-box { border-color: rgba(56, 189, 248, 0.25); box-shadow: 0 0 10px rgba(56, 189, 248, 0.04); }
.stats-grid-epic .stat-box { border-color: rgba(168, 85, 247, 0.3); box-shadow: 0 0 12px rgba(168, 85, 247, 0.05); }
.stats-grid-legendary .stat-box { border-color: rgba(245, 158, 11, 0.35); box-shadow: 0 0 15px rgba(245, 158, 11, 0.08); }

/* Fade Slide transition for zoom exit button */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.9);
}
</style>
