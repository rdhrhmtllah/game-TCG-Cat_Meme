<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <NavBar v-if="showNav" />
    <main class="flex-1 pb-20 md:pb-0 md:pt-14">
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
  const hiddenRoutes = ['/login', '/register', '/admin'];
  return !hiddenRoutes.includes(route.path);
});
</script>
