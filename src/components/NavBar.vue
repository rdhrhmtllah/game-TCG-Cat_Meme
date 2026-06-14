<template>
  <!-- Mobile: bottom nav bar -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated/95 backdrop-blur-md border-t border-white/10 safe-bottom">
    <div class="flex justify-around items-center h-16 px-1">
      <router-link
        v-for="item in menuItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-muted hover:text-secondary transition-colors relative min-w-[48px]"
        active-class="!text-accent"
      >
        <IconBase :name="item.icon" :size="20" />
        <span class="text-[10px] font-medium leading-none">{{ item.label }}</span>
        <!-- Active indicator bar -->
        <span class="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent rounded-full opacity-0 transition-opacity router-link-active:opacity-100" />
      </router-link>

      <button
        @click="handleLogout"
        class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-muted hover:text-red-400 transition-colors min-w-[48px]"
        title="Logout"
      >
        <IconBase name="logout" :size="20" />
        <span class="text-[10px] font-medium leading-none">Logout</span>
      </button>
    </div>
  </nav>

  <!-- Desktop: top nav bar -->
  <nav class="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-surface-elevated/95 backdrop-blur-md border-b border-white/10 h-14">
    <div class="flex items-center justify-between w-full max-w-6xl mx-auto px-4">
      <router-link to="/" class="text-lg font-bold text-accent flex items-center gap-2">
        <span class="text-xl">🐱</span>
        <span>MemeCats</span>
      </router-link>
      <div class="flex items-center gap-0.5">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-secondary hover:bg-white/5 transition-all"
          active-class="!text-accent !bg-accent/10"
        >
          <IconBase :name="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </router-link>
        <button
          @click="handleLogout"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-red-400 hover:bg-white/5 transition-all ml-2"
        >
          <IconBase name="logout" :size="18" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import IconBase from '@/components/IconBase.vue';

const router = useRouter();
const authStore = useAuthStore();

const menuItems = [
  { to: '/', label: 'Home', icon: 'dashboard' },
  { to: '/binder', label: 'Binder', icon: 'binder' },
  { to: '/gacha', label: 'Gacha', icon: 'gacha' },
  { to: '/market', label: 'Market', icon: 'market' },
];

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
