<template>
  <div class="max-w-xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">MemeCats</h1>
        <p class="text-text-muted text-sm">{{ authStore.user?.username }}</p>
      </div>
      <CoinDisplay :amount="playerStore.coins" size="lg" />
    </div>

    <!-- Hero Card -->
    <div class="mb-6 rounded-2xl overflow-hidden" style="height: 340px;">
      <Card3D
        v-if="playerStore.featuredCard"
        :key="'hero-' + playerStore.featuredCard.cardId"
        :image-url="playerStore.featuredCard.imageUrl"
        :rarity="playerStore.featuredCard.rarity"
        mode="full"
        class="w-full h-full"
      />
      <div v-else class="w-full h-full glass-panel flex flex-col items-center justify-center text-center p-6">
        <span class="text-6xl mb-4">🌟</span>
        <h3 class="text-lg font-semibold mb-2">Mulai Koleksimu!</h3>
        <p class="text-text-muted text-sm mb-4">Buka pack pertamamu dan tampilkan kartu terbaik di showcase.</p>
        <router-link to="/gacha" class="btn-primary text-sm">🎴 Buka Pack</router-link>
      </div>
    </div>
    <!-- Hero card label -->
    <div v-if="playerStore.featuredCard" class="text-center -mt-2 mb-6">
      <p class="font-semibold">{{ playerStore.featuredCard.name }}</p>
      <span class="rarity-badge" :class="'rarity-' + playerStore.featuredCard.rarity.toLowerCase()">
        {{ playerStore.featuredCard.rarity }}
      </span>
    </div>

    <!-- Collection Progress -->
    <div class="glass-panel p-4 mb-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-text-secondary">📚 Card Dex</span>
        <span class="text-sm font-semibold">
          {{ playerStore.totalCardsOwned }}<span class="text-text-muted">/{{ playerStore.totalCardsInGame }}</span>
        </span>
      </div>
      <div class="w-full h-2.5 bg-surface rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-accent via-epic to-legendary rounded-full transition-all duration-700"
          :style="{ width: playerStore.dexProgress + '%' }" />
      </div>
      <p class="text-xs text-text-muted mt-1.5">{{ playerStore.dexProgress }}% koleksi terlengkapi</p>
    </div>

    <!-- Idle Economy -->
    <div class="glass-panel p-4 mb-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-text-muted flex items-center gap-1">
            <span>⚡</span> Yield Pasif
          </p>
          <p class="text-lg font-bold text-emerald-400">{{ idleEstimate }} coin</p>
          <p class="text-xs text-text-muted">{{ playerStore.totalLikesPerSec.toFixed(1) }} likes/detik</p>
        </div>
        <button
          @click="handleClaim"
          :disabled="cooldownRemaining > 0 || claiming"
          class="btn-primary relative"
          :class="{ 'animate-pulse-glow !shadow-accent/50': cooldownRemaining === 0 && playerStore.totalLikesPerSec > 0 }"
        >
          <template v-if="claiming">Klaim...</template>
          <template v-else-if="cooldownRemaining > 0">⏳ {{ cooldownRemaining }}s</template>
          <template v-else>💰 Klaim</template>
        </button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      <router-link to="/binder" class="glass-panel p-4 text-center card-hover">
        <p class="text-2xl mb-1">📒</p>
        <p class="text-sm font-medium">Binder</p>
        <p class="text-xs text-text-muted">{{ playerStore.inventory.length }} kartu</p>
      </router-link>
      <router-link to="/gacha" class="glass-panel p-4 text-center card-hover">
        <p class="text-2xl mb-1">🎴</p>
        <p class="text-sm font-medium">Buka Pack</p>
        <p class="text-xs text-text-muted">100 coin</p>
      </router-link>
      <router-link to="/market" class="glass-panel p-4 text-center card-hover">
        <p class="text-2xl mb-1">💎</p>
        <p class="text-sm font-medium">Market</p>
        <p class="text-xs text-text-muted">Jual & Beli</p>
      </router-link>
      <div class="glass-panel p-4 text-center card-hover cursor-pointer" @click="$router.push('/binder')">
        <p class="text-2xl mb-1">⭐</p>
        <p class="text-sm font-medium">Showcase</p>
        <p class="text-xs text-text-muted">{{ playerStore.showcase.length }}/5 slot</p>
      </div>
    </div>

    <!-- Showcase Grid -->
    <div>
      <h2 class="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
        🌟 Showcase <span class="text-text-muted font-normal">{{ playerStore.showcase.length }}/5</span>
      </h2>
      <div v-if="playerStore.showcase.length === 0">
        <div class="glass-panel p-6 text-center text-text-muted text-sm">
          <p class="mb-2">Showcase kosong — isi dengan kartu dari Binder!</p>
          <router-link to="/binder" class="text-accent text-xs hover:underline">Buka Binder →</router-link>
        </div>
      </div>
      <div v-else class="grid grid-cols-5 gap-2">
        <div v-for="slot in 5" :key="slot"
          class="aspect-[5/7] rounded-xl border-2 flex items-center justify-center overflow-hidden cursor-pointer"
          :class="playerStore.showcase[slot - 1]
            ? 'border-accent/50 card-hover'
            : 'border-dashed border-gray-700 hover:border-gray-500'"
          @click="$router.push('/binder')"
        >
          <template v-if="playerStore.showcase[slot - 1]">
            <Card3D
              :image-url="playerStore.showcase[slot - 1].imageUrl"
              :rarity="playerStore.showcase[slot - 1].rarity"
              mode="mini"
            />
          </template>
          <template v-else>
            <span class="text-2xl text-gray-700">+</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import CoinDisplay from '@/components/CoinDisplay.vue';
import Card3D from '@/components/Card3D.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();

const claiming = ref(false);
const cooldownRemaining = ref(0);
let cooldownInterval = null;

const idleEstimate = computed(() => {
  if (!authStore.user?.lastClaimedAt) return '0';
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(authStore.user.lastClaimedAt).getTime()) / 1000));
  return Math.floor(Math.min(elapsed, 43200) * playerStore.totalLikesPerSec).toLocaleString('id-ID');
});

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
    if (data.coinsEarned > 0) toast.success(`+${data.coinsEarned.toLocaleString('id-ID')} coin!`);
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

onMounted(async () => {
  await Promise.all([playerStore.fetchMasterCards(), playerStore.fetchInventory(), authStore.fetchMe()]);
  updateCooldown();
  cooldownInterval = setInterval(updateCooldown, 1000);
});

onBeforeUnmount(() => { if (cooldownInterval) clearInterval(cooldownInterval); });
</script>
