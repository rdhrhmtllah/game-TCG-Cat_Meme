<template>
  <div
    ref="containerRef"
    class="w-full h-full relative origin-center"
    :style="{
      transform: `scale(${renderedScale})`,
      touchAction: 'none'
    }"
    :class="{ 'cursor-pointer': !props.animating }"
    @mousemove="onPointerMove"
    @mouseleave="onPointerLeave"
    @touchstart="onTouchStartTilt"
    @touchmove="onTouchMoveTilt"
    @touchend="onTouchEndTilt"
    @click="onClick"
  >
    <!-- Loading shimmer overlay -->
    <div
      v-if="textureLoading"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-xl overflow-hidden"
    >
      <div class="w-full h-full bg-gradient-to-r from-surface-card via-surface-elevated to-surface-card bg-[length:200%_100%] animate-shimmer" />
      <span class="absolute text-muted text-xs font-display">Loading...</span>
    </div>

    <!-- CSS Gloss overlay (follows cursor) -->
    <div
      v-if="!textureLoading && props.mode !== 'mini'"
      class="absolute inset-0 z-20 pointer-events-none rounded-xl overflow-hidden"
      :style="glossStyle"
    />

    <!-- Reveal flash (kilat putih saat kartu berbalik di momen reveal) -->
    <div
      v-if="revealFlash > 0.01"
      class="absolute inset-0 z-30 pointer-events-none"
      :style="{
        background: `radial-gradient(circle, rgba(255,255,255,${0.85 * revealFlash}) 0%, rgba(255,244,214,${0.3 * revealFlash}) 45%, transparent 75%)`,
      }"
    />

    <!-- Rarity particle ring (Legendary only, CSS-based) -->
    <div v-if="props.rarity === 'Legendary' && !textureLoading"
      class="absolute inset-0 z-0 pointer-events-none">
      <span v-for="i in 8" :key="'p'+i"
        class="absolute w-1 h-1 rounded-full bg-legendary/60 animate-particle-float"
        :style="{
          left: (15 + Math.sin(i * 0.785) * 35 + 50) + '%',
          top: (15 + Math.cos(i * 0.785) * 40 + 50) + '%',
          animationDelay: (i * 0.5) + 's',
          animationDuration: (3 + i * 0.3) + 's',
        }"
      />
    </div>
    <!-- Epic sparkle particles -->
    <div v-if="props.rarity === 'Epic' && !textureLoading"
      class="absolute inset-0 z-0 pointer-events-none">
      <span v-for="i in 5" :key="'ep'+i"
        class="absolute w-0.5 h-0.5 rounded-full bg-epic-light/50 animate-sparkle"
        :style="{
          left: (20 + Math.random() * 60) + '%',
          top: (20 + Math.random() * 60) + '%',
          animationDelay: (i * 0.3) + 's',
        }"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { drawCardCanvas, drawCardBackCanvas } from '@/utils/cardRenderer.js';
import { getQualityConfig } from '@/utils/quality.js';
import { createEnvironmentTexture } from '@/utils/threeEnv.js';
import { ensureFontsLoaded } from '@/utils/fonts.js';

const quality = getQualityConfig();

const props = defineProps({
  imageUrl: { type: String, default: '' },
  rarity: { type: String, default: 'Common' },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  hypeScore: { type: Number, default: 0 },
  likesPerSec: { type: Number, default: 0 },
  element: { type: String, default: 'Normal' },
  mode: { type: String, default: 'full' }, // 'full' | 'mini'
  hd: { type: Boolean, default: false }, // detail: tekstur super tajam + DPR penuh
  flipped: { type: Boolean, default: false },
  animating: { type: Boolean, default: false },
  allowZoom: { type: Boolean, default: false },
  focused: { type: Boolean, default: false },
  foilStyle: { type: String, default: 'Standard' },
  // Image position / crop
  imgZoom: { type: Number, default: 1.0 },
  imgOffsetX: { type: Number, default: 0.0 },
  imgOffsetY: { type: Number, default: 0.0 },
  // Mode reveal gacha: kartu masuk menghadap belakang lalu flip sinematik
  // (god-rays untuk Legendary, bloom pulse sesuai quality tier)
  revealMode: { type: Boolean, default: false },
  // Peluang drop gacha (%) untuk dicetak di footer kartu
  dropRate: { type: [Number, String], default: null },
});

const emit = defineEmits(['flip-start', 'flip-complete', 'click', 'zoom-change']);

const containerRef = ref(null);
const textureLoading = ref(true);

// Gloss tracking
const glossX = ref(50);
const glossY = ref(50);

