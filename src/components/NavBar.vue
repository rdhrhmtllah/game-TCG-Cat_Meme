<template>
  <!-- Mobile: bottom nav bar -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
    <div class="mx-2 mb-2 rounded-2xl overflow-hidden"
      style="background: rgba(12, 20, 40, 0.88); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.04);">
      <div class="flex justify-around items-center h-16 px-1">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-muted hover:text-secondary transition-all relative"
          active-class="!text-accent"
        >
          <IconBase :name="item.icon" :size="20" />
          <span class="text-[10px] font-display font-medium leading-none">{{ item.label }}</span>
          <!-- Active glow dot -->
          <span class="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full opacity-0 transition-opacity shadow-glow-sm router-link-active:opacity-100" style="--glow-color: rgba(124, 58, 237, 0.6);" />
        </router-link>

        <button
          @click="handleLogout"
          class="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-muted hover:text-red-400 transition-all"
          title="Logout"
        >
          <IconBase name="logout" :size="20" />
          <span class="text-[10px] font-display font-medium leading-none">Logout</span>
        </button>
      </div>
    </div>
  </nav>

  <!-- Desktop: top nav bar -->
  <nav class="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14"
    style="background: rgba(12, 20, 40, 0.88); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3), inset 0 -1px 0 rgba(255,255,255,0.03);">
    <div class="flex items-center justify-between w-full max-w-6xl mx-auto px-6">
      <router-link to="/" class="flex items-center gap-2.5 group">
        <div class="w-8 h-8 rounded-lg glass-panel flex items-center justify-center group-hover:shadow-glow-sm transition-shadow" style="--glow-color: rgba(124, 58, 237, 0.4);">
          <span class="text-base">🐱</span>
        </div>
        <span class="text-lg font-display font-bold bg-gradient-to-r from-accent to-accent-soft bg-clip-text text-transparent">MemeCats</span>
      </router-link>
      <div class="flex items-center gap-1">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-display font-medium text-muted hover:text-secondary hover:bg-white/5 transition-all relative"
          active-class="!text-accent !bg-accent/8"
        >
          <IconBase :name="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </router-link>
        <div class="w-px h-6 bg-white/8 mx-1.5"></div>
        <button
          @click="handleLogout"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-display font-medium text-muted hover:text-red-400 hover:bg-red-500/5 transition-all"
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
  { to: '/activities', label: 'Activities', icon: 'activities' },
];

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
