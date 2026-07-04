<template>
  <div class="relative min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
    <!-- Atmospheric background (always present) -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute inset-0" style="background:
        radial-gradient(ellipse 60% 40% at 50% 30%, rgba(124, 58, 237, 0.08) 0%, transparent 60%),
        radial-gradient(ellipse 40% 30% at 80% 70%, rgba(245, 158, 11, 0.04) 0%, transparent 50%);"></div>
      <span v-for="i in 12" :key="'bg'+i"
        class="absolute rounded-full animate-particle-float opacity-20"
        :style="{
          width: (1 + Math.random() * 2) + 'px', height: (1 + Math.random() * 2) + 'px',
          background: ['#7C3AED', '#38BDF8', '#F59E0B'][i % 3],
          left: (Math.random() * 100) + '%', top: (Math.random() * 100) + '%',
          animationDelay: (i * 0.5) + 's', animationDuration: (5 + Math.random() * 4) + 's',
        }"
      />
    </div>

    <!-- =============== RARITY TRANSITION OVERLAY =============== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="step === 'transition'" class="fixed inset-0 z-[60] flex items-center justify-center"
          :style="{ background: transitionBg }">
          <!-- Rarity-specific effects -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <!-- Common: simple shimmer -->
            <template v-if="highestRarity === 'Common'">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-40 h-40 rounded-full animate-energy-pulse" style="background: radial-gradient(circle, rgba(148,163,184,0.3), transparent 70%);"></div>
              </div>
            </template>
            <!-- Rare: blue lightning streaks -->
            <template v-if="highestRarity === 'Rare'">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-64 h-64 rounded-full animate-energy-pulse" style="background: radial-gradient(circle, rgba(56,189,248,0.4), transparent 70%);"></div>
              </div>
              <span v-for="i in 6" :key="'rl'+i" class="absolute text-rare-light text-2xl animate-sparkle"
                :style="{ left: (20 + Math.random()*60)+'%', top: (20 + Math.random()*60)+'%', animationDelay: i*0.15+'s' }">⚡</span>
            </template>
            <!-- Epic: purple vortex -->
            <template v-if="highestRarity === 'Epic'">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-80 h-80 rounded-full animate-spin-slow" style="background: conic-gradient(from 0deg, transparent, rgba(168,85,247,0.4), transparent, rgba(192,132,252,0.3), transparent);"></div>
              </div>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-48 h-48 rounded-full animate-energy-pulse" style="background: radial-gradient(circle, rgba(168,85,247,0.5), transparent 70%);"></div>
              </div>
              <span v-for="i in 8" :key="'ep'+i" class="absolute text-epic-light animate-sparkle"
                :style="{ left: (15+Math.random()*70)+'%', top: (15+Math.random()*70)+'%', animationDelay: i*0.1+'s', fontSize: (16+Math.random()*12)+'px' }">✦</span>
            </template>
            <!-- Legendary: GOLDEN EXPLOSION -->
            <template v-if="highestRarity === 'Legendary'">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-[500px] h-[500px] rounded-full animate-spin-slow" style="background: conic-gradient(from 0deg, transparent, rgba(245,158,11,0.5), rgba(252,211,77,0.3), transparent, rgba(245,158,11,0.4), transparent);"></div>
              </div>
              <div class="absolute inset-0 flex items-center justify-center animate-pulse">
                <div class="w-60 h-60 rounded-full" style="background: radial-gradient(circle, rgba(245,158,11,0.6), rgba(252,211,77,0.2) 40%, transparent 70%);"></div>
              </div>
              <!-- Multiple burst rings -->
              <div v-for="i in 3" :key="'lr'+i" class="absolute inset-0 flex items-center justify-center"
                :style="{ animationDelay: i*0.3+'s' }">
                <div class="rounded-full border-2 border-legendary/40 animate-energy-pulse"
                  :style="{ width: (120+i*80)+'px', height: (120+i*80)+'px' }"></div>
              </div>
              <span v-for="i in 16" :key="'ls'+i" class="absolute animate-sparkle"
                :style="{ left: (10+Math.random()*80)+'%', top: (10+Math.random()*80)+'%', animationDelay: i*0.08+'s', fontSize: (14+Math.random()*16)+'px', color: ['#FCD34D','#F59E0B','#FBBF24','#D97706'][i%4] }">✦</span>
            </template>
          </div>

          <!-- Rarity emblem -->
          <div class="relative z-10 text-center animate-dramatic-zoom">
            <span class="text-6xl mb-4 block drop-shadow-2xl">{{ rarityEmblems[highestRarity] }}</span>
            <p class="font-display font-bold text-2xl" :class="'text-' + highestRarity?.toLowerCase() + '-light'">
              {{ highestRarity }}!
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =============== CARD-BY-CARD REVEAL OVERLAY =============== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="step === 'revealing'" class="fixed inset-0 z-[60] flex flex-col items-center justify-center"
          style="background: #070B1A;"
          @touchstart.prevent="onRevealTouchStart" @touchmove.prevent="onRevealTouchMove" @touchend="onRevealTouchEnd"
        >
          <!-- Skip button -->
          <button @click="skipToSummary"
            class="absolute top-4 right-4 z-20 px-4 py-2 glass-panel text-xs font-display text-muted hover:text-white transition-colors">
            Skip ⏭
          </button>

          <!-- Counter -->
          <div class="absolute top-4 left-4 z-20">
            <span class="text-sm font-display text-muted">{{ currentRevealIndex + 1 }}/{{ revealedCards.length }}</span>
          </div>

          <!-- Card display -->
          <div class="relative w-full max-w-xs" style="height: 420px;">
            <!-- Rarity glow behind card -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
              <div class="w-64 h-80 rounded-3xl blur-2xl animate-energy-pulse"
                :style="{ background: `radial-gradient(ellipse, ${currentCardGlow} 0%, transparent 70%)` }"></div>
            </div>

            <!-- SATU instance Card3D untuk semua kartu — ganti kartu = rebuild
                 texture/material in-place, bukan remount WebGL context.
                 Sekuens sinematik (flip + flash + bloom) dipicu oleh reveal-mode. -->
            <div class="w-full h-full">
              <div class="rounded-2xl !overflow-visible h-full"
                :class="'card-frame card-frame-' + currentCard?.rarity?.toLowerCase()">
                <Card3D
                  :image-url="currentCard?.imageUrl"
                  :rarity="currentCard?.rarity"
                  :name="currentCard?.name"
                  :description="currentCard?.description"
                  :hype-score="currentCard?.hypeScore"
                  :likes-per-sec="currentCard?.likesPerSec"
                  :element="currentCard?.element"
                  :foil-style="currentCard?.foilStyle"
                  :img-zoom="currentCard?.imgZoom"
                  :img-offset-x="currentCard?.imgOffsetX"
                  :img-offset-y="currentCard?.imgOffsetY"
                  mode="full"
                  reveal-mode
                  class="w-full h-full"
                />
              </div>
            </div>
          </div>

          <!-- Card info -->
          <div class="mt-4 text-center animate-slide-up" :key="'info-' + currentRevealIndex">
            <h2 class="text-xl font-display font-bold">{{ currentCard?.name }}</h2>
            <span class="rarity-badge mt-1 inline-flex" :class="'rarity-' + currentCard?.rarity?.toLowerCase()">
              {{ currentCard?.rarity }}
            </span>
            <div v-if="currentCard?.isNew" class="mt-2">
              <span class="text-xs font-display font-bold text-legendary bg-legendary/15 px-3 py-1 rounded-full border border-legendary/30">
                ✨ NEW!
              </span>
            </div>
          </div>

          <!-- Navigation hint -->
          <div class="mt-6 flex items-center gap-6">
            <button v-if="currentRevealIndex > 0" @click="prevCard"
              class="btn-secondary px-4 py-2 text-sm font-display">← Prev</button>
            <button @click="nextCard"
              class="btn-primary px-6 py-3 text-sm font-display">
              {{ currentRevealIndex < revealedCards.length - 1 ? 'Next →' : '✅ Selesai' }}
            </button>
          </div>

          <!-- Dots indicator -->
          <div class="flex gap-2 mt-4">
            <span v-for="(card, idx) in revealedCards" :key="'dot-'+idx"
              class="w-2 h-2 rounded-full transition-all duration-300 cursor-pointer"
              :class="idx === currentRevealIndex
                ? 'bg-' + card.rarity.toLowerCase() + ' scale-125 shadow-glow-sm'
                : idx <= currentRevealIndex ? 'bg-white/30' : 'bg-white/10'"
              :style="idx === currentRevealIndex ? '--glow-color: ' + rarityGlowColors[card.rarity] : ''"
              @click="goToCard(idx)"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =============== SUMMARY OVERLAY =============== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="step === 'summary'" class="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto py-8"
          style="background: #070B1A;">
          <div class="w-full max-w-lg px-4">
            <h2 class="text-xl font-display font-bold text-center mb-2">🎴 Pack Dibuka!</h2>
            <p class="text-muted text-sm text-center mb-6">{{ revealedCards.length }} kartu didapat</p>

            <!-- Cards grid -->
            <div class="grid grid-cols-5 gap-2 mb-6">
              <div v-for="(card, idx) in revealedCards" :key="'sum-'+idx"
                class="animate-fade-in relative"
                :style="{ animationDelay: idx * 0.1 + 's' }">
                <div class="aspect-[5/7] rounded-lg overflow-hidden card-frame"
                  :class="'card-frame-' + card.rarity.toLowerCase()">
                  <img v-if="card.imageUrl" :src="card.imageUrl" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-2xl bg-surface-card">
                    {{ rarityEmblems[card.rarity] }}
                  </div>
                </div>
                <p class="text-[9px] font-display font-semibold text-center mt-1 truncate">{{ card.name }}</p>
                <span class="rarity-badge text-[7px] mt-0.5 mx-auto" :class="'rarity-' + card.rarity.toLowerCase()">
                  {{ card.rarity }}
                </span>
                <!-- NEW badge -->
                <span v-if="card.isNew"
                  class="absolute -top-1 -right-1 bg-legendary text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full shadow-lg font-display">
                  NEW
                </span>
              </div>
            </div>

            <!-- Stats summary -->
            <div class="glass-panel p-4 mb-4 text-center">
              <div class="flex justify-center gap-4 text-sm">
                <div>
                  <p class="text-muted text-xs font-display">Spent</p>
                  <p class="font-display font-bold">🪙 100</p>
                </div>
                <div class="w-px bg-white/10"></div>
                <div>
                  <p class="text-muted text-xs font-display">New Cards</p>
                  <p class="font-display font-bold text-legendary">{{ revealedCards.filter(c => c.isNew).length }}</p>
                </div>
                <div class="w-px bg-white/10"></div>
                <div>
                  <p class="text-muted text-xs font-display">Best</p>
                  <p class="font-display font-bold" :class="'text-' + highestRarity?.toLowerCase() + '-light'">{{ highestRarity }}</p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button @click="resetToIdle" class="btn-primary flex-1 py-3 font-display">🎴 Buka Lagi</button>
              <router-link to="/binder" class="btn-secondary flex-1 py-3 font-display text-center">📒 Binder</router-link>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =============== MAIN CONTENT =============== -->
    <div class="relative z-10 flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">

      <!-- Header (hidden during immersive states) -->
      <div v-if="step === 'idle' || step === 'shaking' || step === 'tearing'" class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-xl font-display font-bold flex items-center gap-2">
            <span class="text-2xl">🎴</span> Pack Shop
          </h1>
          <p class="text-muted text-xs mt-0.5">1 Pack = 5 Cards • 100 coin</p>
        </div>
        <CoinDisplay :amount="playerStore.coins" size="lg" />
      </div>

      <!-- Persistent Gacha Pack Container (keeps 3D canvas alive without unmount glitches) -->
      <div v-show="['idle', 'shaking', 'tearing'].includes(step)" 
        class="flex-1 flex flex-col items-center justify-center w-full relative">
        
        <div class="relative mb-6 w-full max-w-sm">
          <!-- Atmosphere glow behind pack -->
          <div class="absolute inset-0 -bottom-4 flex items-end justify-center pointer-events-none">
            <div class="w-32 h-8 rounded-full blur-xl animate-energy-pulse"
              :style="{ 
                background: step === 'shaking' 
                  ? 'radial-gradient(ellipse, rgba(139, 92, 246, 0.4), transparent 70%)'
                  : 'radial-gradient(ellipse, rgba(124, 58, 237, 0.25), transparent 70%)' 
              }">
            </div>
          </div>
          
          <!-- Pack Wrapper -->
          <div class="glass-panel p-3 rounded-2xl" style="height: 380px; touch-action: none;">
            <GachaPack 
              ref="packRef" 
              :shaking="step === 'shaking'" 
              :tearing="step === 'tearing' && tearAnimating" 
              :tear-mode="step === 'tearing'" 
              @tear-drag-complete="onTearDragComplete"
              @tear-animation-complete="onTearAnimationComplete"
              @tear-progress="onTearProgress"
            />
          </div>
        </div>

        <!-- Auto-tear helper for desktop/tap convenience -->
        <button v-if="step === 'tearing' && !tearAnimating" @click="triggerAutoTear"
          class="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 btn-secondary py-2 px-4 text-xs font-display animate-pulse">
          ⚡ Buka Otomatis
        </button>

        <!-- Dynamic Controls below the pack -->
        <div class="w-full max-w-xs flex flex-col items-center">
          <!-- IDLE CONTROL -->
          <template v-if="step === 'idle'">
            <p v-if="checkingCards" class="text-center text-muted text-xs mb-4">⏳ Mengecek kartu...</p>
            <p v-else-if="masterCardCount === 0" class="text-center text-red-400 text-xs mb-4 glass-panel p-3 rounded-xl border border-red-500/20">
              ⚠️ <strong>Belum ada kartu tersedia.</strong><br>
              <span class="text-muted">Jalankan <code class="text-accent bg-white/5 px-1 rounded">npm run db:seed</code> atau buat kartu di Admin.</span>
            </p>
            <p v-else class="text-center text-muted text-xs mb-4">{{ masterCardCount }} kartu tersedia • Putar pack untuk melihat-lihat</p>
            <button @click="startOpening" :disabled="playerStore.coins < 100 || masterCardCount === 0"
              class="btn-primary w-full py-4 text-lg font-display relative overflow-hidden group">
              <span class="relative z-10 flex items-center justify-center gap-2">
                <template v-if="playerStore.coins < 100">
                  <span>Koin tidak cukup</span>
                  <span class="text-sm opacity-70">(100 🪙)</span>
                </template>
                <template v-else>
                  <span class="text-xl group-hover:animate-pack-shake">🎴</span>
                  <span>Buka Pack — 100 🪙</span>
                </template>
              </span>
            </button>
          </template>

          <!-- SHAKING CONTROL -->
          <template v-if="step === 'shaking'">
            <div class="text-center mb-4">
              <p class="text-accent font-display font-semibold animate-pulse text-sm">
                ✨ Pack bergetar... Ada sesuatu di dalam!
              </p>
            </div>
            <button @click="enterTearMode" class="btn-primary w-full py-4 text-lg font-display">
              ✨ Siap Membuka!
            </button>
          </template>
        </div>
      </div>

      <!-- Coin warning -->
      <div v-if="playerStore.coins < 100 && step === 'idle'"
        class="mt-4 glass-panel p-4 border-red-500/20 text-sm text-center text-secondary">
        <span class="text-red-400">⚠️</span> Koin tidak cukup. Claim koin pasif dari Dashboard atau jual kartu duplikat!
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import CoinDisplay from '@/components/CoinDisplay.vue';
import Card3D from '@/components/Card3D.vue';
import GachaPack from '@/components/GachaPack.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();