const glossStyle = computed(() => ({
  background: `radial-gradient(circle 180px at ${glossX.value}% ${glossY.value}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
  transition: 'background 0.15s ease',
}));

// Three.js refs
let scene, camera, renderer;
let cardGroup, cardFrontMesh, cardBackMesh;
let cardGeo = null;
let frontTexture, backTexture, customShaderMaterial;
let envTexture = null;
let animationId = null;
let isFlipped = false;
let flipStartTime = 0;
let flipDuration = 600;
let isFlipping = false;
let particlesMesh = null;

// RAF lifecycle — loop hanya jalan saat kartu terlihat & tab aktif
let isInViewport = true;
let intersectionObserver = null;
let lastActivityTime = 0; // untuk idle demotion ke 30fps
let idleFrameToggle = false;

// === CINEMATIC REVEAL state ===
const revealFlash = ref(0);      // 0..1, dirender sebagai overlay kilat putih
let revealActive = false;        // sekuens sedang berjalan (blokir tap flip)
let revealTimers = [];
let composer = null;             // EffectComposer — hanya dibuat saat revealMode + bloom diizinkan
let bloomPass = null;
let bloomTarget = 0;             // strength dituju (di-lerp di animate)
let raysMesh = null;             // quad god-rays additive di belakang kartu (Legendary)
let raysOpacity = 0;
let raysTarget = 0;

const getFoilStyleId = (style, rarity) => {
  const s = style || 'Standard';
  if (s === 'Standard') {
    if (rarity === 'Rare') return 1.0;
    if (rarity === 'Epic') return 3.0;
    if (rarity === 'Legendary') return 4.0;
    return 0.0;
  }
  switch (s) {
    case 'Holo': return 1.0;
    case 'Reverse Holo': return 2.0;
    case 'Full Art ex': return 3.0;
    case 'Secret Gold': return 4.0;
    case 'Special Illustration': return 5.0;
    default: return 0.0;
  }
};

const getFoilIntensity = (style, rarity) => {
  switch (style) {
    case 'Standard':
      if (rarity === 'Rare') return 0.35;
      if (rarity === 'Epic') return 0.75;
      if (rarity === 'Legendary') return 1.0;
      return 0.0;
    case 'Holo':
    case 'Reverse Holo':
      return 0.6;
    case 'Full Art ex':
      return 0.85;
    case 'Secret Gold':
    case 'Special Illustration':
      return 1.0;
    default:
      return 0.0;
  }
};

const resolveConfig = () => {
  const rarity = props.rarity;
  const style = props.foilStyle || 'Standard';
  const base = rarityConfig[rarity] || rarityConfig.Common;
  
  let foilIntensity = getFoilIntensity(style, rarity);
  let borderColor = base.borderColor;
  let emissive = base.emissive;
  let emissiveIntensity = base.emissiveIntensity;
  let metalness = base.metalness;
  let roughness = base.roughness;
  
  if (style === 'Secret Gold') {
    borderColor = '#F59E0B';
    emissive = '#78350F';
    emissiveIntensity = 0.55;
    metalness = 0.8;
    roughness = 0.2;
  } else if (style === 'Full Art ex' || style === 'Special Illustration') {
    metalness = 0.7;
    roughness = 0.35;
  }
  
  return {
    foilIntensity,
    borderColor,
    borderWidth: base.borderWidth,
    emissive,
    emissiveIntensity,
    metalness,
    roughness
  };
};

function initParticles() {
  if (!cardGroup) return;

  const rarity = props.rarity;
  const cfg = rarityConfig[rarity] || rarityConfig.Common;
  const isSpecialIllustration = props.foilStyle === 'Special Illustration';

  // Determine particle count: Special Illustration always spawns particles, other rarities based on config
  let particleCount = 0;
  if (isSpecialIllustration) {
    particleCount = cfg.particleCount > 0 ? cfg.particleCount : 20;
  } else if (rarity === 'Rare' || rarity === 'Epic' || rarity === 'Legendary') {
    particleCount = cfg.particleCount;
  }
  // Quality tier: kurangi/matikan particle di device low-end
  particleCount = Math.floor(particleCount * quality.particleScale);
  if (particleCount === 0) return;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const speeds = [];

  // Parse rarity color
  const hexColor = cfg.particleColor || '#FCD34D';
  const r = parseInt(hexColor.slice(1, 3), 16) / 255;
  const g = parseInt(hexColor.slice(3, 5), 16) / 255;
  const b = parseInt(hexColor.slice(5, 7), 16) / 255;

  for (let i = 0; i < particleCount; i++) {
    let x, y, z;

    if (rarity === 'Legendary' || isSpecialIllustration) {
      // Full card spread with two orbit rings
      const ring = i < particleCount * 0.55 ? 'inner' : 'outer';
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.8;
      const radius = ring === 'inner' ? 1.2 + Math.random() * 0.5 : 1.9 + Math.random() * 0.7;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius * 1.35;
      z = 0.06 + Math.random() * 0.30;
      speeds.push({
        orbit: ring === 'inner' ? 0.008 : 0.004,
        angle,
        radius,
        radiusY: radius * 1.35,
        twinkle: 2 + Math.random() * 4,
        type: 'orbit',
        ring
      });
    } else if (rarity === 'Epic') {
      // Orbital cosmic dust
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 1.2;
      const radius = 1.3 + Math.random() * 1.0;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius * 1.4;
      z = 0.06 + Math.random() * 0.25;
      speeds.push({
        orbit: 0.005 + Math.random() * 0.005,
        angle,
        radius,
        radiusY: radius * 1.4,
        twinkle: 3 + Math.random() * 5,
        type: 'orbit',
        ring: 'outer'
      });
    } else if (rarity === 'Rare') {
      // Edge sparks that drift upward along card edges
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0)      { x = -1.55 + Math.random() * 0.15; y = (Math.random() - 0.5) * 4.2; }
      else if (edge === 1) { x =  1.40 + Math.random() * 0.15; y = (Math.random() - 0.5) * 4.2; }
      else if (edge === 2) { x = (Math.random() - 0.5) * 3.0; y = -2.15 + Math.random() * 0.15; }
      else                 { x = (Math.random() - 0.5) * 3.0; y =  2.00 + Math.random() * 0.15; }
      z = 0.05 + Math.random() * 0.20;
      speeds.push({
        y: 0.08 + Math.random() * 0.15,
        x: (Math.random() - 0.5) * 0.03,
        twinkle: 4 + Math.random() * 5,
        type: 'drift'
      });
    }

    positions[i * 3]     = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    sizes[i] = rarity === 'Rare' ? 3.0 + Math.random() * 4.0 : 4.0 + Math.random() * 9.0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Procedural particle texture
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 32;
  pCanvas.height = 32;
  const pCtx = pCanvas.getContext('2d');

  if (rarity === 'Legendary' || isSpecialIllustration) {
    // 4-point star glow
    const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, 1)`);
    grad.addColorStop(0.2, `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, 0.7)`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    pCtx.fillStyle = grad;
    pCtx.beginPath();
    pCtx.arc(16, 16, 16, 0, Math.PI * 2);
    pCtx.fill();
    // Star spike horizontal
    pCtx.fillStyle = `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, 0.6)`;
    pCtx.fillRect(0, 14, 32, 4);
    pCtx.fillRect(14, 0, 4, 32);
  } else {
    // Soft round glow
    const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, 1)`);
    grad.addColorStop(0.5, `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, 0.4)`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    pCtx.fillStyle = grad;
    pCtx.beginPath();
    pCtx.arc(16, 16, 16, 0, Math.PI * 2);
    pCtx.fill();
  }

  const pTexture = new THREE.CanvasTexture(pCanvas);

  const particleColor = rarity === 'Legendary' ? 0xFCD34D
    : rarity === 'Epic' ? 0xD946EF
    : rarity === 'Rare' ? 0x06B6D4
    : 0xffffff;

  const material = new THREE.PointsMaterial({
    color: particleColor,
    size: rarity === 'Rare' ? 0.10 : rarity === 'Epic' ? 0.13 : 0.16,
    map: pTexture,
    transparent: true,
    opacity: rarity === 'Rare' ? 0.75 : 0.90,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  particlesMesh = new THREE.Points(geometry, material);
  particlesMesh.userData = { speeds, startTime: performance.now() };
  cardGroup.add(particlesMesh);
}

// Spring-based tilt system — tuned for instant 1:1 finger tracking (TCG-style direct manipulation)
let targetRotX = 0, targetRotY = 0;
let currentRotX = 0, currentRotY = 0;
let velocityX = 0, velocityY = 0;
const springStiffness = 0.55;   // was 0.12 — now ~5× faster, card snaps to finger
const springDamping = 0.82;     // was 0.75 — higher damping prevents overshoot at high stiffness
const hoverStiffness = 0.22;    // desktop mouse hover — responsive but smooth
const hoverDamping = 0.80;
const releaseStiffness = 0.08;  // gentle return-to-center when finger lifts
const releaseDamping = 0.88;    // smooth settle after release

// Pinch and Zoom variables
const cardScale = ref(1.0);
const renderedScale = ref(1.0);
let initialPinchDist = 0;
let initialScale = 1.0;
let isPinching = false;
let resizeObserver = null;
let appliedZoomScale = 1; // skala zoom terakhir yang dipakai untuk sizing buffer WebGL

// Shader uniforms
const shaderUniforms = {
  baseTexture: { value: null },
  uTime: { value: 0 },
  uFoilIntensity: { value: 0 },
  uBorderColor: { value: new THREE.Color('#A855F7') },
  uBorderWidth: { value: 0.06 },
  uMouseX: { value: 0.5 },
  uMouseY: { value: 0.5 },
  uRarity: { value: 0.0 }, // 0 = Rare, 1 = Epic, 2 = Legendary
  uFoilStyle: { value: 0.0 }, // 0 = Standard, 1 = Holo, 2 = Reverse Holo, 3 = Full Art ex, 4 = Secret Gold, 5 = Special Illustration
  uIsBleed: { value: 0.0 }, // 0.0 = framed/windowed, 1.0 = full bleed background
};

const rarityConfig = {
  Common:    { foilIntensity: 0.0,  borderColor: '#9CA3AF', borderWidth: 0.025, emissive: '#111827', emissiveIntensity: 0.0,  metalness: 0.20, roughness: 0.80, particleColor: null,      particleCount: 0,  ambientIntensity: 0.60 },
  Rare:      { foilIntensity: 0.40, borderColor: '#06B6D4', borderWidth: 0.038, emissive: '#083344', emissiveIntensity: 0.22, metalness: 0.55, roughness: 0.35, particleColor: '#06B6D4', particleCount: 12, ambientIntensity: 0.50 },
  Epic:      { foilIntensity: 0.80, borderColor: '#C026D3', borderWidth: 0.050, emissive: '#3B0764', emissiveIntensity: 0.45, metalness: 0.70, roughness: 0.20, particleColor: '#C084FC', particleCount: 25, ambientIntensity: 0.40 },
  Legendary: { foilIntensity: 1.0,  borderColor: '#F59E0B', borderWidth: 0.065, emissive: '#92400E', emissiveIntensity: 0.65, metalness: 0.90, roughness: 0.08, particleColor: '#FCD34D', particleCount: 45, ambientIntensity: 0.30 },
};

const config = () => rarityConfig[props.rarity] || rarityConfig.Common;

// ====== HIGH-END POKÉMON TCG SHADERS ======
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  uniform sampler2D baseTexture;
  uniform float uTime;
  uniform float uFoilIntensity;
  uniform vec3 uBorderColor;
  uniform float uBorderWidth;
  uniform float uMouseX;
  uniform float uMouseY;
  uniform float uRarity;
  uniform float uFoilStyle;
  uniform float uIsBleed;

  // Hash function for procedural noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float hash1(float n) { return fract(sin(n) * 43758.5453); }

  // 4-point star generator
  float drawStar(vec2 uv, float size, float twinkleSpeed, vec2 cellId) {
    vec2 p = uv;
    float dist = length(p);
    float crossSpikes = smoothstep(0.012 * size, 0.0, abs(p.x) * (abs(p.y) + 0.22)) * 0.75
                      + smoothstep(0.012 * size, 0.0, abs(p.y) * (abs(p.x) + 0.22)) * 0.75;
    float core = smoothstep(0.1 * size, 0.0, dist) * 0.35;
    float twinkle = sin(uTime * twinkleSpeed + hash(cellId) * 6.28) * 0.5 + 0.5;
    return (crossSpikes + core) * twinkle;
  }

  float getGalaxyStars(vec2 uv) {
    vec2 scaledUv = uv * 15.0;
    vec2 ipos = floor(scaledUv);
    vec2 fpos = fract(scaledUv) - 0.5;
    float cellHash = hash(ipos);
    vec2 offset = vec2(hash(ipos + 1.2), hash(ipos + 4.9)) - 0.5;
    vec2 starPos = fpos - offset * 0.45;
    float size = 0.4 + 0.6 * hash(ipos + 7.8);
    float speed = 2.5 + 3.5 * hash(ipos + 3.1);
    float activeChance = step(0.75, cellHash);
    return drawStar(starPos, size, speed, ipos) * activeChance;
  }

  // Iridescent rainbow (prismatic thin-film)
  vec3 getIridescence(vec3 normal, vec3 viewDir) {
    float cosTheta = max(dot(normal, viewDir), 0.0);
    float wave = cosTheta * 2.5 + uTime * 0.2;
    vec3 color = vec3(
      sin(wave * 6.28 + 0.0) * 0.5 + 0.5,
      sin(wave * 6.28 + 2.1) * 0.5 + 0.5,
      sin(wave * 6.28 + 4.2) * 0.5 + 0.5
    );
    return mix(color, vec3(1.0, 0.85, 0.9), 0.2);
  }

  // Epic plasma energy pulse (concentric rings from center)
  float getEpicPlasma(vec2 uv) {
    vec2 center = vec2(0.5, 0.5);
    float dist = length(uv - center) * 2.2;
    float pulse = sin(dist * 8.0 - uTime * 3.5) * 0.5 + 0.5;
    float ring = smoothstep(0.6, 0.0, dist) * pulse;
    return ring;
  }

  // Legendary subsurface scatter glow from edges
  float getLegendaryEdgeGlow(vec2 uv, float borderWidth) {
    float ex = smoothstep(borderWidth * 2.5, 0.0, uv.x) + smoothstep(borderWidth * 2.5, 0.0, 1.0 - uv.x);
    float ey = smoothstep(borderWidth * 2.5, 0.0, uv.y) + smoothstep(borderWidth * 2.5, 0.0, 1.0 - uv.y);
    return clamp(ex + ey, 0.0, 1.0);
  }

  // Diamond caustic light pattern for Legendary
  float getDiamondCaustic(vec2 uv) {
    vec2 p = uv * 8.0;
    float c = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 q = p + vec2(sin(uTime * 0.4 + fi * 2.1), cos(uTime * 0.3 + fi * 1.7)) * 0.5;
      c += abs(sin(q.x + sin(q.y + uTime * 0.2))) * 0.33;
    }
    return clamp(c, 0.0, 1.0);
  }

  // Rare anisotropic highlight (brushed metal directional sheen)
  float getAnisotropicHighlight(vec3 normal, vec3 viewDir) {
    vec3 tangent = normalize(cross(normal, vec3(1.0, 0.0, 0.0)));
    float t = dot(tangent, viewDir);
    float anisoSpec = pow(max(0.0, 1.0 - abs(t)), 6.0);
    return anisoSpec;
  }

  // Film grain (cinematic texture)
  float getFilmGrain(vec2 uv) {
    float t = floor(uTime * 24.0); // 24fps grain change rate
    return hash(uv * 800.0 + t) * 2.0 - 1.0;
  }

  // Depth of field vignette (blurs/darkens edges like a real camera)
  float getDoFVignette(vec2 uv) {
    vec2 center = uv - 0.5;
    return 1.0 - smoothstep(0.28, 0.72, dot(center, center) * 3.2);
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    bool isRare      = (uRarity < 0.5);
    bool isEpic      = (uRarity > 0.5 && uRarity < 1.5);
    bool isLegendary = (uRarity > 1.5);

    bool inArtwork = (vUv.x > 0.05 && vUv.x < 0.95 && vUv.y > 0.448 && vUv.y < 0.852);

    // 1. Parallax artwork shift
    vec2 artUv = vUv;
    bool needsParallax = (uFoilStyle == 5.0) || (isRare && (uFoilStyle == 1.0 || uFoilStyle == 0.0));
    if (needsParallax && inArtwork) {
      float pStrength = (uFoilStyle == 5.0) ? 0.045 : 0.022;
      artUv.xy += viewDir.xy * pStrength * uFoilIntensity;
      artUv.x = clamp(artUv.x, 0.051, 0.949);
      artUv.y = clamp(artUv.y, 0.449, 0.851);
    }

    // 2. Chromatic Aberration on border edges (lens-flare RGB split)
    float bxBase = smoothstep(0.0, uBorderWidth * 1.8, vUv.x) * smoothstep(0.0, uBorderWidth * 1.8, 1.0 - vUv.x);
    float byBase = smoothstep(0.0, uBorderWidth * 1.8, vUv.y) * smoothstep(0.0, uBorderWidth * 1.8, 1.0 - vUv.y);
    float edgeFactor = 1.0 - bxBase * byBase;
    float chromaAmount = edgeFactor * uFoilIntensity * 0.012;
    vec2 uvR = artUv + vec2( chromaAmount, 0.0);
    vec2 uvB = artUv + vec2(-chromaAmount, 0.0);
    vec4 baseColor;
    baseColor.r = texture2D(baseTexture, clamp(uvR, 0.001, 0.999)).r;
    baseColor.g = texture2D(baseTexture, artUv).g;
    baseColor.b = texture2D(baseTexture, clamp(uvB, 0.001, 0.999)).b;
    baseColor.a = texture2D(baseTexture, artUv).a;
    vec3 finalColor = baseColor.rgb;

    // 3. Holographic Foil Masking
    float foilMask = 0.0;
    if (uFoilStyle == 1.0) {
      foilMask = inArtwork ? 1.0 : 0.0;
    } else if (uFoilStyle == 2.0) {
      foilMask = inArtwork ? 0.0 : 1.0;
      if (vUv.y < 0.45) foilMask *= 0.4;
    } else if (uFoilStyle == 3.0 || uFoilStyle == 4.0 || uFoilStyle == 5.0) {
      foilMask = 1.0;
      if (vUv.y < 0.45) foilMask = 0.35;
      if (vUv.y > 0.85) foilMask = 0.5;
      if (uIsBleed == 0.0 && inArtwork) {
        foilMask = 0.0;
      }
    }

    // 4. Iridescence
    vec3 holoColor = getIridescence(normal, viewDir);
    if (uFoilStyle == 4.0) {
      vec3 goldSheen = vec3(1.0, 0.82, 0.3) * (max(0.0, dot(normal, viewDir)) * 0.4 + 0.6);
      holoColor = mix(holoColor, goldSheen, 0.75);
    }
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    float holoStrength = fresnel * uFoilIntensity * 0.5 + 0.1 * uFoilIntensity;
    finalColor = mix(finalColor, holoColor, holoStrength * foilMask);

    // 5. Galaxy Star Sparkle
    float starSparkle = getGalaxyStars(artUv);
    float angleTwinkle = max(0.0, dot(normal, viewDir));
    vec3 sparkleColor = (uFoilStyle == 4.0) ? vec3(1.0, 0.88, 0.4) : vec3(1.0, 0.96, 0.88);
    finalColor += sparkleColor * starSparkle * uFoilIntensity * (0.2 + 0.8 * angleTwinkle) * foilMask * 0.8;

    // 6. Epic: Plasma energy pulse overlay
    if (isEpic) {
      float plasma = getEpicPlasma(vUv) * uFoilIntensity * 0.18;
      vec3 plasmaColor = vec3(0.75, 0.1, 1.0);
      finalColor += plasmaColor * plasma;
    }

    // 7. Legendary: Subsurface edge glow + diamond caustics
    if (isLegendary) {
      float edgeGlow = getLegendaryEdgeGlow(vUv, uBorderWidth) * uFoilIntensity;
      finalColor += vec3(1.0, 0.72, 0.15) * edgeGlow * 0.35;
      float caustic = getDiamondCaustic(vUv) * uFoilIntensity * 0.12 * fresnel;
      finalColor += vec3(1.0, 0.90, 0.50) * caustic;
    }

    // 8. Rare: Anisotropic brushed-metal highlight
    if (isRare) {
      float aniso = getAnisotropicHighlight(normal, viewDir) * uFoilIntensity * 0.30;
      finalColor += vec3(0.6, 0.95, 1.0) * aniso;
    }

    // 9. Specular gloss (cursor-following hotspot)
    vec2 mousePos = vec2(uMouseX, uMouseY);
    float specDist = length(vUv - mousePos);
    float specular = smoothstep(0.24, 0.0, specDist) * 0.09;
    finalColor += vec3(1.0, 0.99, 0.96) * specular * uFoilIntensity * foilMask;

    // 10. Border glow with color
    float bx = smoothstep(0.0, uBorderWidth, vUv.x) * smoothstep(0.0, uBorderWidth, 1.0 - vUv.x);
    float by = smoothstep(0.0, uBorderWidth, vUv.y) * smoothstep(0.0, uBorderWidth, 1.0 - vUv.y);
    float borderMask = 1.0 - bx * by;
    borderMask = pow(borderMask, 0.5);
    float metallicSheen = pow(max(dot(normal, normalize(vec3(0.3, 0.5, 0.8))), 0.0), 4.0);
    finalColor += uBorderColor * metallicSheen * uFoilIntensity * 0.10;
    finalColor = mix(finalColor, uBorderColor, borderMask * 0.72);

    // 11. Depth of Field vignette (premium cinematic look)
    float dof = getDoFVignette(vUv);
    finalColor *= mix(0.82, 1.0, dof);

    // 12. Film grain (subtle cinematic texture)
    float grain = getFilmGrain(vUv) * 0.025;
    finalColor += grain;

    gl_FragColor = vec4(finalColor, baseColor.a);
    #include <colorspace_fragment>
  }
`;

// Punggung kartu "Grand Sigil" digambar oleh cardRenderer — reuse helper
// premium yang sama dengan wajah kartu (bevel metalik, grain, filigree)
function createCardBackTexture(rarity) {
  const tex = new THREE.CanvasTexture(drawCardBackCanvas(rarity));
  tex.colorSpace = THREE.SRGBColorSpace;
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
  camera.position.z = props.mode === 'mini' ? 6.2 : 7.5;

  // Renderer — DPR di-cap sesuai quality tier
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  // HD (detail): DPR penuh (maks 3) untuk render WebGL super tajam;
  // selain itu di-cap sesuai quality tier demi performa grid
  const dprCap = props.hd ? 3 : (props.mode === 'mini' ? quality.dprMini : quality.dpr);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  containerRef.value.appendChild(renderer.domElement);

  // Pulih otomatis bila browser membuang context WebGL (mis. terlalu banyak
  // context aktif saat transisi halaman) → cegah kartu putih permanen.
  renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

  // Ensure canvas receives touch events properly on mobile
  renderer.domElement.style.touchAction = 'none';

  // Environment map (RoomEnvironment via PMREM) — bikin foil/metal beneran
  // memantulkan "ruangan", bukan cuma directional light. Per-renderer karena
  // render target PMREM terikat ke context ini.
  envTexture = createEnvironmentTexture(renderer);
  scene.environment = envTexture;
  scene.environmentIntensity = 0.85;

  // Lighting — intensity and color vary per rarity (di-update ulang oleh
  // updateLights() saat rarity berubah tanpa remount)
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.1);
  mainLight.position.set(3, 4, 8);
  scene.add(mainLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.65);
  rimLight.position.set(-4, -2, 5);
  scene.add(rimLight);

  const topLight = new THREE.DirectionalLight(0xffffff, 0.30);
  topLight.position.set(0, 6, 3);
  scene.add(topLight);

  // Dynamic animated point light that orbits the card (rarity-colored)
  // Dimatikan di tier low (quality.dynLight)
  const dynLight = new THREE.PointLight(0xffffff, 0.0, 12);
  dynLight.position.set(2, 1, 3);
  scene.add(dynLight);
  scene.userData.ambientLight = ambientLight;
  scene.userData.rimLight = rimLight;
  scene.userData.topLight = topLight;
  scene.userData.dynLight = dynLight;
  scene.userData.dynLightStartTime = performance.now();
  updateLights();

  // Card group
  cardGroup = new THREE.Group();
  scene.add(cardGroup);

  // Card geometry (module-level: dipakai ulang saat rebuild)
  cardGeo = new THREE.BoxGeometry(3.0, 4.2, 0.06, 1, 1, 1);

  loadAndBuildCard();
  startLoop();
}

