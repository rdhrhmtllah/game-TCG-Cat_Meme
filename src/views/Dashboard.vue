<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold">Dashboard</h1>
        <p class="text-gray-400 text-sm">{{ authStore.user?.username }}</p>
      </div>
      <CoinDisplay :amount="playerStore.coins" size="lg" />
    </div>

    <!-- Card Dex Progress -->
    <div class="glass-panel p-4 mb-4">
      <div class="flex justify-between text-sm mb-2">
        <span class="text-gray-400">📚 Card Dex</span>
        <span class="text-gray-300">{{ playerStore.totalCardsOwned }} / {{ playerStore.totalCardsInGame }} ({{ playerStore.dexProgress }}%)</span>
      </div>
      <div class="w-full bg-gray-800 rounded-full h-2">
        <div
          class="bg-purple-500 h-2 rounded-full transition-all duration-500"
          :style="{ width: playerStore.dexProgress + '%' }"
        ></div>
      </div>
    </div>

    <!-- Claim Idle -->
    <div class="glass-panel p-4 mb-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-400">💰 Yield Pasif</p>
          <p class="text-lg font-bold text-green-400">{{ idleEstimate }} coin</p>
          <p class="text-xs text-gray-500">{{ playerStore.totalLikesPerSec.toFixed(1) }} likes/detik dari showcase</p>
        </div>
        <button
          @click="handleClaim"
          :disabled="cooldownRemaining > 0 || claiming"
          class="btn-primary"
        >
          <template v-if="claiming">Klaim...</template>
          <template v-else-if="cooldownRemaining > 0">{{ cooldownRemaining }}s</template>
          <template v-else>Klaim!</template>
        </button>
      </div>
    </div>

    <!-- Showcase Slots -->
    <div class="mb-4">
      <h2 class="text-lg font-semibold mb-3">🌟 Showcase ({{ playerStore.showcase.length }}/5)</h2>
      <div v-if="playerStore.showcase.length === 0">
        <EmptyState
          icon="🌟"
          title="Showcase kosong"
          message="Isi showcase dengan kartu dari Binder untuk mulai menghasilkan koin pasif!"
          cta-label="Buka Binder"
          cta-to="/binder"
        />
      </div>
      <div v-else class="grid grid-cols-5 gap-2">
        <div
          v-for="slot in 5"
          :key="slot"
          class="aspect-[5/7] rounded-lg border-2 flex items-center justify-center"
          :class="playerStore.showcase[slot - 1]
            ? 'border-purple-500/50 bg-gray-800 cursor-pointer hover:border-purple-400'
            : 'border-dashed border-gray-700 bg-gray-900 cursor-pointer hover:border-gray-500'"
          @click="$router.push('/binder')"
        >
          <template v-if="playerStore.showcase[slot - 1]">
            <Card3D
              :image-url="playerStore.showcase[slot - 1].imageUrl"
              :rarity="playerStore.showcase[slot - 1].rarity"
              mode="mini"
              class="w-full h-full"
            />
          </template>
          <template v-else>
            <span class="text-2xl text-gray-600">+</span>
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
import CoinDisplay from '@/components/CoinDisplay.vue';
import EmptyState from '@/components/EmptyState.vue';
import Card3D from '@/components/Card3D.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();

const claiming = ref(false);
const cooldownRemaining = ref(0);
let cooldownInterval = null;

const idleEstimate = computed(() => {
  if (!authStore.user?.lastClaimedAt) return 0;
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(authStore.user.lastClaimedAt).getTime()) / 1000));
  const capped = Math.min(elapsed, 43200);
  const earned = Math.floor(capped * playerStore.totalLikesPerSec);
  return earned.toLocaleString('id-ID');
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
    // Show toast (implemented later with toast system)
  } catch (e) {
    console.error('Claim failed:', e);
  } finally {
    claiming.value = false;
  }
}

function updateCooldown() {
  if (!authStore.user?.lastClaimedAt) {
    cooldownRemaining.value = 0;
    return;
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(authStore.user.lastClaimedAt).getTime()) / 1000));
  cooldownRemaining.value = Math.max(0, 10 - elapsed);
}

onMounted(async () => {
  await Promise.all([
    playerStore.fetchMasterCards(),
    playerStore.fetchInventory(),
    authStore.fetchMe(),
  ]);
  updateCooldown();
  cooldownInterval = setInterval(updateCooldown, 1000);
});

onBeforeUnmount(() => {
  if (cooldownInterval) clearInterval(cooldownInterval);
});
</script>