// State machine: idle → shaking → tearing → transition → revealing → summary
const step = ref('idle');
const revealedCards = ref([]);
const highestRarity = ref('Common');
const currentRevealIndex = ref(0);
const tearAnimating = ref(false);
const tearAnimationFinished = ref(false);
const packRef = ref(null);

// Swipe tracking for card reveal
let revealTouchStartX = 0;

const rarityEmblems = { Common: '🐱', Rare: '💠', Epic: '💎', Legendary: '👑' };
const rarityGlowColors = {
  Common: 'rgba(148, 163, 184, 0.3)',
  Rare: 'rgba(56, 189, 248, 0.4)',
  Epic: 'rgba(168, 85, 247, 0.5)',
  Legendary: 'rgba(245, 158, 11, 0.6)',
};

const currentCard = computed(() => revealedCards.value[currentRevealIndex.value]);

const currentCardGlow = computed(() => {
  const r = currentCard.value?.rarity;
  return rarityGlowColors[r] || 'rgba(124, 58, 237, 0.15)';
});

const transitionBg = computed(() => {
  return {
    Common: 'radial-gradient(ellipse at center, rgba(148,163,184,0.15) 0%, #070B1A 60%)',
    Rare: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.2) 0%, #070B1A 60%)',
    Epic: 'radial-gradient(ellipse at center, rgba(168,85,247,0.3) 0%, #070B1A 50%)',
    Legendary: 'radial-gradient(ellipse at center, rgba(245,158,11,0.35) 0%, rgba(252,211,77,0.1) 30%, #070B1A 60%)',
  }[highestRarity.value] || '#070B1A';
});