// Sinkronkan warna/intensitas lampu dengan rarity saat ini
// (dipanggil saat init & setiap kartu berganti in-place)
function updateLights() {
  if (!scene) return;
  const rCfg = rarityConfig[props.rarity] || rarityConfig.Common;
  const rimColors = {
    Common:    0x94A3B8,
    Rare:      0x06B6D4,
    Epic:      0xC026D3,
    Legendary: 0xF59E0B,
  };
  const rimColor = rimColors[props.rarity] || 0x6366f1;

  scene.userData.ambientLight.intensity = rCfg.ambientIntensity;
  scene.userData.rimLight.color.setHex(rimColor);
  scene.userData.topLight.color.setHex(rimColor);

  const dyn = scene.userData.dynLight;
  dyn.color.setHex(rimColor);
  dyn.intensity = !quality.dynLight ? 0.0
    : props.rarity === 'Legendary' ? 1.8
    : props.rarity === 'Epic' ? 1.2
    : props.rarity === 'Rare' ? 0.8
    : 0.0;
}

function disposeCardMesh() {
  if (!cardFrontMesh) return;
  cardGroup?.remove(cardFrontMesh);
  const mats = Array.isArray(cardFrontMesh.material) ? cardFrontMesh.material : [cardFrontMesh.material];
  const seen = new Set();
  for (const m of mats) {
    // customShaderMaterial dipakai ulang antar rebuild — jangan di-dispose di sini
    if (!m || seen.has(m) || m === customShaderMaterial) continue;
    seen.add(m);
    m.dispose();
  }
  cardFrontMesh = null;
}

