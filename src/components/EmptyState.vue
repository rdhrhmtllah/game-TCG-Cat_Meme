<template>
  <div class="flex flex-col items-center justify-center text-center py-8 px-4 animate-fade-in">
    <!-- Icon with glow container -->
    <div class="relative mb-5">
      <div class="w-20 h-20 rounded-2xl glass-panel flex items-center justify-center animate-float">
        <span class="text-4xl">{{ icon || '📭' }}</span>
      </div>
      <!-- Subtle glow beneath -->
      <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full blur-lg opacity-20"
        style="background: rgba(124, 58, 237, 0.5);"></div>
    </div>

    <h3 v-if="title" class="text-base font-display font-bold text-primary mb-1">{{ title }}</h3>
    <p v-if="message" class="text-sm text-secondary max-w-xs mb-5 leading-relaxed">{{ message }}</p>

    <slot>
      <router-link v-if="ctaTo" :to="ctaTo" class="btn-primary text-sm font-display px-6">
        {{ ctaLabel || 'Lanjut' }}
      </router-link>
    </slot>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '📭' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  ctaTo: { type: String, default: '' },
  ctaLabel: { type: String, default: '' },
});
</script>
