<template>
  <!-- Mobile: bottom nav bar -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-gray-800 rounded-none">
    <div class="flex justify-around items-center h-16 px-2">
      <router-link
        v-for="item in menuItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-gray-400 hover:text-white transition-colors"
        active-class="text-purple-400 !text-purple-400"
      >
        <span class="text-xl">{{ item.icon }}</span>
        <span class="text-xs font-medium">{{ item.label }}</span>
      </router-link>
      <button
        @click="handleLogout"
        class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
        title="Logout"
      >
        <span class="text-xl">🚪</span>
        <span class="text-xs font-medium">Logout</span>
      </button>
    </div>
  </nav>

  <!-- Desktop: top nav bar -->
  <nav class="hidden md:flex fixed top-0 left-0 right-0 z-50 glass-panel border-b border-gray-800 rounded-none h-14">
    <div class="flex items-center justify-between w-full max-w-6xl mx-auto px-4">
      <router-link to="/" class="text-lg font-bold text-purple-400 flex items-center gap-2">
        🐱 MemeCats
      </router-link>
      <div class="flex items-center gap-1">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          active-class="text-purple-400 bg-gray-800/50"
        >
          {{ item.icon }} {{ item.label }}
        </router-link>
        <button
          @click="handleLogout"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors ml-2"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();

const menuItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/binder', label: 'Binder', icon: '📒' },
  { to: '/gacha', label: 'Gacha', icon: '🎴' },
  { to: '/market', label: 'Market', icon: '💎' },
];

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
