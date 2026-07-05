<template>
  <div class="max-w-xl mx-auto px-4 py-6 relative">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-display font-bold dash-title">MemeCats</h1>
        <p class="text-muted text-sm mt-0.5">{{ authStore.user?.username }}</p>
      </div>
      <CoinDisplay :amount="playerStore.coins" size="lg" />
    </div>

    <!-- Hero Card -->
    <div class="mb-6 relative">
      <!-- Glow behind hero card -->
      <div v-if="playerStore.featuredCard" class="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
        <div class="w-48 h-64 rounded-3xl blur-3xl opacity-30"
          :style="{ background: `radial-gradient(ellipse, ${heroGlowColor}, transparent 70%)` }"></div>
      </div>

      <div class="rounded-2xl !overflow-visible"
        :class="playerStore.featuredCard ? 'card-frame card-frame-' + playerStore.featuredCard.rarity.toLowerCase() : ''"
        style="height: 340px;">
        <Card3D
          v-if="playerStore.featuredCard"
          :key="'hero-' + playerStore.featuredCard.cardId"
          :image-url="playerStore.featuredCard.imageUrl"
          :rarity="playerStore.featuredCard.rarity"
          :name="playerStore.featuredCard.name"
          :description="playerStore.featuredCard.description"
          :hype-score="playerStore.featuredCard.hypeScore"
          :likes-per-sec="playerStore.featuredCard.likesPerSec"
          :element="playerStore.featuredCard.element"
          :foil-style="playerStore.featuredCard.foilStyle"
          :img-zoom="playerStore.featuredCard.imgZoom"
          :img-offset-x="playerStore.featuredCard.imgOffsetX"
          :img-offset-y="playerStore.featuredCard.imgOffsetY"
          mode="full"
          class="w-full h-full"
        />
        <div v-else class="w-full h-full glass-panel flex flex-col items-center justify-center text-center p-6">
          <div class="w-20 h-20 rounded-full glass-panel flex items-center justify-center mb-4 animate-float" style="box-shadow: 0 0 30px rgba(124, 58, 237, 0.15);">
            <span class="text-4xl">🌟</span>
          </div>
          <h3 class="text-lg font-display font-bold mb-2">Mulai Koleksimu!</h3>
          <p class="text-muted text-sm mb-5">Buka pack pertamamu dan tampilkan kartu terbaik di showcase.</p>
          <router-link to="/gacha" class="btn-primary text-sm font-display">🎴 Buka Pack</router-link>
        </div>
      </div>
    </div>
    <!-- Hero card label -->
    <div v-if="playerStore.featuredCard" class="text-center -mt-2 mb-6">
      <p class="font-display font-bold text-lg">{{ playerStore.featuredCard.name }}</p>
      <span class="rarity-badge" :class="'rarity-' + playerStore.featuredCard.rarity.toLowerCase()">
        {{ playerStore.featuredCard.rarity }}
      </span>
    </div>

    <!-- Collection Progress — Ring Style -->
    <div class="section-glass p-5 mb-4" data-tour="stats">
      <div class="flex items-center gap-4">
        <!-- Progress Ring -->
        <div class="relative flex-shrink-0">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="4" />
            <circle cx="28" cy="28" r="24" fill="none"
              stroke="url(#dexGradient)" stroke-width="4" stroke-linecap="round"
              class="progress-ring-circle"
              :style="{ strokeDasharray: `${2 * Math.PI * 24}`, strokeDashoffset: `${2 * Math.PI * 24 * (1 - playerStore.dexProgress / 100)}` }"
            />
            <defs>
              <linearGradient id="dexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#7C3AED" />
                <stop offset="50%" stop-color="#A855F7" />
                <stop offset="100%" stop-color="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>
          <span class="absolute inset-0 flex items-center justify-center text-xs font-display font-bold">
            {{ playerStore.dexProgress }}%
          </span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-display font-semibold flex items-center gap-1.5">
            <span>📚</span> Card Dex
          </p>
          <p class="text-xs text-muted mt-0.5">
            {{ playerStore.totalCardsOwned }}<span class="text-muted/60">/{{ playerStore.totalCardsInGame }}</span> kartu ditemukan
          </p>
          <!-- Flat progress bar (secondary) -->
          <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
            <div class="h-full bg-gradient-to-r from-accent via-epic to-legendary rounded-full transition-all duration-700"
              :style="{ width: playerStore.dexProgress + '%' }" />
          </div>
        </div>
      </div>
    </div>

    <!-- Idle Economy — Enhanced Yield Pasif -->
    <div class="section-glass p-5 mb-4" data-tour="showcase">
      <div class="flex items-center justify-between mb-1">
        <p class="text-sm text-muted flex items-center gap-1.5 font-display">
          <span class="text-lg">⚡</span> Yield Pasif
        </p>
        <span class="text-[10px] text-muted font-display">
          ≈ {{ playerStore.coinsPerHour }} coin/jam
        </span>
      </div>
      <!-- Penjelasan singkat (selalu tampil) -->
      <p class="text-[11px] text-muted/80 font-dm-sans mb-3">
        🃏 Kartu yang kamu pajang di <strong class="text-secondary">Showcase</strong> menghasilkan coin otomatis tiap detik — makin langka & banyak, makin besar.
      </p>

      <!-- EMPTY STATE: showcase kosong → jelaskan cara mengaktifkan -->
      <div v-if="playerStore.showcase.length === 0"
        class="rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/[0.04] mb-1">
        <div class="flex items-start gap-3">
          <span class="text-2xl">💡</span>
          <div class="flex-1">
            <p class="text-sm font-display font-bold text-emerald-300">Showcase-mu masih kosong</p>
            <p class="text-xs text-secondary mt-0.5 mb-3">Letakkan kartu ke showcase agar coin mulai bertambah otomatis. Tanpa kartu di showcase, yield = 0.</p>
            <router-link to="/binder" class="btn-primary text-sm px-4 py-2 font-display inline-flex items-center gap-1.5">
              🃏 Isi Showcase <span>→</span>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Animated coin counter (saat showcase berisi) -->
      <template v-else>
        <p class="text-3xl font-display font-bold text-emerald-400 mb-1 transition-all">
          {{ animatedEstimate }} <span class="text-sm text-emerald-400/60">coin</span>
        </p>
        <p class="text-[10px] text-muted font-display mb-1">
          {{ playerStore.effectiveLikesPerSec.toFixed(1) }} likes/dtk · 2.500 likes = 1 coin
          <span v-if="playerStore.effectiveLikesPerSec > 87" class="text-legendary">· cap ~3.000/hari</span>
        </p>
      </template>

      <!-- Progress, breakdown, & tombol klaim hanya saat showcase berisi -->
      <template v-if="playerStore.showcase.length > 0">
      <!-- Progress bar ke 24h cap -->
      <div class="mb-2">
        <div class="flex items-center justify-between text-[10px] text-muted mb-1">
          <span>Progres ke cap 24 jam</span>
          <span>{{ Math.round(playerStore.yieldCapProgress) }}%</span>
        </div>
        <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-1000 ease-linear"
            :style="{ width: playerStore.yieldCapProgress + '%' }"
            :class="playerStore.yieldCapProgress >= 100 ? 'bg-legendary' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'" />
        </div>
        <p v-if="playerStore.yieldCapProgress >= 100" class="text-[10px] text-legendary font-display mt-1">
          ⚡ Cap 24 jam tercapai! Klaim sekarang.
        </p>
      </div>

      <!-- Multiplier Breakdown (collapsible) -->
      <div class="mb-2">
        <button @click="showBreakdown = !showBreakdown"
          class="text-[10px] text-muted hover:text-secondary font-display flex items-center gap-1 transition-colors">
          <span>{{ showBreakdown ? '▼' : '▶' }}</span> Detail multiplier
        </button>
        <div v-if="showBreakdown" class="mt-2 space-y-1.5 text-[11px] font-display animate-fade-in">
          <div class="flex items-center justify-between">
            <span class="text-muted">🃏 Showcase Base</span>
            <span class="font-semibold text-primary">{{ playerStore.totalLikesPerSec.toFixed(1) }}/s</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">📚 Collection Bonus</span>
            <span class="font-semibold" :class="playerStore.collectionBonus > 0 ? 'text-emerald-400' : 'text-muted'">
              +{{ playerStore.collectionBonus.toFixed(2) }}/s ({{ playerStore.uniqueCardsOwned }} kartu unik)
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">🔥 Streak Bonus</span>
            <span class="font-semibold" :class="playerStore.streakMultiplier > 1 ? 'text-emerald-400' : 'text-muted'">
              ×{{ playerStore.streakMultiplier.toFixed(2) }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">✨ Synergy Bonus</span>
            <span class="font-semibold" :class="playerStore.synergyMultiplier > 1 ? 'text-emerald-400' : 'text-muted'">
              ×{{ playerStore.synergyMultiplier.toFixed(2) }}
            </span>
          </div>
          <div class="border-t border-white/5 pt-1 flex items-center justify-between">
            <span class="text-secondary font-semibold">Effective Rate</span>
            <span class="font-bold text-primary">{{ playerStore.effectiveLikesPerSec.toFixed(2) }} likes/s</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">💰 Konversi Coin</span>
            <span class="font-semibold text-emerald-400">≈ {{ playerStore.coinsPerHour }} coin/jam</span>
          </div>
        </div>
      </div>

      <!-- Element synergy tags -->
      <div v-if="Object.keys(playerStore.showcaseElementCounts).length > 0" class="flex flex-wrap gap-1.5 mb-3">
        <span v-for="(count, element) in playerStore.showcaseElementCounts" :key="element"
          class="text-[10px] px-2 py-0.5 rounded-full font-display font-medium"
          :class="count >= 3 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-muted'">
          {{ elementIcon(element) }} {{ element }}
          <template v-if="count >= 3">(+10%)</template>
        </span>
      </div>

      <!-- Claim Button -->
      <button
        @click="handleClaim"
        :disabled="cooldownRemaining > 0 || claiming"
        class="btn-primary w-full py-3 relative"
        :class="{ 'animate-pulse-glow': cooldownRemaining === 0 && playerStore.totalLikesPerSec > 0 }"
        :style="cooldownRemaining === 0 && playerStore.totalLikesPerSec > 0 ? '--glow-color: rgba(16, 185, 129, 0.4)' : ''"
      >
        <span class="font-display font-semibold">
          <template v-if="claiming">🔃 Mengklaim...</template>
          <template v-else-if="cooldownRemaining > 0">⏳ {{ cooldownRemaining }}s</template>
          <template v-else>💰 Klaim Yield Pasif</template>
        </span>
      </button>
      </template>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 gap-3 mb-5">
      <router-link to="/binder" class="glass-card p-4 text-center group">
        <div class="w-11 h-11 rounded-xl glass-panel flex items-center justify-center mx-auto mb-2.5 group-hover:shadow-glow-sm transition-all duration-300" style="--glow-color: rgba(168, 85, 247, 0.3);">
          <span class="text-xl">📒</span>
        </div>
        <p class="text-sm font-display font-semibold">Binder</p>
        <p class="text-xs text-muted mt-0.5">{{ playerStore.inventory.length }} kartu</p>
      </router-link>
      <router-link to="/gacha" class="glass-card p-4 text-center group">
        <div class="w-11 h-11 rounded-xl glass-panel flex items-center justify-center mx-auto mb-2.5 group-hover:shadow-glow-sm transition-all duration-300" style="--glow-color: rgba(245, 158, 11, 0.3);">
          <span class="text-xl">🎴</span>
        </div>
        <p class="text-sm font-display font-semibold">Buka Pack</p>
        <p class="text-xs text-muted mt-0.5">100 coin</p>
      </router-link>
      <router-link to="/market" class="glass-card p-4 text-center group">
        <div class="w-11 h-11 rounded-xl glass-panel flex items-center justify-center mx-auto mb-2.5 group-hover:shadow-glow-sm transition-all duration-300" style="--glow-color: rgba(56, 189, 248, 0.3);">
          <span class="text-xl">💎</span>
        </div>
        <p class="text-sm font-display font-semibold">Market</p>
        <p class="text-xs text-muted mt-0.5">Jual & Beli</p>
      </router-link>
      <router-link to="/activities" class="glass-card p-4 text-center group">
        <div class="w-11 h-11 rounded-xl glass-panel flex items-center justify-center mx-auto mb-2.5 group-hover:shadow-glow-sm transition-all duration-300" style="--glow-color: rgba(252, 211, 77, 0.3);">
          <span class="text-xl">🎮</span>
        </div>
        <p class="text-sm font-display font-semibold">Activities</p>
        <p class="text-xs text-muted mt-0.5">Misi & Game</p>
      </router-link>
    </div>

    <!-- Showcase Grid -->
    <div>
      <h2 class="text-sm font-display font-semibold text-secondary mb-3 flex items-center gap-2">
        🌟 Showcase <span class="text-muted font-normal text-xs">{{ playerStore.showcase.length }}/5</span>
      </h2>
      <div v-if="playerStore.showcase.length === 0">
        <div class="glass-panel p-6 text-center text-muted text-sm">
          <div class="w-12 h-12 mx-auto rounded-full glass-panel flex items-center justify-center mb-3">
            <span class="text-xl">📭</span>
          </div>
          <p class="mb-2 text-secondary">Showcase kosong — isi dengan kartu dari Binder!</p>
          <router-link to="/binder" class="text-accent text-xs hover:underline font-display">Buka Binder →</router-link>
        </div>
      </div>
      <div v-else class="grid grid-cols-5 gap-2">
        <div v-for="slot in 5" :key="slot"
          class="aspect-[5/7] rounded-xl !overflow-visible cursor-pointer transition-all duration-300"
          :class="playerStore.showcase[slot - 1]
            ? 'card-frame card-frame-' + playerStore.showcase[slot - 1].rarity.toLowerCase() + ' card-hover'
            : 'border-2 border-dashed border-white/8 hover:border-white/15 flex items-center justify-center'"
          @click="$router.push('/binder')"
        >
          <template v-if="playerStore.showcase[slot - 1]">
            <Card3D
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
              :drop-rate="playerStore.dropRateOf(playerStore.showcase[slot - 1].id)"
              mode="mini"
            />
          </template>
          <template v-else>
            <div class="w-full h-full flex items-center justify-center">
              <span class="text-xl text-white/10">+</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Ulangi panduan onboarding -->
    <div class="text-center mt-6 mb-2">
      <button @click="tour.start()" data-nosound
        class="text-xs text-muted hover:text-secondary font-display inline-flex items-center gap-1.5 transition-colors">
        <span>🧭</span> Ulangi Panduan
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import { useSound } from '@/composables/useSound.js';
import { useTour } from '@/composables/useTour.js';
import CoinDisplay from '@/components/CoinDisplay.vue';
import Card3D from '@/components/Card3D.vue';

const tour = useTour();
const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();
const sound = useSound();

const claiming = ref(false);
const cooldownRemaining = ref(0);
const showBreakdown = ref(false);
const animatedEstimate = ref('0');
let cooldownInterval = null;
let animationFrame = null;

const heroGlowColor = computed(() => {
  const r = playerStore.featuredCard?.rarity;
  return { Common: 'rgba(148, 163, 184, 0.3)', Rare: 'rgba(56, 189, 248, 0.35)', Epic: 'rgba(168, 85, 247, 0.4)', Legendary: 'rgba(245, 158, 11, 0.45)' }[r] || 'rgba(124, 58, 237, 0.2)';
});

// Element icon mapping
function elementIcon(element) {
  const icons = { Fire: '🔥', Water: '💧', Earth: '🌍', Air: '💨', Light: '☀️', Dark: '🌙', Cosmic: '🌌', Shadow: '👤', Nature: '🌿', Electric: '⚡', Normal: '⚪' };
  return icons[element] || '⚪';
}

// Animated counter — smooth count-up pakai requestAnimationFrame
function updateAnimatedEstimate() {
  if (!authStore.user?.lastClaimedAt) {
    animatedEstimate.value = '0';
    animationFrame = requestAnimationFrame(updateAnimatedEstimate);
    return;
  }
  // Konsisten dengan server: likes diakumulasi lalu dikonversi ke coin
  animatedEstimate.value = playerStore.estimatedClaimCoins().toLocaleString('id-ID');
  animationFrame = requestAnimationFrame(updateAnimatedEstimate);
}

async function handleClaim() {
  claiming.value = true;
  try {
    const res = await fetch('/api/claim-idle', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await res.json();
    if (!res.ok) throw data;
    await playerStore.refreshAfterAction();
    if (data.coinsEarned > 0) {
      sound.play('coinBurst');
      toast.success(`+${data.coinsEarned.toLocaleString('id-ID')} coin! (≈ ${data.coinsPerHour}/jam)`);
    } else {
      toast.info(data.message || 'Klaim berhasil.');
    }
  } catch (e) {
    toast.error(e.message || 'Gagal klaim.');
  } finally {
    claiming.value = false;
  }
}

function updateCooldown() {
  if (!authStore.user?.lastClaimedAt) { cooldownRemaining.value = 0; return; }
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(authStore.user.lastClaimedAt).getTime()) / 1000));
  cooldownRemaining.value = Math.max(0, 10 - elapsed);
}

// Periodic sync data user (setiap 60 detik)
let syncInterval = null;

onMounted(async () => {
  await Promise.all([playerStore.fetchMasterCards(), playerStore.fetchInventory(), authStore.fetchMe(), playerStore.fetchDropRates()]);
  updateCooldown();
  cooldownInterval = setInterval(updateCooldown, 1000);
  animationFrame = requestAnimationFrame(updateAnimatedEstimate);
  syncInterval = setInterval(() => authStore.fetchMe(), 60_000);
});

onBeforeUnmount(() => {
  if (cooldownInterval) clearInterval(cooldownInterval);
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (syncInterval) clearInterval(syncInterval);
});
</script>

<style scoped>
.dash-title {
  background: linear-gradient(135deg, #EEEDF2, #8B5CF6, #F88CD4, #8B5CF6, #EEEDF2);
  background-size: 400% 400%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: dash-gradient 6s ease-in-out infinite;
}
@keyframes dash-gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
</style>
