<template>
  <div ref="containerRef" class="w-full h-full relative cursor-grab active:cursor-grabbing"
    @mousedown="onDragStart" @mousemove="onDragMove" @mouseup="onDragEnd" @mouseleave="onDragEnd"
    @touchstart.prevent="onTouchStart" @touchmove.prevent="onTouchMove" @touchend="onDragEnd"
  >
    <!-- Screen flash for tear -->
    <div
      v-if="tearing"
      class="absolute inset-0 z-20 bg-white animate-pulse pointer-events-none"
      :style="{ animationDuration: '0.3s', opacity: flashOpacity }"
    />
    <!-- Sparkle burst on tear -->
    <div v-if="tearing" class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
      <span
        v-for="i in 12"
        :key="i"
        class="absolute text-lg animate-sparkle"
        :style="{
          left: 30 + Math.random() * 40 + '%',
          top: 30 + Math.random() * 40 + '%',
          animationDelay: (i * 0.05) + 's',
          color: ['#FBBF24','#A78BFA','#60A5FA','#FCD34D'][i % 4],
        }"
      >✦</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';

const props = defineProps({
  tearing: { type: Boolean, default: false },
  shaking: { type: Boolean, default: false },
});

const emit = defineEmits(['tear-complete']);

const containerRef = ref(null);
const flashOpacity = ref(0);

let scene, camera, renderer, packGroup, packTopHalf, packBottomHalf;
let animationId = null;
let isDragging = false;
let prevMouse = { x: 0, y: 0 };
let rotationVelocity = { x: 0, y: 0 };
let packRotation = { x: 0, y: 0 };
let tearProgress = 0;
let shakeIntensity = 0;

// Pack texture generation
function createPackTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, size);
  bgGrad.addColorStop(0, '#2d1b69');
  bgGrad.addColorStop(0.5, '#4c1d95');
  bgGrad.addColorStop(1, '#2d1b69');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Border
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, size - 32, size - 32);

  // Inner border
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, size - 64, size - 64);

  // Center emblem
  ctx.font = 'bold 48px Inter, sans-serif';
  ctx.fillStyle = '#FBBF24';
  ctx.textAlign = 'center';
  ctx.fillText('🎴', size / 2, size / 2 + 10);

  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.fillText('BOOSTER', size / 2, size / 2 + 60);

  ctx.font = 'bold 24px Inter, sans-serif';
  ctx.fillText('PACK', size / 2, size / 2 + 92);

  // Bottom text
  ctx.font = '14px Inter, sans-serif';
  ctx.fillStyle = '#C4B5FD';
  ctx.fillText('100 🪙', size / 2, size - 30);

  return new THREE.CanvasTexture(canvas);
}

// Side texture (shows card edges)
function createPackSideTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#1a1040');
  grad.addColorStop(1, '#2d1b69');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Card edge lines
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 51 + 25);
    ctx.lineTo(size, i * 51 + 25);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

function initScene() {
  if (!containerRef.value) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  if (w === 0 || h === 0) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  containerRef.value.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(5, 5, 8);
  scene.add(dirLight);
  const backLight = new THREE.DirectionalLight(0x8888ff, 0.4);
  backLight.position.set(-3, -2, 3);
  scene.add(backLight);

  // Pack group
  packGroup = new THREE.Group();
  scene.add(packGroup);

  // Pack box — slightly wider than cards
  const packGeo = new THREE.BoxGeometry(1.8, 2.6, 1.0);
  const frontTex = createPackTexture();
  const sideTex = createPackSideTexture();

  const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.3, metalness: 0.2 });
  const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.5, metalness: 0.1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1040, roughness: 0.6 });

  const packMaterials = [
    sideMat, sideMat, darkMat, darkMat, frontMat, darkMat,
  ];

  const packMesh = new THREE.Mesh(packGeo, packMaterials);
  packGroup.add(packMesh);

  animate();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (!packGroup || !renderer || !scene || !camera) return;

  const now = performance.now() * 0.001;

  // Apply rotation with momentum
  if (!isDragging && !props.shaking) {
    rotationVelocity.x *= 0.95;
    rotationVelocity.y *= 0.95;
    packRotation.y += rotationVelocity.x;
    packRotation.x += rotationVelocity.y;
  }

  // Shake effect
  if (props.shaking) {
    shakeIntensity = Math.min(shakeIntensity + 0.01, 0.15);
    packGroup.position.x = Math.sin(now * 20) * shakeIntensity;
    packGroup.position.y = Math.cos(now * 23) * shakeIntensity;
  } else {
    shakeIntensity = Math.max(shakeIntensity - 0.02, 0);
    packGroup.position.x *= 0.9;
    packGroup.position.y *= 0.9;
  }

  // Tear animation
  if (props.tearing) {
    tearProgress = Math.min(tearProgress + 0.03, 1);
    flashOpacity.value = Math.sin(tearProgress * Math.PI) * 0.6;
    packGroup.scale.set(1 - tearProgress * 0.3, 1, 1 - tearProgress * 0.3);
    packGroup.rotation.z = tearProgress * 0.5;

    if (tearProgress >= 1) {
      emit('tear-complete');
    }
  }

  packGroup.rotation.x = packRotation.x;
  packGroup.rotation.y = packRotation.y;

  renderer.render(scene, camera);
}

// Drag handlers
function onDragStart(e) { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; }
function onTouchStart(e) {
  if (e.touches.length === 1) {
    isDragging = true;
    prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
}
function onDragMove(e) {
  if (!isDragging) return;
  const dx = e.clientX - prevMouse.x;
  const dy = e.clientY - prevMouse.y;
  rotationVelocity.x = dx * 0.005;
  rotationVelocity.y = dy * 0.005;
  prevMouse = { x: e.clientX, y: e.clientY };
}
function onTouchMove(e) {
  if (!isDragging || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - prevMouse.x;
  const dy = e.touches[0].clientY - prevMouse.y;
  rotationVelocity.x = dx * 0.005;
  rotationVelocity.y = dy * 0.005;
  prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}
function onDragEnd() { isDragging = false; }

function onResize() {
  if (!containerRef.value || !renderer || !camera) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function cleanup() {
  cancelAnimationFrame(animationId);
  animationId = null;
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
  scene = camera = renderer = packGroup = null;
}

watch(() => props.tearing, (val) => { if (val) tearProgress = 0; });

onMounted(() => { initScene(); window.addEventListener('resize', onResize); });
onBeforeUnmount(() => { window.removeEventListener('resize', onResize); cleanup(); });
</script>
