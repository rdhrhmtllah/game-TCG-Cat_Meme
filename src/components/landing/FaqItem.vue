<template>
  <div class="glass-panel rounded-xl overflow-hidden">
    <button @click="open = !open"
      class="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
      <span class="font-display font-semibold text-sm text-white">{{ question }}</span>
      <span class="text-accent transition-transform duration-300 flex-shrink-0"
        :class="open ? 'rotate-45' : ''" style="font-size: 20px; line-height: 1;">+</span>
    </button>
    <Transition name="faq">
      <div v-if="open" class="px-5 pb-4 text-sm text-secondary leading-relaxed font-dm-sans">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
defineProps({ question: { type: String, required: true } });
const open = ref(false);
</script>

<style scoped>
.faq-enter-active, .faq-leave-active { transition: all 0.25s ease; overflow: hidden; }
.faq-enter-from, .faq-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.faq-enter-to, .faq-leave-from { opacity: 1; max-height: 200px; }
</style>
