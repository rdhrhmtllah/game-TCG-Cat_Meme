<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <h1 class="text-xl font-bold mb-2">🎴 Gacha Shop</h1>

    <!-- Coin balance -->
    <div class="flex items-center justify-between mb-4">
      <CoinDisplay :amount="playerStore.coins" size="lg" />
      <span class="text-sm text-gray-500">100 coin / pull</span>
    </div>

    <!-- Onboarding banner -->
    <div
      v-if="!playerStore.hasSeenWelcome"
      class="glass-panel p-4 mb-4 border-purple-500/50 bg-purple-900/20"
    >
      <p class="text-sm">
        🎉 <strong>Selamat datang!</strong> Kamu punya 500 coin — cukup untuk 5x buka pack. Yuk buka pack pertamamu!
      </p>
      <button @click="playerStore.hasSeenWelcome = true" class="text-xs text-purple-400 mt-1 hover:underline">OK, mengerti!</button>
    </div>

    <!-- Camera + Card area -->
    <div class="grid md:grid-cols-2 gap-4 mb-4">
      <!-- Hand Tracker (Camera) -->
      <div class="glass-panel overflow-hidden" style="min-height: 320px;">
        <HandTracker
          v-if="showCamera"
          @gacha-trigger="handleGacha"
          @camera-unavailable="onCameraUnavailable"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-gray-600 text-sm p-4 text-center">
          <p>{{ cameraMessage }}</p>
        </div>
      </div>

      <!-- Card Preview / Reveal -->
      <div class="glass-panel overflow-hidden" style="min-height: 320px;">
        <template v-if="revealedCard">
          <Card3D
            :key="'reveal-' + revealKey"
            :image-url="revealedCard.imageUrl"
            :rarity="revealedCard.rarity"
            mode="full"
            class="w-full h-full"
          />
        </template>
        <template v-else>
          <div class="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
            <span class="text-6xl mb-3">🎴</span>
            <p class="text-sm">Area Preview Kartu</p>
            <p class="text-xs text-gray-600 mt-1">Kartu hasil gacha akan tampil di sini</p>
          </div>
        </template>
      </div>
    </div>

    <!-- Open Pack Button -->
    <button
      @click="handleGacha"
      :disabled="playerStore.coins < 100 || pulling"
      class="btn-primary w-full py-4 text-lg relative overflow-hidden"
    >
      <template v-if="pulling">
        <span class="flex items-center justify-center gap-2">
          <span class="animate-spin">🎴</span>
          Membuka pack...
        </span>
      </template>
      <template v-else-if="playerStore.coins < 100">
        Koin tidak cukup (butuh 100 🪙)
      </template>
      <template v-else>
        🎴 Buka Pack (100 🪙)
      </template>
    </button>

    <!-- Reveal Info -->
    <div v-if="revealedCard" class="mt-4 glass-panel p-6 text-center animate-float">
      <h2 class="text-xl font-bold mb-1">{{ revealedCard.name }}</h2>
      <span class="rarity-badge mb-2" :class="'rarity-' + revealedCard.rarity.toLowerCase()">
        {{ revealedCard.rarity }}
      </span>
      <p class="text-sm text-gray-400 mb-1">{{ revealedCard.description }}</p>
      <div class="flex items-center justify-center gap-4 text-sm mt-3">
        <span>🔥 Hype: {{ revealedCard.hypeScore }}</span>
        <span>⚡ {{ revealedCard.likesPerSec }} likes/detik</span>
      </div>
      <div class="flex gap-2 justify-center mt-4">
        <button @click="revealedCard = null" class="btn-primary">Buka Lagi</button>
        <router-link to="/binder" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors">
          Lihat di Binder 📒
        </router-link>
      </div>
    </div>

    <!-- First pull tooltip -->
    <div v-if="showBinderTip" class="mt-4 p-3 bg-blue-900/30 border border-blue-800 rounded-lg text-sm">
      💡 <strong>Kartu bagus!</strong> Masukkan ke Showcase di Binder supaya kamu mulai dapat koin pasif.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import CoinDisplay from '@/components/CoinDisplay.vue';
import Card3D from '@/components/Card3D.vue';
import HandTracker from '@/components/HandTracker.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();

const pulling = ref(false);
const revealedCard = ref(null);
const revealKey = ref(0);
const showBinderTip = ref(false);
const pullCount = ref(0);
const showCamera = ref(true);
const cameraMessage = ref('');

function onCameraUnavailable() {
  // Kamera opsional — tombol tap tetap berfungsi
  // Kita tetap tampilkan area tapi dengan pesan fallback
  cameraMessage.value = '📷 Kamera tidak tersedia.\nGunakan tombol di bawah untuk buka pack!';
  // Tetap keep showCamera = true untuk HandTracker yang akan emit camera-unavailable
}

async function handleGacha() {
  if (playerStore.coins < 100 || pulling.value) return;

  pulling.value = true;

  try {
    const res = await fetch('/api/gacha', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await res.json();

    if (!res.ok) {
      // Tampilkan error
      console.error('Gacha error:', data.code, data.message);
      pulling.value = false;
      return;
    }

    // Trigger confetti untuk kartu Epic/Legendary
    if (data.cardDrawn.rarity === 'Epic' || data.cardDrawn.rarity === 'Legendary') {
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: data.cardDrawn.rarity === 'Legendary' ? 150 : 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: data.cardDrawn.rarity === 'Legendary'
            ? ['#FBBF24', '#FCD34D', '#F59E0B', '#D97706']
            : ['#A78BFA', '#C4B5FD', '#8B5CF6', '#7C3AED'],
        });
      } catch (e) {
        // confetti opsional
      }
    }

    revealedCard.value = data.cardDrawn;
    revealKey.value++;
    pullCount.value++;

    // Show binder tip after first pull
    if (pullCount.value === 1 && !playerStore.hasSeenWelcome) {
      showBinderTip.value = true;
    }

    await playerStore.refreshAfterAction();
  } catch (e) {
    console.error('Gacha failed:', e);
  } finally {
    pulling.value = false;
  }
}

onMounted(async () => {
  await authStore.fetchMe();
});
</script>