function disposeParticles() {
  if (!particlesMesh) return;
  cardGroup?.remove(particlesMesh);
  particlesMesh.geometry?.dispose();
  if (particlesMesh.material) {
    particlesMesh.material.map?.dispose();
    particlesMesh.material.dispose();
  }
  particlesMesh = null;
}

// Muat artwork lalu bangun/bangun-ulang mesh kartu di scene yang sama.
// Ini pengganti pola remount (":key" per kartu): WebGL context, renderer,
// dan env map tetap hidup — hanya texture/material/particle yang diganti.
let buildRequestId = 0;
function loadAndBuildCard() {
  if (!cardGroup) return;
  const requestId = ++buildRequestId; // tangkal race saat props berubah cepat
  const loader = new THREE.TextureLoader();
  const placeholderUrl = `/placeholders/${props.rarity.toLowerCase()}-placeholder.svg`;
  const texUrl = props.imageUrl || placeholderUrl;

  // Font WAJIB siap sebelum canvas digambar — kalau tidak, teks kartu
  // ter-render pakai font sistem dan ke-cache permanen di texture
  const fontsReady = ensureFontsLoaded();
  loader.load(
    texUrl,
    (tex) => { fontsReady.then(() => { if (requestId === buildRequestId) buildCardFace(tex.image); }); },
    undefined,
    () => { fontsReady.then(() => { if (requestId === buildRequestId) buildCardFace(null); }); }
  );
}

