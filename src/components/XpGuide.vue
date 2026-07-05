<template>
  <div>
    <button @click="open = !open" data-nosound
      class="flex items-center gap-1.5 text-[11px] font-display font-bold text-muted hover:text-secondary transition-colors mb-2.5">
      <span class="inline-block w-3">{{ open ? '▼' : '▶' }}</span>
      💡 Dari mana XP didapat?
    </button>
    <div v-if="open" class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-fade-in">
      <div v-for="s in sources" :key="s.label"
        class="flex items-center gap-2.5 glass-panel rounded-lg px-3 py-2">
        <span class="text-base flex-shrink-0">{{ s.icon }}</span>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-display text-secondary truncate leading-tight">{{ s.label }}</p>
          <p class="text-[9px] text-muted font-display leading-tight mt-0.5">di menu {{ s.where }}</p>
        </div>
        <span class="text-xs font-display font-bold text-accent-soft tabular-nums flex-shrink-0">+{{ s.xp }} XP</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { XP_SOURCES } from '@/utils/progression.js';

const props = defineProps({
  sources: { type: Array, default: () => XP_SOURCES },
  defaultOpen: { type: Boolean, default: true },
});
const open = ref(props.defaultOpen);
</script>
