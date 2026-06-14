<template>
  <div
    ref="containerRef"
    class="w-full h-full relative"
    :class="{ 'cursor-pointer': !props.animating }"
    @mousemove="onPointerMove"
    @mouseleave="onPointerLeave"
    @touchmove.prevent="onTouchMove"
    @touchend="onPointerLeave"
    @click="onClick"
  >
    <!-- Loading shimmer overlay -->
    <div
      v-if="textureLoading"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-xl overflow-hidden"
    >
      <div class="w-full h-full animate-shimmer bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]" />
      <span class="absolute text-muted text-xs">Loading...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as THREE from 'three';

const props = defineProps({
  imageUrl: { type: String, default: '' },
  rarity: { type: String, default: 'Common' },
  mode: { type: String, default: 'full' },
  flipped: { type: Boolean, default: false },
  animating: { type: Boolean, default: false },
});

const emit = defineEmits(['flip-start', 'flip-complete', 'click']);

const containerRef = ref(null);
const textureLoading = ref(true);

// Three.js
let scene, camera, renderer;
let cardGroup, cardFrontMesh, cardBackMesh, cardBorder;
let frontTexture, backTexture, customShaderMaterial;
let animationId = null;
let isFlipped = false;
let flipProgress = 0;
let flipStartTime = 0;
let flipDuration = 600;
let isFlipping = false;

// Tilt
let targetRotX = 0, targetRotY = 0;
let currentRotX = 0, currentRotY = 0;

// Uniforms for shader
const shaderUniforms = {
  baseTexture: { value: null },
  uTime: { value: 0 },
  uFoilIntensity: { value: 0 },
  uBorderColor: { value: new THREE.Color('#A78BFA') },
  uBorderWidth: { value: 0.06 },
};

const rarityConfig = {
  Common:    { foilIntensity: 0.0,  borderColor: '#9CA3AF', borderWidth: 0.04, emissive: '#000000', emissiveIntensity: 0,   metalness: 0.1, roughness: 0.8 },
  Rare:      { foilIntensity: 0.2,  borderColor: '#60A5FA', borderWidth: 0.05, emissive: '#1E3A5F', emissiveIntensity: 0.2, metalness: 0.3, roughness: 0.6 },
  Epic:      { foilIntensity: 0.6,  borderColor: '#A78BFA', borderWidth: 0.06, emissive: '#3B1F6E', emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.4 },
  Legendary: { foilIntensity: 1.0,  borderColor: '#FBBF24', borderWidth: 0.07, emissive: '#78350F', emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.3 },
};

const config = () => rarityConfig[props.rarity] || rarityConfig.Common;

// Shaders
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Subtle breathing for Legendary
    if (uTime > 0.0) {
      pos.z += sin(pos.x * 3.0 + uTime * 0.5) * 0.002;
      pos.z += sin(pos.y * 3.0 + uTime * 0.7) * 0.002;
    }
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform sampler2D baseTexture;
  uniform float uTime;
  uniform float uFoilIntensity;
  uniform vec3 uBorderColor;
  uniform float uBorderWidth;
  void main() {
    vec4 baseColor = texture2D(baseTexture, vUv);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);

    // Foil sweep
    float sweep = sin((vUv.x + vUv.y) * 3.14159 + uTime * 0.8) * 0.5 + 0.5;
    vec3 rainbow = vec3(
      sin(sweep * 6.28 + 0.0) * 0.5 + 0.5,
      sin(sweep * 6.28 + 2.1) * 0.5 + 0.5,
      sin(sweep * 6.28 + 4.2) * 0.5 + 0.5
    );

    // Border detection
    float b = step(vUv.x, uBorderWidth) + step(vUv.y, uBorderWidth)
            + step(1.0 - vUv.x, uBorderWidth) + step(1.0 - vUv.y, uBorderWidth);
    b = clamp(b, 0.0, 1.0);

    vec3 finalColor = mix(baseColor.rgb, uBorderColor, b * 0.75);
    finalColor = mix(finalColor, rainbow, fresnel * uFoilIntensity * 0.5);
    finalColor += rainbow * sweep * uFoilIntensity * 0.12;

    // Sparkle for high foil
    float sparkle = step(0.998, fract(sin(vUv.x * 120.0 + vUv.y * 60.0 + uTime * 2.0) * 1000.0));
    finalColor += vec3(1.0, 0.95, 0.8) * sparkle * uFoilIntensity * 0.6;

    gl_FragColor = vec4(finalColor, baseColor.a);
  }