function buildCardFace(image) {
  if (!cardGroup) return;
  const cfg = resolveConfig();

  // Sync shader uniforms dengan props terkini
  shaderUniforms.uFoilIntensity.value = cfg.foilIntensity;
  shaderUniforms.uBorderColor.value = new THREE.Color(cfg.borderColor);
  shaderUniforms.uBorderWidth.value = cfg.borderWidth;
  let rarityId = 0.0;
  if (props.rarity === 'Epic') rarityId = 1.0;
  else if (props.rarity === 'Legendary') rarityId = 2.0;
  shaderUniforms.uRarity.value = rarityId;
  shaderUniforms.uFoilStyle.value = getFoilStyleId(props.foilStyle, props.rarity);
  const isBleed = props.foilStyle === 'Full Art ex' || props.foilStyle === 'Secret Gold' || props.foilStyle === 'Special Illustration';
  shaderUniforms.uIsBleed.value = isBleed ? 1.0 : 0.0;

  // Front texture (frame kartu digambar prosedural di canvas)
  const canvas = drawCardCanvas({
    name: props.name,
    description: props.description,
    rarity: props.rarity,
    hypeScore: props.hypeScore,
    likesPerSec: props.likesPerSec,
    element: props.element,
    foilStyle: props.foilStyle,
    imgZoom: props.imgZoom,
    imgOffsetX: props.imgOffsetX,
    imgOffsetY: props.imgOffsetY,
    dropRate: (props.dropRate === null || props.dropRate === '') ? null : parseFloat(props.dropRate)
  }, image, props.hd ? 3 : null);
  const canvasTex = new THREE.CanvasTexture(canvas);
  canvasTex.colorSpace = THREE.SRGBColorSpace;
  if (renderer) {
    canvasTex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
  }

  // Back texture per rarity
  const newBackTexture = createCardBackTexture(props.rarity);
  const backMat = new THREE.MeshStandardMaterial({
    map: newBackTexture,
    roughness: 0.6,
    metalness: 0.15,
  });

  // Front material: shader untuk foil/rare+, standard untuk sisanya
  // (fallback tanpa artwork tetap standard, sama seperti perilaku lama)
  const needsShader = image && (props.foilStyle !== 'Standard' || props.rarity === 'Rare' || props.rarity === 'Epic' || props.rarity === 'Legendary');
  let frontMat;
  let edgeMat;
  if (needsShader) {
    if (!customShaderMaterial) {
      customShaderMaterial = new THREE.ShaderMaterial({
        uniforms: shaderUniforms,
        vertexShader,
        fragmentShader,
        side: THREE.FrontSide,
      });
    }
    shaderUniforms.baseTexture.value = canvasTex;
    frontMat = customShaderMaterial;

    edgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.borderColor).multiplyScalar(0.3),
      roughness: 0.4,
      metalness: 0.3,
      emissive: new THREE.Color(cfg.emissive),
      emissiveIntensity: cfg.emissiveIntensity * 0.3,
    });
  } else {
    frontMat = new THREE.MeshStandardMaterial({
      map: canvasTex,
      roughness: cfg.roughness,
      metalness: cfg.metalness,
    });
    edgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.borderColor).multiplyScalar(0.2),
      roughness: 0.5,
      metalness: 0.1,
    });
  }

  // Swap mesh lama → baru
  disposeCardMesh();
  frontTexture?.dispose();
  frontTexture = canvasTex;
  backTexture?.dispose();
  backTexture = newBackTexture;

  cardFrontMesh = new THREE.Mesh(cardGeo, [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat]);
  cardGroup.add(cardFrontMesh);
  if (isFlipped && !isFlipping) cardGroup.rotation.y = Math.PI;

  textureLoading.value = false;
  markActivity();
  updateLights();
  disposeParticles();
  initParticles();

  // Mode reveal gacha: mainkan sekuens sinematik tiap kartu baru terpasang
  if (props.revealMode) startRevealSequence();
}

// === CINEMATIC REVEAL (Fase 1.4) ===
// Efek berat (bloom/god-rays) HANYA hidup di overlay reveal — grid/binder
// tidak tersentuh. Strategi Marvel Snap: drama maksimal di momen reveal saja.

function bloomAllowed() {
  if (!props.revealMode) return false;
  if (quality.bloom === 'off') return false;
  if (quality.bloom === 'legendary') return props.rarity === 'Legendary';
  return props.rarity === 'Legendary' || props.rarity === 'Epic';
}