// === FLOW FUNCTIONS ===

function startOpening() {
  if (playerStore.coins < 100) return;
  step.value = 'shaking';
}

function enterTearMode() {
  step.value = 'tearing';
  tearAnimating.value = false;
  tearAnimationFinished.value = false;
  // Also start API call in background
  fetchCards();
}

let pendingCards = null;
let apiDone = false;

async function fetchCards() {
  apiDone = false;
  pendingCards = null;
  try {
    const res = await fetch('/api/gacha', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (!res.ok) {
      let errMsg = 'Gagal membuka pack.';
      try { const d = await res.json(); errMsg = d.message || errMsg; } catch(_){}
      toast.error(errMsg);
      step.value = 'idle';
      return;
    }
    const data = await res.json();
    pendingCards = data.cardsDrawn || [data.cardDrawn];
    highestRarity.value = data.highestRarity || pendingCards[pendingCards.length - 1]?.rarity || 'Common';
    apiDone = true;

    // Check if both animation and API completed
    checkAndProceed();
  } catch (e) {
    toast.error('Gagal membuka pack. Coba lagi.');
    step.value = 'idle';
  }
}

function onTearProgress(progress) {
  // Visual feedback only — handled in GachaPack
}

function onTearDragComplete() {
  tearAnimating.value = true;
}

function onTearAnimationComplete() {
  tearAnimationFinished.value = true;
  checkAndProceed();
}

function checkAndProceed() {
  if (apiDone && tearAnimationFinished.value) {
    proceedToTransition();
  }
}

function triggerAutoTear() {
  if (packRef.value) {
    packRef.value.tearProgressPercent = 1;
  }
  onTearDragComplete();
}

async function proceedToTransition() {
  if (!pendingCards || pendingCards.length === 0) {
    step.value = 'idle';
    return;
  }

  revealedCards.value = pendingCards;
  currentRevealIndex.value = 0;

  // Show rarity transition effect
  step.value = 'transition';

  // Duration based on rarity
  const transitionMs = {
    Common: 1200,
    Rare: 1800,
    Epic: 2500,
    Legendary: 3500,
  }[highestRarity.value] || 1500;

  // Fire confetti for Epic/Legendary
  if (highestRarity.value === 'Epic' || highestRarity.value === 'Legendary') {
    try {
      const confetti = (await import('canvas-confetti')).default;
      const isLegendary = highestRarity.value === 'Legendary';
      const colors = isLegendary
        ? ['#F59E0B', '#FCD34D', '#D97706', '#FBBF24']
        : ['#A855F7', '#C084FC', '#7C3AED', '#8B5CF6'];
      setTimeout(() => confetti({ particleCount: isLegendary ? 200 : 100, spread: 90, origin: { y: 0.5 }, colors, ticks: 100 }), 500);
      if (isLegendary) {
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { y: 0.4 }, colors }), 1200);
        setTimeout(() => confetti({ particleCount: 100, spread: 70, origin: { x: 0.2, y: 0.5 }, colors }), 2000);
        setTimeout(() => confetti({ particleCount: 100, spread: 70, origin: { x: 0.8, y: 0.5 }, colors }), 2000);
      }
    } catch(e) {}
  }

  await new Promise(r => setTimeout(r, transitionMs));

  step.value = 'revealing';
  await playerStore.refreshAfterAction();
}

