<template>
  <div
    v-for="i in count"
    :key="i"
    class="skeleton-item"
    :style="skeletonStyle"
  >
    <div class="animate-shimmer bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded-lg w-full h-full" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: { type: String, default: 'rect' }, // 'card' | 'text' | 'rect' | 'circle'
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  count: { type: Number, default: 1 },
});

const skeletonStyle = computed(() => {
  const base = {};
  switch (props.type) {
    case 'card':
      base.aspectRatio = '5/7';
      base.width = props.width || '100%';
      break;
    case 'text':
      base.width = props.width || '100%';
      base.height = props.height || '1rem';
      base.marginBottom = '0.5rem';
      break;
    case 'circle':
      base.width = props.width || '3rem';
      base.height = props.height || '3rem';
      base.borderRadius = '50%';
      break;
    case 'rect':
    default:
      base.width = props.width || '100%';
      base.height = props.height || '4rem';
      break;
  }
  if (props.width && props.type !== 'card' && props.type !== 'circle') base.width = props.width;
  if (props.height) base.height = props.height;
  return base;
});
</script>