function ensureComposer() {
  if (composer || !renderer || !containerRef.value) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.0, 0.55, 0.80);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}

const raysVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const raysFragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float angle = atan(p.y, p.x);
    float rays = 0.55 + 0.45 * sin(angle * 9.0 + uTime * 0.6);
    rays *= 0.70 + 0.30 * sin(angle * 5.0 - uTime * 0.4);
    float falloff = smoothstep(1.0, 0.05, r);
    float core = smoothstep(0.45, 0.0, r) * 0.8;
    float a = (rays * falloff + core) * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

function ensureRaysMesh() {
  if (raysMesh || !scene) return;
  const geo = new THREE.PlaneGeometry(9, 9);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(1.0, 0.82, 0.42) },
    },
    vertexShader: raysVertexShader,
    fragmentShader: raysFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  raysMesh = new THREE.Mesh(geo, mat);
  raysMesh.position.z = -1.4;
  scene.add(raysMesh);
}

function clearRevealTimers() {
  revealTimers.forEach(clearTimeout);
  revealTimers = [];
}

function disposeRevealResources() {
  clearRevealTimers();
  if (raysMesh) {
    scene?.remove(raysMesh);
    raysMesh.geometry.dispose();
    raysMesh.material.dispose();
    raysMesh = null;
  }
  composer?.dispose();
  composer = null;
  bloomPass = null;
}

// Sekuens: kartu masuk menghadap belakang → (Legendary: god-rays menyala) →
// flip dramatis → kilat + bloom pulse tepat saat wajah kartu terlihat → settle
function startRevealSequence() {
  clearRevealTimers();
  revealActive = true;
  markActivity();

  // Mulai menghadap belakang, tilt netral
  isFlipping = false;
  isFlipped = true;
  if (cardGroup) cardGroup.rotation.set(0, Math.PI, 0);
  currentRotX = currentRotY = velocityX = velocityY = 0;
  targetRotX = targetRotY = 0;

  const isLegend = props.rarity === 'Legendary';
  const isEpic = props.rarity === 'Epic';
  flipDuration = isLegend ? 950 : isEpic ? 750 : 550;
  const preDelay = isLegend ? 700 : isEpic ? 400 : 200;

  if (bloomAllowed()) ensureComposer();
  if (bloomPass) { bloomPass.strength = 0; bloomTarget = 0; }
  if (isLegend && quality.bloom !== 'off') {
    ensureRaysMesh();
    raysTarget = 1;
  }

  revealTimers.push(setTimeout(() => {
    toggleFlip(); // belakang → depan

    // Kilat + bloom pulse tepat di tengah flip (kartu melewati 90°)
    revealTimers.push(setTimeout(() => {
      revealFlash.value = 1;
      if (bloomPass) {
        bloomPass.strength = isLegend ? 1.25 : 0.75;
        bloomTarget = 0; // decay via lerp di animate
      }
    }, flipDuration * 0.5));

    // Settle: rays memudar, sekuens selesai
    revealTimers.push(setTimeout(() => {
      raysTarget = 0;
      revealActive = false;
    }, flipDuration + 700));
  }, preDelay));
}

function markActivity() {
  lastActivityTime = performance.now();
}

function startLoop() {
  if (animationId === null && renderer) {
    animationId = requestAnimationFrame(animate);
  }
}