`;

// Procedural card back texture
function createCardBackTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, '#1a1040');
  bgGrad.addColorStop(0.5, '#2d1b69');
  bgGrad.addColorStop(1, '#1a1040');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Border
  ctx.strokeStyle = '#A78BFA';
  ctx.lineWidth = 12;
  ctx.strokeRect(16, 16, size - 32, size - 32);

  // Inner border
  ctx.strokeStyle = 'rgba(168, 139, 250, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, size - 76, size - 76);

  // Diagonal stripes pattern
  ctx.save();
  ctx.beginPath();
  ctx.rect(38, 38, size - 76, size - 76);
  ctx.clip();
  for (let i = -size; i < size * 2; i += 40) {
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(i, -10);
    ctx.lineTo(i + size, size + 10);
    ctx.stroke();
  }
  ctx.restore();

  // Center emblem — paw circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 70, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(168, 139, 250, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#A78BFA';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center paw print
  ctx.fillStyle = '#C4B5FD';
  // Main pad
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2 + 18, 20, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Toes
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.ellipse(size / 2 + i * 18, size / 2 - 10, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Top toe
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2 - 28, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = '#C4B5FD';
  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MemeCats', size / 2, size - 80);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function initScene() {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  if (width === 0 || height === 0) return;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.z = props.mode === 'mini' ? 6.5 : 5.5;

  // Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, props.mode === 'mini' ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  containerRef.value.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 5, 10);
  scene.add(dirLight);
  const rimLight = new THREE.DirectionalLight(0x8888ff, 0.4);
  rimLight.position.set(-3, -2, 5);
  scene.add(rimLight);

  // Card group (for flip rotation)
  cardGroup = new THREE.Group();
  scene.add(cardGroup);

  // Card geometry
  const cardGeo = new THREE.BoxGeometry(3.0, 4.2, 0.08, 1, 1, 1);

  // Back texture
  backTexture = createCardBackTexture();

  // Card back material
  const backMat = new THREE.MeshStandardMaterial({
    map: backTexture,
    roughness: 0.7,
    metalness: 0.1,
  });

  // Card back mesh
  cardBackMesh = new THREE.Mesh(cardGeo, backMat);
  cardBackMesh.rotation.y = Math.PI;
  cardGroup.add(cardBackMesh);

  // Card front — needs texture loaded
  const cfg = config();
  shaderUniforms.uFoilIntensity.value = cfg.foilIntensity;
  shaderUniforms.uBorderColor.value = new THREE.Color(cfg.borderColor);
  shaderUniforms.uBorderWidth.value = cfg.borderWidth;

  const needsShader = props.rarity === 'Epic' || props.rarity === 'Legendary';

  const loader = new THREE.TextureLoader();
  const placeholderUrl = `/placeholders/${props.rarity.toLowerCase()}-placeholder.svg`;
  const texUrl = props.imageUrl || placeholderUrl;

  loader.load(
    texUrl,
    (tex) => {
      frontTexture = tex;
      shaderUniforms.baseTexture.value = tex;
      textureLoading.value = false;

      if (needsShader) {
        customShaderMaterial = new THREE.ShaderMaterial({
          uniforms: shaderUniforms,
          vertexShader,
          fragmentShader,
          side: THREE.FrontSide,
        });

        const materials = [
          new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 }),
          new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 }),
          new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 }),
          new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 }),
          customShaderMaterial,
          new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 }),
        ];
        cardFrontMesh = new THREE.Mesh(cardGeo, materials);
      } else {
        const frontMat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: cfg.roughness,
          metalness: cfg.metalness,
        });
        cardFrontMesh = new THREE.Mesh(cardGeo, frontMat);
      }

      cardGroup.add(cardFrontMesh);
      if (isFlipped) cardGroup.rotation.y = Math.PI;
    },
    undefined,
    () => {
      // Error — use fallback
      textureLoading.value = false;
      const fallbackMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cfg.borderColor),
        roughness: 0.6,
      });
      cardFrontMesh = new THREE.Mesh(cardGeo, fallbackMat);
      cardGroup.add(cardFrontMesh);
    }
  );

  animate();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (!cardGroup || !renderer || !scene || !camera) return;

  const now = performance.now();

  // Flip animation
  if (isFlipping) {
    const elapsed = now - flipStartTime;
    const t = Math.min(elapsed / flipDuration, 1.0);
    // Ease in-out cubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const targetAngle = isFlipped ? Math.PI : 0;
    const startAngle = isFlipped ? 0 : Math.PI;
    cardGroup.rotation.y = startAngle + (targetAngle - startAngle) * eased;

    if (t >= 1.0) {
      isFlipping = false;
      flipProgress = isFlipped ? 1 : 0;
      emit('flip-complete');
    }
  }

  // Update shader time
  if (customShaderMaterial) {
    shaderUniforms.uTime.value = now * 0.001;
  }

  // Smooth tilt
  currentRotX += (targetRotX - currentRotX) * 0.08;
  currentRotY += (targetRotY - currentRotY) * 0.08;

  if (!isFlipping) {
    cardGroup.rotation.x = currentRotY * 0.5;
    cardGroup.rotation.y = (isFlipped ? Math.PI : 0) + currentRotX * 0.5;
  }

  renderer.render(scene, camera);
}

// Pointer interaction
const tiltFactor = () => props.mode === 'mini' ? 0.5 : 0.8;

function calcTilt(clientX, clientY) {
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
  targetRotX = x * tiltFactor();
  targetRotY = -y * tiltFactor();
}

function onPointerMove(e) { calcTilt(e.clientX, e.clientY); }
function onTouchMove(e) {
  if (e.touches.length === 1) calcTilt(e.touches[0].clientX, e.touches[0].clientY);
}
function onPointerLeave() { targetRotX = 0; targetRotY = 0; }

function onClick() {
  if (!isFlipping) {
    emit('click');
    toggleFlip();
  }
}

function toggleFlip() {
  if (isFlipping) return;
  isFlipping = true;
  flipStartTime = performance.now();
  isFlipped = !isFlipped;
  emit('flip-start');
}

// Watch for flipped prop change (external flip trigger)
watch(() => props.flipped, (newVal) => {
  if (newVal !== isFlipped && !isFlipping) toggleFlip();
});

// Watch for imageUrl changes
watch(() => props.imageUrl, (newUrl) => {
  if (newUrl && frontTexture && cardFrontMesh) {
    const loader = new THREE.TextureLoader();
    loader.load(newUrl, (tex) => {
      if (customShaderMaterial) {
        shaderUniforms.baseTexture.value = tex;
      } else if (cardFrontMesh.material.map) {
        cardFrontMesh.material.map = tex;
        cardFrontMesh.material.needsUpdate = true;
      }
      frontTexture?.dispose();
      frontTexture = tex;
    });
  }
});

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
  if (cardGroup && scene) scene.remove(cardGroup);
  [frontTexture, backTexture].forEach(t => t?.dispose());
  if (customShaderMaterial) customShaderMaterial.dispose();
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
  scene = camera = renderer = cardGroup = cardFrontMesh = cardBackMesh = null;
  customShaderMaterial = null;
}

onMounted(() => {
  nextTick(initScene);
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  cleanup();
});
</script>