// === CARD REVEAL NAVIGATION ===

function nextCard() {
  if (currentRevealIndex.value < revealedCards.value.length - 1) {
    currentRevealIndex.value++;
  } else {
    skipToSummary();
  }
}

function prevCard() {
  if (currentRevealIndex.value > 0) currentRevealIndex.value--;
}

function goToCard(idx) {
  if (idx >= 0 && idx < revealedCards.value.length) currentRevealIndex.value = idx;
}

function skipToSummary() {
  step.value = 'summary';
}

// Swipe navigation for reveal
function onRevealTouchStart(e) {
  if (e.touches.length === 1) revealTouchStartX = e.touches[0].clientX;
}
function onRevealTouchMove(e) { /* handled in touchend */ }
function onRevealTouchEnd(e) {
  const dx = (e.changedTouches?.[0]?.clientX || 0) - revealTouchStartX;
  if (Math.abs(dx) > 30) {
    if (dx < 0) nextCard(); // swipe left = next
    else prevCard(); // swipe right = prev
  }
}

function resetToIdle() {
  step.value = 'idle';
  revealedCards.value = [];
  currentRevealIndex.value = 0;
  tearAnimating.value = false;
  tearAnimationFinished.value = false;
  pendingCards = null;
  apiDone = false;
}

const masterCardCount = ref(0);
const checkingCards = ref(true);

async function checkCardAvailability() {
  checkingCards.value = true;
  try {
    const res = await fetch('/api/master-cards');
    if (res.ok) {
      const data = await res.json();
      masterCardCount.value = data.cards?.length || 0;
    }
  } catch (e) {
    masterCardCount.value = 0;
  } finally {
    checkingCards.value = false;
  }
}

onMounted(async () => {
  await authStore.fetchMe();
  await checkCardAvailability();
});
</script>

<style scoped>
.fade-enter-active { transition: opacity 0.4s ease; }
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
