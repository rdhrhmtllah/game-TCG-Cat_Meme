<template>
  <div class="max-w-lg mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">🎴 Pack Shop</h1>
      <CoinDisplay :amount="playerStore.coins" size="lg" />
    </div>

    <!-- Onboarding -->
    <div v-if="!playerStore.hasSeenWelcome && step === 'idle'"
      class="glass-panel p-4 mb-4 border-accent/50 bg-accent/10 text-sm">
      <strong>🎉 Selamat datang!</strong> Kamu punya 500 coin — cukup untuk 5x buka pack. Yuk buka pack pertamamu!
      <button @click="playerStore.hasSeenWelcome = true" class="block text-accent text-xs mt-1 hover:underline">OK!</button>
    </div>

    <!-- STEP: Idle / Pack Selection -->
    <template v-if="step === 'idle'">
      <div class="glass-panel p-4 mb-4" style="min-height: 360px;">
        <GachaPack ref="packRef" :shaking="false" :tearing="false" />
      </div>
      <p class="text-center text-muted text-sm mb-4">Drag pack untuk melihat-lihat. 1 Pack = 100 🪙</p>
      <button @click="startOpening" :disabled="playerStore.coins < 100"
        class="btn-primary w-full py-4 text-lg">
        <template v-if="playerStore.coins < 100">Koin tidak cukup (100 🪙)</template>
        <template v-else>🎴 Buka Pack — 100 🪙</template>
      </button>
    </template>

    <!-- STEP: Shake (manipulate pack) -->
    <template v-if="step === 'shake'">
      <div class="glass-panel p-4 mb-4" style="min-height: 360px;">
        <GachaPack ref="packRef" :shaking="true" :tearing="false" />
      </div>
      <p class="text-center text-accent text-sm font-medium animate-pulse mb-2">
        ✨ Cubit atau tap untuk membuka!
      </p>
      <div class="flex gap-2">
        <button @click="tearOpen" class="btn-primary flex-1 py-4 text-lg">
          ✨ Buka Sekarang!
        </button>
      </div>
    </template>

    <!-- STEP: Tearing + Reveal -->
    <template v-if="step === 'tearing' || step === 'reveal'">
      <!-- Tear animation or Card reveal -->
      <div class="glass-panel p-4 mb-4 flex items-center justify-center" style="min-height: 400px;">
        <template v-if="step === 'tearing'">
          <div class="text-center">
            <span class="text-6xl animate-sparkle">✨</span>
            <p class="text-accent text-lg font-bold animate-pulse mt-2">Membuka pack...</p>
          </div>
        </template>
        <template v-if="step === 'reveal' && revealedCard">
          <Card3D
            :key="'reveal-' + revealKey"
            :image-url="revealedCard.imageUrl"
            :rarity="revealedCard.rarity"
            mode="full"
            class="w-full"
            style="height: 380px;"
          />
        </template>
      </div>

      <!-- Reveal info -->
      <div v-if="step === 'reveal' && revealedCard" class="glass-panel p-6 text-center animate-scale-in">
        <h2 class="text-2xl font-bold mb-1">{{ revealedCard.name }}</h2>
        <span class="rarity-badge mb-3" :class="'rarity-' + revealedCard.rarity.toLowerCase()">
          {{ revealedCard.rarity }}
        </span>
        <p class="text-secondary text-sm mb-4">{{ revealedCard.description }}</p>
        <div class="flex items-center justify-center gap-4 text-sm mb-4">
          <span class="glass-panel px-3 py-1.5">🔥 Hype {{ revealedCard.hypeScore }}</span>
          <span class="glass-panel px-3 py-1.5">⚡ {{ revealedCard.likesPerSec }}/detik</span>
        </div>
        <div class="flex gap-2 justify-center">
          <button @click="resetToIdle" class="btn-primary">Buka Lagi</button>
          <router-link to="/binder" class="btn-secondary">Lihat Binder 📒</router-link>
        </div>
      </div>
    </template>

    <!-- First pull tip -->
    <div v-if="showBinderTip" class="mt-4 p-3 glass-panel border-accent/30 text-sm">
      💡 <strong>Kartu bagus!</strong> Masukkan ke Showcase di Binder supaya mulai dapat koin pasif.
    </div>

    <!-- Coin not enough banner -->
    <div v-if="playerStore.coins < 100 && step === 'idle'"
      class="mt-4 p-3 glass-panel border-red-500/30 text-sm text-secondary text-center">
      Koin tidak cukup. Claim koin pasif dari Dashboard atau jual kartu duplikat di Market!
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import CoinDisplay from '@/components/CoinDisplay.vue';
import Card3D from '@/components/Card3D.vue';
import GachaPack from '@/components/GachaPack.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();

const step = ref('idle'); // idle → shake → tearing → reveal → idle
const revealedCard = ref(null);
const revealKey = ref(0);
const showBinderTip = ref(false);
const pullCount = ref(0);
const packRef = ref(null);

function startOpening() {
  if (playerStore.coins < 100) return;
  step.value = 'shake';
  // Auto-advance to tear after 3s if user doesn't interact
  setTimeout(() => {
    if (step.value === 'shake') tearOpen();
  }, 5000);
}

async function tearOpen() {
  step.value = 'tearing';

  // API call during tear animation
  try {
    const res = await fetch('/api/gacha', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await res.json();

    // Brief pause for tear animation
    await new Promise(r => setTimeout(r, 1200));

    if (!res.ok) {
      toast.error(data.message || 'Gagal membuka pack.');
      resetToIdle();
      return;
    }

    revealedCard.value = data.cardDrawn;
    revealKey.value++;
    step.value = 'reveal';
    pullCount.value++;

    // Confetti for rare pulls
    if (data.cardDrawn.rarity === 'Epic' || data.cardDrawn.rarity === 'Legendary') {
      try {
        const confetti = (await import('canvas-confetti')).default;
        const isLegendary = data.cardDrawn.rarity === 'Legendary';
        const colors = isLegendary
          ? ['#FBBF24', '#FCD34D', '#F59E0B', '#D97706', '#B45309']
          : ['#A78BFA', '#C4B5FD', '#8B5CF6', '#7C3AED', '#5B21B6'];

        confetti({ particleCount: isLegendary ? 200 : 100, spread: 80, origin: { y: 0.5 }, colors });
        if (isLegendary) {
          setTimeout(() => confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors }), 600);
          setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { y: 0.5 }, colors }), 1200);
        }
      } catch (e) { /* optional */ }
    }

    if (pullCount.value === 1 && !playerStore.hasSeenWelcome) showBinderTip.value = true;
    await playerStore.refreshAfterAction();
  } catch (e) {
    toast.error('Gagal membuka pack. Coba lagi.');
    resetToIdle();
  }
}

function resetToIdle() {
  step.value = 'idle';
  revealedCard.value = null;
}

onMounted(async () => {
  await authStore.fetchMe();
});
</script>
