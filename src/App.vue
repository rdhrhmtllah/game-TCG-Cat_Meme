<template>
  <div class="min-h-screen flex flex-col" style="background: #050816;">
    <NavBar v-if="showNav" />
    <main class="flex-1" :class="showNav ? 'pb-24 md:pb-0 md:pt-14' : ''">
      <router-view v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </main>
    <ToastContainer />
    <TourOverlay />
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import NavBar from '@/components/NavBar.vue';
import ToastContainer from '@/components/ToastContainer.vue';
import TourOverlay from '@/components/tour/TourOverlay.vue';
import { useSound } from '@/composables/useSound.js';
import { useAuthStore } from '@/stores/auth.js';
import { useTour } from '@/composables/useTour.js';

const route = useRoute();
const sound = useSound();
const authStore = useAuthStore();
const tour = useTour();

// Auto-start tour utk user baru saat tiba di Home (setelah user termuat)
watch(
  () => [route.path, authStore.user?.hasSeenTour],
  () => {
    if (route.path === '/app' && authStore.user && authStore.user.hasSeenTour === false) {
      tour.maybeAutoStart();
    }
  },
  { immediate: true }
);

const showNav = computed(() => {
  // Landing '/' punya header sendiri; login/register/admin tanpa NavBar app
  const hiddenRoutes = ['/', '/login', '/register'];
  return !hiddenRoutes.includes(route.path) && !route.path.startsWith('/admin');
});

// SFX klik global via event delegation (semua <button> non-disabled)
function onGlobalClick(e) {
  const btn = e.target.closest('button, [role="button"], .glass-tab, .glass-chip');
  if (btn && !btn.disabled && !btn.dataset.nosound) sound.play('click');
}
onMounted(() => document.addEventListener('pointerdown', onGlobalClick, { passive: true }));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onGlobalClick));
</script>
