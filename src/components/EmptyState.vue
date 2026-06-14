<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div class="text-6xl mb-4" v-if="icon">{{ icon }}</div>
    <h3 class="text-lg font-semibold text-text-secondary mb-2">{{ title }}</h3>
    <p class="text-text-muted text-sm max-w-xs mb-6">{{ message }}</p>
    <router-link v-if="ctaLabel && ctaTo" :to="ctaTo" class="btn-primary text-sm">
      {{ ctaLabel }}
    </router-link>
    <button v-else-if="ctaLabel && ctaAction" @click="ctaAction" class="btn-primary text-sm">
      {{ ctaLabel }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '📭' },
  title: { type: String, default: 'Kosong' },
  message: { type: String, default: 'Belum ada data di sini.' },
  ctaLabel: { type: String, default: '' },
  ctaTo: { type: String, default: '' },
  ctaAction: { type: Function, default: null },
});
</script>
