<template>
  <div class="min-h-screen flex flex-col" style="background: #070B1A;">
    <NavBar v-if="showNav" />
    <main class="flex-1" :class="showNav ? 'pb-24 md:pb-0 md:pt-14' : ''">
      <router-view v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </main>
    <ToastContainer />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import NavBar from '@/components/NavBar.vue';
import ToastContainer from '@/components/ToastContainer.vue';

const route = useRoute();

const showNav = computed(() => {
  const hiddenRoutes = ['/login', '/register'];
  return !hiddenRoutes.includes(route.path) && !route.path.startsWith('/admin');
});
</script>
