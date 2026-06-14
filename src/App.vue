<template>
  <div class="min-h-screen flex flex-col bg-gray-950">
    <NavBar v-if="showNav" />
    <main class="flex-1 pb-16 md:pb-0">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import NavBar from '@/components/NavBar.vue';

const route = useRoute();

// Hide NavBar on auth pages and admin
const showNav = computed(() => {
  const hiddenRoutes = ['/login', '/register', '/admin'];
  return !hiddenRoutes.includes(route.path);
});
</script>