function stopLoop() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// Loop hanya jalan saat kartu di viewport DAN tab terlihat
function syncLoopState() {
  if (isInViewport && !document.hidden) startLoop();
  else stopLoop();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (!cardGroup || !renderer || !scene || !camera) return;

  const now = performance.now();

  // Idle demotion: tanpa interaksi/animasi aktif > 3 detik → render 30fps
  // (skip frame selang-seling; shader shimmer tetap jalan, cuma setengah rate)
  const interacting = isHovering || isTouchTilting || isPinching || isFlipping;
  if (!interacting && now - lastActivityTime > 3000) {
    idleFrameToggle = !idleFrameToggle;
    if (idleFrameToggle) return;
  }

  // Flip animation
  if (isFlipping) {
    const elapsed = now - flipStartTime;
    const t = Math.min(elapsed / flipDuration, 1.0);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const targetAngle = isFlipped ? Math.PI : 0;
    const startAngle = isFlipped ? 0 : Math.PI;
    cardGroup.rotation.y = startAngle + (targetAngle - startAngle) * eased;

    if (t >= 1.0) {
      isFlipping = false;
      emit('flip-complete');
    }
  }

  // Update shader uniforms
  if (customShaderMaterial) {
    shaderUniforms.uTime.value = now * 0.001;
  }

  // Animate dynamic rim point light orbital movement
  if (scene && scene.userData.dynLight) {
    const t = (now - (scene.userData.dynLightStartTime || now)) * 0.001;
    const dl = scene.userData.dynLight;
    dl.position.x = Math.cos(t * 0.7) * 2.5;
    dl.position.y = Math.sin(t * 0.5) * 1.8;
    dl.position.z = 3.0 + Math.sin(t * 1.1) * 0.6;
  }

  // Animate particles per rarity type
  if (particlesMesh) {
    const positions = particlesMesh.geometry.attributes.position.array;
    const speeds = particlesMesh.userData.speeds;
    const particleCount = speeds.length;
    const elapsed = (now - (particlesMesh.userData.startTime || now)) * 0.001;
    const delta = 0.016;

    for (let i = 0; i < particleCount; i++) {
      const sp = speeds[i];

      if (sp.type === 'orbit') {
        // Orbital motion around card center
        sp.angle += sp.orbit;
        positions[i * 3]     = Math.cos(sp.angle) * sp.radius;
        positions[i * 3 + 1] = Math.sin(sp.angle) * sp.radiusY;
        // Legendary inner ring pulses inward/outward
        if (sp.ring === 'inner') {
          const pulse = 1.0 + 0.08 * Math.sin(elapsed * 2.0 + i);
          positions[i * 3]     = Math.cos(sp.angle) * sp.radius * pulse;
          positions[i * 3 + 1] = Math.sin(sp.angle) * sp.radiusY * pulse;
        }
      } else {
        // Drift upward (Rare edge sparks)
        positions[i * 3 + 1] += sp.y * delta;
        positions[i * 3]     += sp.x * delta;
        if (positions[i * 3 + 1] > 2.3) {
          positions[i * 3 + 1] = -2.3;
          positions[i * 3]     = (Math.random() - 0.5) * 3.0;
        }
      }
    }
    particlesMesh.geometry.attributes.position.needsUpdate = true;

    // Pulse particle opacity for Epic
    if (props.rarity === 'Epic') {
      particlesMesh.material.opacity = 0.65 + 0.25 * Math.sin(elapsed * 1.5);
    }
  }

  // Spring tilt — 3-mode: instant on touch, smooth on hover, gentle return on idle
  const mode = isTouchTilting || isPinching ? 'touch' : isHovering ? 'hover' : 'release';
  const stiff = mode === 'touch' ? springStiffness : mode === 'hover' ? hoverStiffness : releaseStiffness;
  const damp = mode === 'touch' ? springDamping : mode === 'hover' ? hoverDamping : releaseDamping;
  const ax = (targetRotX - currentRotX) * stiff;
  const ay = (targetRotY - currentRotY) * stiff;
  velocityX = (velocityX + ax) * damp;
  velocityY = (velocityY + ay) * damp;
  currentRotX += velocityX;
  currentRotY += velocityY;

  if (!isFlipping) {
    cardGroup.rotation.x = currentRotY * 0.5;
    cardGroup.rotation.y = (isFlipped ? Math.PI : 0) + currentRotX * 0.5;
  }

  // Smooth scale interpolation
  const currentScale = renderedScale.value;
  const scaleDiff = cardScale.value - currentScale;
  renderedScale.value = currentScale + scaleDiff * 0.15;

  // === Reveal FX update ===
  if (revealFlash.value > 0.01) {
    revealFlash.value *= 0.90;
  } else if (revealFlash.value !== 0) {
    revealFlash.value = 0;
  }
  if (raysMesh) {
    raysOpacity += (raysTarget - raysOpacity) * 0.06;
    raysMesh.material.uniforms.uOpacity.value = raysOpacity;
    raysMesh.material.uniforms.uTime.value = now * 0.001;
  }
  if (bloomPass && bloomPass.strength > 0.001) {
    bloomPass.strength += (bloomTarget - bloomPass.strength) * 0.055;
    if (bloomPass.strength < 0.01 && bloomTarget === 0) bloomPass.strength = 0;
  }

  // Selama sekuens reveal / FX masih hidup, jangan turunkan framerate
  const fxActive = revealActive
    || revealFlash.value > 0
    || raysOpacity > 0.02
    || (bloomPass && bloomPass.strength > 0.01);
  if (fxActive) markActivity();

  // Render: pakai composer (bloom) hanya saat FX butuh, selebihnya langsung
  if (composer && (revealActive || (bloomPass && bloomPass.strength > 0.01))) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

// Pointer interaction calculations
const tiltFactor = () => props.mode === 'mini' ? 0.4 : 0.7;

let cachedRect = null;

function calcTilt(clientX, clientY) {
  let rect = cachedRect;
  if (!rect) {
    rect = containerRef.value?.getBoundingClientRect();
    if (!rect) return;
    if (isTouchTilting || isHovering) {
      cachedRect = rect;
    }
  }
  markActivity();
  const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
  targetRotX = x * tiltFactor();
  targetRotY = -y * tiltFactor();

  // Update gloss position
  glossX.value = ((clientX - rect.left) / rect.width) * 100;
  glossY.value = ((clientY - rect.top) / rect.height) * 100;

  // Update shader coordinates
  if (customShaderMaterial) {
    shaderUniforms.uMouseX.value = (clientX - rect.left) / rect.width;
    shaderUniforms.uMouseY.value = 1.0 - (clientY - rect.top) / rect.height;
  }
}

function onPointerMove(e) {
  isHovering = true;
  calcTilt(e.clientX, e.clientY);
}

// === UNIFIED TOUCH HANDLERS (single source of truth) ===
let isTouchTilting = false;
let isHovering = false; // desktop mouse hover tracking
let touchStartPos = { x: 0, y: 0 }; // untuk deteksi tap vs drag
const TAP_THRESHOLD = 8; // max pixel movement untuk dianggap "tap"

function onTouchStartTilt(e) {
  // Sentuhan pertama = user gesture yang sah untuk minta izin gyro (iOS)
  requestGyroFromGesture();

  // 2-finger: init pinch-to-zoom (only when allowed)
  if (e.touches.length === 2 && props.allowZoom && props.focused && props.mode !== 'mini') {
    if (e.cancelable) e.preventDefault();
    isPinching = true;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    initialPinchDist = Math.sqrt(dx * dx + dy * dy);
    initialScale = cardScale.value;
    return;
  }
  // 1-finger: start tilt tracking + record position for tap detection
  if (e.touches.length === 1) {
    if (e.cancelable) e.preventDefault(); // Prevent default scroll panning on touch start if cancelable
    isTouchTilting = true;
    cachedRect = containerRef.value?.getBoundingClientRect() || null;
    touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    calcTilt(e.touches[0].clientX, e.touches[0].clientY);
  }
}

function onTouchMoveTilt(e) {
  // 2-finger pinch-to-zoom
  if (e.touches.length === 2 && props.allowZoom && props.focused && props.mode !== 'mini') {
    if (e.cancelable) e.preventDefault();
    if (!isPinching) {
      isPinching = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDist = Math.sqrt(dx * dx + dy * dy);
      initialScale = cardScale.value;
    } else {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (initialPinchDist > 0) {
        const scaleFactor = dist / initialPinchDist;
        let targetScale = initialScale * scaleFactor;
        targetScale = Math.max(0.7, Math.min(2.0, targetScale));
        cardScale.value = targetScale;
      }
    }
    return;
  }

  // 1-finger tilt — works on ALL cards
  if (e.touches.length === 1 && !isPinching && isTouchTilting) {
    if (e.cancelable) e.preventDefault(); // Prevent default scroll panning on drag if cancelable
    calcTilt(e.touches[0].clientX, e.touches[0].clientY);
  }
}

function onTouchEndTilt(e) {
  // Deteksi TAP (sentuh tanpa geser) → trigger flip seperti click
  if (e.touches.length === 0 && isTouchTilting && !isPinching) {
    const dx = (e.changedTouches?.[0]?.clientX || touchStartPos.x) - touchStartPos.x;
    const dy = (e.changedTouches?.[0]?.clientY || touchStartPos.y) - touchStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < TAP_THRESHOLD) {
      // Ini TAP, bukan drag — trigger flip
      onClick();
    }
  }

  if (e.touches.length < 2) {
    isPinching = false;
  }
  if (e.touches.length === 0) {
    isTouchTilting = false;
    cachedRect = null; // Clear cached rect
    // Rekalibrasi baseline gyro ke orientasi HP saat ini setelah sentuhan lepas
    gyroBase = null;
    // Only reset targets if not also being hovered by mouse
    if (!isHovering) {
      targetRotX = 0;
      targetRotY = 0;
      glossX.value = 50;
      glossY.value = 50;
      if (customShaderMaterial) {
        shaderUniforms.uMouseX.value = 0.5;
        shaderUniforms.uMouseY.value = 0.5;
      }
    }
  }
}

function onPointerLeave() {
  isHovering = false;
  cachedRect = null; // Clear cached rect
  targetRotX = 0;
  targetRotY = 0;
  glossX.value = 50;
  glossY.value = 50;
  cardScale.value = 1.0;
  if (customShaderMaterial) {
    shaderUniforms.uMouseX.value = 0.5;
    shaderUniforms.uMouseY.value = 0.5;
  }
}

// === GYROSCOPE TILT (mobile) ===
// Miringkan HP → kartu ikut miring + hotspot holo bergeser, seperti memegang
// kartu holo fisik. Baseline dikalibrasi dari orientasi saat listener aktif /
// setelah sentuhan terakhir dilepas, jadi posisi pegang apapun jadi "netral".
let gyroAttached = false;
let gyroPermissionAsked = false;
let gyroBase = null;
const GYRO_RANGE = 25; // derajat kemiringan untuk tilt penuh

