<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div class="text-6xl mb-4" v-if="icon">{{ icon }}</div>
    <h3 class="text-lg font-semibold text-gray-300 mb-2">{{ title }}</h3>
    <p class="text-gray-500 text-sm max-w-xs mb-6">{{ message }}</p>
    <button
      v-if="ctaLabel && ctaTo"
      @click="$router.push(ctaTo)"
      class="btn-primary"
    >
      {{ ctaLabel }}
    </button>
    <button
      v-else-if="ctaLabel && ctaAction"
      @click="ctaAction"
      class="btn-primary"
    >
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
