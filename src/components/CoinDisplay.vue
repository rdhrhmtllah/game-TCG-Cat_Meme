<template>
  <span
    class="inline-flex items-center gap-1 font-semibold"
    :class="sizeClass"
    :title="fullNumber"
  >
    <span>🪙</span>
    <span>{{ formatted }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  amount: { type: Number, required: true },
  size: { type: String, default: 'md' }, // sm, md, lg
});

const sizeClass = computed(() => ({
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
}[props.size] || 'text-base'));

const fullNumber = computed(() => props.amount.toLocaleString('id-ID'));

const formatted = computed(() => formatNumber(props.amount));

function formatNumber(num) {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
}
</script>