function onDeviceOrientation(e) {
  // Input pointer/touch selalu menang atas gyro
  if (isTouchTilting || isPinching || isHovering) { gyroBase = null; return; }
  if (e.beta == null || e.gamma == null) return;
  if (!gyroBase) gyroBase = { beta: e.beta, gamma: e.gamma };

  const dx = Math.max(-GYRO_RANGE, Math.min(GYRO_RANGE, e.gamma - gyroBase.gamma)) / GYRO_RANGE;
  const dy = Math.max(-GYRO_RANGE, Math.min(GYRO_RANGE, e.beta - gyroBase.beta)) / GYRO_RANGE;

  targetRotX = dx * tiltFactor();
  targetRotY = -dy * tiltFactor();
  glossX.value = 50 + dx * 50;
  glossY.value = 50 + dy * 50;
  if (customShaderMaterial) {
    shaderUniforms.uMouseX.value = 0.5 + dx * 0.5;
    shaderUniforms.uMouseY.value = 0.5 - dy * 0.5;
  }
  // Goyangan berarti = aktivitas (jangan turunkan ke 30fps saat kartu bergerak)
  if (Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08) markActivity();
}

function attachGyro() {
  if (gyroAttached) return;
  gyroAttached = true;
  window.addEventListener('deviceorientation', onDeviceOrientation);
}

// iOS 13+ hanya mengizinkan requestPermission dari user gesture,
// jadi dipanggil dari sentuhan pertama pada kartu
function requestGyroFromGesture() {
  if (gyroAttached || props.mode === 'mini') return;
  if (typeof window.DeviceOrientationEvent === 'undefined') return;
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    if (gyroPermissionAsked) return;
    gyroPermissionAsked = true;
    DeviceOrientationEvent.requestPermission()
      .then((state) => { if (state === 'granted') attachGyro(); })
      .catch(() => { /* ditolak → fallback touch-tilt yang sudah ada */ });
  } else {
    attachGyro();
  }
}

function onWheel(e) {
  if (props.mode === 'mini' || !props.allowZoom || !props.focused) return;
  e.preventDefault();
  const zoomSpeed = 0.08;
  let targetScale = cardScale.value - Math.sign(e.deltaY) * zoomSpeed;
  targetScale = Math.max(0.7, Math.min(2.0, targetScale));
  cardScale.value = targetScale;
}

function onClick() {
  if (isFlipping || revealActive) return;
  emit('click');
  if (props.allowZoom) {
    if (props.focused) {
      toggleFlip();
    }
  } else {
    toggleFlip();
  }
}

function toggleFlip() {
  if (isFlipping) return;
  isFlipping = true;
  flipStartTime = performance.now();
  isFlipped = !isFlipped;
  markActivity();
  emit('flip-start');
}

// Watch flipped prop
watch(() => props.flipped, (newVal) => {
  if (newVal !== isFlipped && !isFlipping) toggleFlip();
});

// Watch focused prop to scale up card preview
watch(() => props.focused, (newVal) => {
  if (newVal) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    cardScale.value = isMobile ? 1.65 : 2.0;
  } else {
    cardScale.value = 1.0;
  }
});

// Watch cardScale to bubble zoom status changes + jaga ketajaman saat zoom
watch(cardScale, (newVal) => {
  emit('zoom-change', newVal > 1.05);
  // Re-render buffer WebGL pada resolusi zoom (threshold hindari realokasi tiap
  // frame pinch). Hanya untuk kartu yang boleh di-zoom (detail), bukan grid.
  if (props.allowZoom && Math.abs(newVal - appliedZoomScale) > 0.12) {
    syncRenderScale();
  }
});

// Watch semua props kartu → rebuild in-place (texture, material, particle,
// lampu) tanpa membuat WebGL context baru. Ini yang membuat reveal gacha bisa
// pakai SATU instance Card3D untuk semua kartu.
watch([
  () => props.imageUrl,
  () => props.name,
  () => props.description,
  () => props.rarity,
  () => props.hypeScore,
  () => props.likesPerSec,
  () => props.element,
  () => props.foilStyle,
  () => props.imgZoom,
  () => props.imgOffsetX,
  () => props.imgOffsetY,
  () => props.dropRate
], () => {
  loadAndBuildCard();
});

function onResize() {
  if (!containerRef.value || !renderer || !camera) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer?.setSize(w, h);
}

// Saat kartu di-zoom, container di-perbesar via CSS transform sehingga buffer
// WebGL ikut di-upscale → blur. Naikkan pixelRatio proporsional dengan skala
// zoom agar kartu tetap tajam pada resolusi tampilnya (di-cap demi memori).
function syncRenderScale() {
  if (!renderer || !containerRef.value) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  if (w === 0 || h === 0) return;
  const baseCap = props.hd ? 3 : (props.mode === 'mini' ? quality.dprMini : quality.dpr);
  const baseRatio = Math.min(window.devicePixelRatio, baseCap);
  // Zoom-out (pinch < 1) tidak mengurangi resolusi di bawah baseline
  const eff = Math.min(baseRatio * Math.max(1, cardScale.value), 6);
  renderer.setPixelRatio(eff);
  renderer.setSize(w, h);
  if (composer) {
    composer.setPixelRatio?.(eff);
    composer.setSize(w, h);
  }
  appliedZoomScale = cardScale.value;
}

function cleanup() {
  stopLoop();
  disposeRevealResources();
  disposeParticles();
  disposeCardMesh();
  if (cardGroup && scene) scene.remove(cardGroup);
  [frontTexture, backTexture, envTexture].forEach(t => t?.dispose());
  frontTexture = backTexture = envTexture = null;
  cardGeo?.dispose();
  cardGeo = null;
  if (customShaderMaterial) customShaderMaterial.dispose();
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    renderer.domElement.parentNode?.removeChild(renderer.domElement);
    renderer.dispose();
    renderer.forceContextLoss();
  }
  scene = camera = renderer = cardGroup = cardFrontMesh = cardBackMesh = null;
  customShaderMaterial = null;
}

function onVisibilityChange() {
  syncLoopState();
}

// Recovery WebGL context yang hilang: bangun ulang seluruh scene setelah jeda
// singkat (transisi halaman biasanya sudah selesai & context lama terbebas).
let contextRecovering = false;
function onContextLost(e) {
  e.preventDefault(); // izinkan pemulihan
  stopLoop();
  if (contextRecovering) return;
  contextRecovering = true;
  setTimeout(() => {
    contextRecovering = false;
    if (!containerRef.value) return; // sudah unmount
    try { cleanup(); } catch { /* abaikan */ }
    try { initScene(); } catch { /* abaikan */ }
  }, 300);
}

onMounted(() => {
  nextTick(() => {
    initScene();
    if (containerRef.value) {
      // Only wheel needs addEventListener (touch is handled by template directives)
      containerRef.value.addEventListener('wheel', onWheel, { passive: false });

      // Pause render loop saat kartu keluar viewport (mis. di-scroll lewat)
      intersectionObserver = new IntersectionObserver((entries) => {
        isInViewport = entries[0]?.isIntersecting ?? true;
        syncLoopState();
      });
      intersectionObserver.observe(containerRef.value);
    }
    
    // Modern automatic resizing of WebGL canvas when DOM element changes size
    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      resizeObserver = new ResizeObserver(() => {
        onResize();
      });
      resizeObserver.observe(containerRef.value);
    }
  });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Gyro tanpa permission gate (Android/desktop) langsung aktif;
  // iOS menunggu sentuhan pertama (requestGyroFromGesture)
  if (props.mode !== 'mini'
    && typeof window.DeviceOrientationEvent !== 'undefined'
    && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    attachGyro();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  if (gyroAttached) window.removeEventListener('deviceorientation', onDeviceOrientation);
  intersectionObserver?.disconnect();
  intersectionObserver = null;
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (containerRef.value) {
    containerRef.value.removeEventListener('wheel', onWheel);
  }
  cleanup();
});
</script>
