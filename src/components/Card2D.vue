<template>
  <div class="card-2d-wrapper aspect-[5/7] rounded-xl relative overflow-hidden group transition-all duration-200 shadow-md bg-[#090e1a]"
    :class="[
      owned ? 'opacity-100' : 'opacity-40 grayscale'
    ]">
    
    <!-- Canvas container where cardRenderer output will be appended -->
    <div ref="canvasContainerRef" class="w-full h-full pointer-events-none"></div>

    <!-- Hover shine reflection overlay -->
    <div class="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none mix-blend-color-dodge bg-gradient-to-tr from-cyan-400 via-purple-500 to-amber-300 z-10"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { drawCardCanvas } from '@/utils/cardRenderer.js';

const props = defineProps({
  imageUrl: { type: String, default: '' },
  rarity: { type: String, default: 'Common' },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  hypeScore: { type: [Number, String], default: 0 },
  likesPerSec: { type: [Number, String], default: 0 },
  element: { type: String, default: 'Normal' },
  foilStyle: { type: String, default: 'Standard' },
  imgZoom: { type: [Number, String], default: 1 },
  imgOffsetX: { type: [Number, String], default: 0 },
  imgOffsetY: { type: [Number, String], default: 0 },
  owned: { type: Boolean, default: true },
  dropRate: { type: [Number, String], default: null }
});

const canvasContainerRef = ref(null);
let loadedImg = null;
let currentUrl = '';

function draw(img) {
  const cardData = {
    name: props.name,
    description: props.description,
    rarity: props.rarity,
    hypeScore: parseFloat(props.hypeScore) || 0,
    likesPerSec: parseFloat(props.likesPerSec) || 0,
    element: props.element || 'Normal',
    foilStyle: props.foilStyle || 'Standard',
    imgZoom: parseFloat(props.imgZoom) || 1.0,
    imgOffsetX: parseFloat(props.imgOffsetX) || 0.0,
    imgOffsetY: parseFloat(props.imgOffsetY) || 0.0,
    dropRate: (props.dropRate === null || props.dropRate === '') ? null : parseFloat(props.dropRate),
    hideStats: true
  };

  const canvas = drawCardCanvas(cardData, img);
  if (canvasContainerRef.value) {
    canvasContainerRef.value.innerHTML = '';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvasContainerRef.value.appendChild(canvas);
  }
}

function render() {
  if (loadedImg && currentUrl === props.imageUrl) {
    draw(loadedImg);
    return;
  }

  // Draw placeholder layout first (so user sees card structure instantly)
  draw(null);

  if (props.imageUrl) {
    currentUrl = props.imageUrl;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = props.imageUrl;
    img.onload = () => {
      if (currentUrl === props.imageUrl) {
        loadedImg = img;
        draw(img);
      }
    };
  }
}

onMounted(() => {
  render();
});

watch(() => [
  props.imageUrl,
  props.rarity,
  props.name,
  props.description,
  props.hypeScore,
  props.likesPerSec,
  props.element,
  props.foilStyle,
  props.imgZoom,
  props.imgOffsetX,
  props.imgOffsetY,
  props.dropRate
], () => {
  render();
}, { deep: true });
</script>

<style scoped>
.card-2d-wrapper {
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}
</style>
