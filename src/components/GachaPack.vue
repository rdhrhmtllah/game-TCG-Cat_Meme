<template>
  <div ref="containerRef" class="w-full relative" style="height: 100%; touch-action: none;"
    @mousedown="onDragStart" @mousemove="onDragMove" @mouseup="onDragEnd" @mouseleave="onDragEnd"
    @touchstart.prevent="onTouchStart" @touchmove.prevent="onTouchMove" @touchend="onDragEnd"
  >
    <!-- Vignette overlay -->
    <div
      class="absolute inset-0 z-10 pointer-events-none transition-opacity duration-500 rounded-xl"
      :style="{
        opacity: shaking || tearMode ? 1 : 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(7, 11, 26, 0.7) 100%)',
      }"
    />

    <!-- Tear progress indicator -->
    <div v-if="tearMode && !tearing" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div class="flex flex-col items-center gap-2">
        <p class="text-xs font-display text-white/60 animate-pulse">👆 Geser jari ke kanan untuk merobek</p>
        <div class="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-75"
            :style="{
              width: (tearProgressPercent * 100) + '%',
              background: tearProgressPercent > 0.8
                ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                : tearProgressPercent > 0.5
                  ? 'linear-gradient(90deg, #A855F7, #C084FC)'
                  : 'linear-gradient(90deg, #7C3AED, #8B5CF6)',
            }"
          />
        </div>
      </div>
    </div>

    <!-- Tear glow particles leaking from the opening (top strip line) -->
    <div v-if="tearMode && tearProgressPercent > 0.2"
      class="absolute inset-0 z-20 pointer-events-none">
      <span v-for="i in 12" :key="'tp'+i"
        class="absolute text-xs"
        :style="{
          left: (20 + tearProgressPercent * 55 + Math.sin(i * 0.9) * 8) + '%',
          top: (24 + Math.cos(i * 0.7) * 5) + '%',
          opacity: tearProgressPercent * 0.85,
          color: ['#FCD34D','#C084FC','#7DD3FC','#F59E0B','#A855F7'][i % 5],
          transform: `scale(${0.4 + tearProgressPercent * 0.9})`,
          transition: 'all 0.1s ease',
        }"
      >✦</span>
    </div>

    <!-- Screen flash for tear completion -->
    <div v-if="tearing"
      class="absolute inset-0 z-40 pointer-events-none rounded-xl"
      :style="{ opacity: flashOpacity, background: 'radial-gradient(circle at center, white 0%, rgba(124, 58, 237, 0.5) 50%, transparent 80%)' }"
    />

    <!-- Sparkle burst on tear completion -->
    <div v-if="tearing" class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
      <span v-for="i in 16" :key="'s'+i"
        class="absolute text-sm animate-sparkle"
        :style="{
          left: 25 + Math.sin(i * 0.393) * 25 + '%',
          top: 25 + Math.cos(i * 0.393) * 25 + '%',
          animationDelay: (i * 0.04) + 's',
          color: ['#FCD34D','#C084FC','#7DD3FC','#F59E0B','#A855F7','#38BDF8'][i % 6],
          fontSize: (8 + Math.random() * 8) + 'px',
        }"
      >✦</span>
    </div>

    <!-- Energy glow when shaking -->
    <div v-if="shaking"
      class="absolute inset-0 z-5 pointer-events-none flex items-center justify-center">
      <div class="w-40 h-40 rounded-full animate-energy-pulse"
        style="background: radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%);"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { getQualityConfig } from '@/utils/quality.js';
import { createEnvironmentTexture } from '@/utils/threeEnv.js';

const quality = getQualityConfig();
import * as THREE from 'three';

const props = defineProps({
  tearing: { type: Boolean, default: false },
  shaking: { type: Boolean, default: false },
  tearMode: { type: Boolean, default: false }, // Enable interactive tear
});

const emit = defineEmits(['tear-drag-complete', 'tear-animation-complete', 'tear-progress']);

const containerRef = ref(null);
const flashOpacity = ref(0);
const tearProgressPercent = ref(0);

let scene, camera, renderer, packGroup;
let packTopHalf, packBottomHalf, packWhole;
let envTexture = null;
let animationId = null;
let isInViewport = true;
let intersectionObserver = null;
let isDragging = false;
let isTearDragging = false;
let prevMouse = { x: 0, y: 0 };
let tearStartX = 0;
let rotationVelocity = { x: 0, y: 0 };
let packRotation = { x: 0, y: 0 };
let tearProgress = 0;
let shakeIntensity = 0;
let initRetries = 0;

const TEAR_THRESHOLD = ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 80 : 120;
const PACK_W = 1.7, PACK_H = 2.4, PACK_D = 0.30; // 50% thicker than before (was 0.20)

// ═══════════════════════════════════════════════════════════════
// TEXTURE FACTORY — 6 unique faces for a realistic booster pack
// ═══════════════════════════════════════════════════════════════

const TEX_W = 512, TEX_H = 720;
const CRIMP_H = 64; // height of the crimp seal strip at top

// Shared golden border gradient (used by front & back)
function goldBorderGrad(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#92400E');
  g.addColorStop(0.25, '#FCD34D');
  g.addColorStop(0.5, '#FEF9C3');
  g.addColorStop(0.75, '#FCD34D');
  g.addColorStop(1, '#92400E');
  return g;
}

// Shared holo-sheen stripes
function drawHoloStripes(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const holoColors = ['rgba(56,189,248,0.10)','rgba(168,85,247,0.10)','rgba(236,72,153,0.10)','rgba(34,211,238,0.10)'];
  for (let i = -h; i < w + h; i += 46) {
    ctx.strokeStyle = holoColors[((i + h) / 46 | 0) % holoColors.length];
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(i, -10);
    ctx.lineTo(i + h * 0.55, h + 10);
    ctx.stroke();
  }
  ctx.restore();
}

// Shared radiant starburst
function drawStarburst(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);
  const rayGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
  rayGrad.addColorStop(0, 'rgba(252,211,77,0.28)');
  rayGrad.addColorStop(0.4, 'rgba(168,85,247,0.10)');
  rayGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = rayGrad;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 16; i++) {
    ctx.rotate(Math.PI / 8);
    const rg = ctx.createLinearGradient(0, 0, 0, -radius);
    rg.addColorStop(0, 'rgba(252,211,77,0.18)');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(4, -radius); ctx.lineTo(-4, -radius);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Shared cat-head emblem
function drawCatEmblem(ctx, cx, cy, radius) {
  ctx.save();
  ctx.strokeStyle = '#1A0A3E';
  ctx.lineWidth = radius * 0.10;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.40, cy - radius * 0.09);
  ctx.lineTo(cx - radius * 0.49, cy - radius * 0.54);
  ctx.lineTo(cx - radius * 0.20, cy - radius * 0.31);
  ctx.quadraticCurveTo(cx, cy - radius * 0.43, cx + radius * 0.20, cy - radius * 0.31);
  ctx.lineTo(cx + radius * 0.49, cy - radius * 0.54);
  ctx.lineTo(cx + radius * 0.40, cy - radius * 0.09);
  ctx.quadraticCurveTo(cx + radius * 0.43, cy + radius * 0.37, cx, cy + radius * 0.43);
  ctx.quadraticCurveTo(cx - radius * 0.43, cy + radius * 0.37, cx - radius * 0.40, cy - radius * 0.09);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = '#1A0A3E';
  ctx.beginPath();
  ctx.ellipse(cx - radius * 0.16, cy + radius * 0.03, radius * 0.06, radius * 0.09, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + radius * 0.16, cy + radius * 0.03, radius * 0.06, radius * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Shared corner ornaments
function drawCorners(ctx, w, h, margin, crimpOffset) {
  const cs = 22;
  ctx.strokeStyle = 'rgba(252,211,77,0.5)';
  ctx.lineWidth = 2.5;
  const top = crimpOffset + margin;
  const bottom = h - margin;
  [[margin, top, 1, 1], [w - margin, top, -1, 1], [margin, bottom, 1, -1], [w - margin, bottom, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + cs * dy);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cs * dx, y);
    ctx.stroke();
  });
}

// ─────────────────────────────────────────────────────────────
// FACE 1: FRONT — Hero booster pack artwork
// ─────────────────────────────────────────────────────────────
function createPackFrontTexture() {
  const w = TEX_W, h = TEX_H;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const cx = w / 2;

  // Deep cosmic violet foil base
  const bgGrad = ctx.createLinearGradient(0, 0, w * 0.4, h);
  bgGrad.addColorStop(0, '#0B0420');
  bgGrad.addColorStop(0.25, '#2D1B69');
  bgGrad.addColorStop(0.5, '#6D28D9');
  bgGrad.addColorStop(0.72, '#2D1B69');
  bgGrad.addColorStop(1, '#0B0420');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  drawHoloStripes(ctx, w, h);

  // Radiant burst behind emblem
  drawStarburst(ctx, cx, h * 0.34, 230);

  // ── Top crimp strip (tear zone) ───────────────────────
  const crimpGrad = ctx.createLinearGradient(0, 0, 0, CRIMP_H);
  crimpGrad.addColorStop(0, '#1A0A3E');
  crimpGrad.addColorStop(1, '#3B0764');
  ctx.fillStyle = crimpGrad;
  ctx.fillRect(0, 0, w, CRIMP_H);

  // Serrated tear perforation
  ctx.strokeStyle = 'rgba(252,211,77,0.50)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 14) {
    ctx.lineTo(x, CRIMP_H + (x % 28 === 0 ? -4 : 4));
  }
  ctx.stroke();

  // "TEAR HERE" bilingual
  ctx.fillStyle = 'rgba(252,211,77,0.55)';
  ctx.font = '700 13px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('◄  ROBEK DI SINI | TEAR HERE  ►', cx, 38);

  // ── Gold foil outer border ────────────────────────────
  ctx.strokeStyle = goldBorderGrad(ctx, w, h);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(12, CRIMP_H + 6, w - 24, h - CRIMP_H - 24, 14);
  ctx.stroke();
  // Inner thin rim
  ctx.strokeStyle = 'rgba(254,249,195,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(24, CRIMP_H + 16, w - 48, h - CRIMP_H - 44, 10);
  ctx.stroke();

  // ── Holographic medallion ─────────────────────────────
  const ey = h * 0.34;
  const medGrad = ctx.createRadialGradient(cx - 18, ey - 18, 5, cx, ey, 72);
  medGrad.addColorStop(0, '#FEF9C3');
  medGrad.addColorStop(0.45, '#FBBF24');
  medGrad.addColorStop(0.75, '#A855F7');
  medGrad.addColorStop(1, '#4C1D95');
  ctx.fillStyle = medGrad;
  ctx.beginPath();
  ctx.arc(cx, ey, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = goldBorderGrad(ctx, w, h);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(cx, ey, 60, 0, Math.PI * 2);
  ctx.stroke();

  drawCatEmblem(ctx, cx, ey, 70);

  // ── Title lockup ──────────────────────────────────────
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FEF9C3';
  ctx.font = '900 46px Outfit, Inter, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText('MEMECATS', cx, h * 0.56);
  ctx.shadowBlur = 0;
  // Set banner
  const banGrad = ctx.createLinearGradient(cx - 130, 0, cx + 130, 0);
  banGrad.addColorStop(0, '#7C3AED');
  banGrad.addColorStop(0.5, '#C026D3');
  banGrad.addColorStop(1, '#7C3AED');
  ctx.fillStyle = banGrad;
  ctx.beginPath();
  ctx.roundRect(cx - 135, h * 0.585, 270, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#FEF9C3';
  ctx.font = '800 19px Outfit, sans-serif';
  ctx.fillText('VIRAL TREASURES', cx, h * 0.585 + 24);
  ctx.restore();

  // ── Booster label ─────────────────────────────────────
  ctx.fillStyle = 'rgba(226,232,240,0.85)';
  ctx.font = '600 15px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOOSTER PACK', cx, h * 0.70);

  // ── Bottom info bar ───────────────────────────────────
  ctx.fillStyle = 'rgba(11,4,32,0.75)';
  ctx.beginPath();
  ctx.roundRect(40, h - 78, w - 80, 38, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(252,211,77,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#FCD34D';
  ctx.font = '700 17px Outfit, sans-serif';
  ctx.fillText('5 KARTU  •  100 🪙', cx, h - 53);

  drawCorners(ctx, w, h, 40, CRIMP_H + 30);

  return new THREE.CanvasTexture(canvas);
}

// ─────────────────────────────────────────────────────────────
// FACE 2: BACK — Alternate design with set details
// ─────────────────────────────────────────────────────────────
function createPackBackTexture() {
  const w = TEX_W, h = TEX_H;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const cx = w / 2;

  // Dark navy/obsidian gradient (mysterious night vibe)
  const bgGrad = ctx.createRadialGradient(cx, h * 0.45, 40, cx, h * 0.5, w * 0.75);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(0.5, '#020617');
  bgGrad.addColorStop(1, '#000000');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle hexagon grid pattern
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#FCD34D';
  ctx.lineWidth = 1;
  const hexR = 28;
  const hexH = hexR * Math.sqrt(3);
  for (let row = -2; row < h / hexH + 2; row++) {
    const offsetX = row % 2 === 0 ? 0 : hexR * 1.5;
    for (let col = -2; col < w / (hexR * 3) + 2; col++) {
      const hx = col * hexR * 3 + offsetX;
      const hy = row * hexH * 0.5;
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const angle = Math.PI / 3 * s - Math.PI / 6;
        const px = hx + hexR * Math.cos(angle);
        const py = hy + hexR * Math.sin(angle);
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // Diagonal holo sheen (opposite direction from front)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = -h; i < w + h; i += 52) {
    ctx.strokeStyle = ['rgba(245,158,11,0.06)','rgba(168,85,247,0.06)','rgba(56,189,248,0.06)'][i % 3];
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(i, -10);
    ctx.lineTo(i - h * 0.55, h + 10);
    ctx.stroke();
  }
  ctx.restore();

  // ── Bottom crimp strip ────────────────────────────────
  const crimpGrad = ctx.createLinearGradient(0, h - CRIMP_H, 0, h);
  crimpGrad.addColorStop(0, '#3B0764');
  crimpGrad.addColorStop(1, '#1A0A3E');
  ctx.fillStyle = crimpGrad;
  ctx.fillRect(0, h - CRIMP_H, w, CRIMP_H);
  ctx.strokeStyle = 'rgba(252,211,77,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 14) {
    ctx.lineTo(x, h - CRIMP_H + (x % 28 === 0 ? 4 : -4));
  }
  ctx.stroke();

  // ── Outer gold foil border ────────────────────────────
  ctx.strokeStyle = goldBorderGrad(ctx, w, h);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(12, 18, w - 24, h - CRIMP_H - 36, 14);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(254,249,195,0.30)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(24, 28, w - 48, h - CRIMP_H - 56, 10);
  ctx.stroke();

  // ── Central emblem (smaller, lower) ───────────────────
  const ey = h * 0.32;
  const medGrad = ctx.createRadialGradient(cx - 12, ey - 12, 3, cx, ey, 55);
  medGrad.addColorStop(0, '#1A0A3E');
  medGrad.addColorStop(0.6, '#2D1B69');
  medGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = medGrad;
  ctx.beginPath();
  ctx.arc(cx, ey, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = goldBorderGrad(ctx, w, h);
  ctx.stroke();

  drawCatEmblem(ctx, cx, ey, 52);

  // ── Set information panel ─────────────────────────────
  ctx.save();
  ctx.textAlign = 'center';

  // Collection title
  ctx.fillStyle = '#FCD34D';
  ctx.font = '900 30px Outfit, Inter, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 6;
  ctx.fillText('MEMECATS', cx, h * 0.48);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = '#C084FC';
  ctx.font = '700 14px Outfit, sans-serif';
  ctx.fillText('THE VIRAL COLLECTION', cx, h * 0.52);

  // Divider
  const divGrad = ctx.createLinearGradient(cx - 120, 0, cx + 120, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.5, 'rgba(252,211,77,0.5)');
  divGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 120, h * 0.545); ctx.lineTo(cx + 120, h * 0.545);
  ctx.stroke();

  // Contents description
  ctx.fillStyle = 'rgba(203,213,225,0.9)';
  ctx.font = '600 14px Inter, sans-serif';
  ctx.fillText('ISI / CONTENTS:', cx, h * 0.58);
  ctx.font = '500 13px Inter, sans-serif';
  ctx.fillStyle = 'rgba(203,213,225,0.7)';
  const contents = [
    '✦  5 Kartu Virtual Acak',
    '✦  Minimal 1 Rare atau lebih tinggi',
    '✦  Kesempatan Legendary 3%',
  ];
  contents.forEach((t, i) => ctx.fillText(t, cx, h * 0.61 + i * 22));

  // Barcode area
  ctx.fillStyle = 'rgba(30,41,59,0.9)';
  ctx.beginPath();
  ctx.roundRect(cx - 100, h * 0.73, 200, 42, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(252,211,77,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Fake barcode lines
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.2;
  const bx = cx - 80, by = h * 0.73 + 8;
  for (let i = 0; i < 35; i++) {
    const lh = 10 + Math.abs(Math.sin(i * 0.7)) * 16;
    ctx.beginPath();
    ctx.moveTo(bx + i * 4.5, by);
    ctx.lineTo(bx + i * 4.5, by + lh);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(203,213,225,0.5)';
  ctx.font = '9px monospace';
  ctx.fillText('MC-BST-001', cx, h * 0.73 + 36);

  // Bottom legal text
  ctx.fillStyle = 'rgba(148,163,184,0.4)';
  ctx.font = '8px Inter, sans-serif';
  ctx.fillText('© 2025 MemeCats TCG. All rights reserved.', cx, h - CRIMP_H - 24);
  ctx.fillText('Made with ❤️ for the viral community.', cx, h - CRIMP_H - 13);

  ctx.restore();

  drawCorners(ctx, w, h, 40, 30);

  return new THREE.CanvasTexture(canvas);
}

// ─────────────────────────────────────────────────────────────
// FACE 3 & 4: LEFT/RIGHT SIDES — decorative element strip
// ─────────────────────────────────────────────────────────────
function createPackSideTexture() {
  const sw = 128, sh = 720;
  const canvas = document.createElement('canvas');
  canvas.width = sw; canvas.height = sh;
  const ctx = canvas.getContext('2d');

  // Metallic foil base with cosmic purple tint
  const grad = ctx.createLinearGradient(0, 0, sw, 0);
  grad.addColorStop(0, '#1E1040');
  grad.addColorStop(0.2, '#3B1F7E');
  grad.addColorStop(0.5, '#5B3FAD');
  grad.addColorStop(0.8, '#2D1B69');
  grad.addColorStop(1, '#1E1040');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, sw, sh);

  // ── Element icons down the strip ──────────────────────
  const elements = [
    { emoji: '🔥', y: 0.12, color: '#F59E0B', label: 'FIRE' },
    { emoji: '💧', y: 0.24, color: '#38BDF8', label: 'WATER' },
    { emoji: '🌿', y: 0.36, color: '#4ADE80', label: 'GRASS' },
    { emoji: '⚡', y: 0.48, color: '#FBBF24', label: 'VOLT' },
    { emoji: '🌑', y: 0.60, color: '#C084FC', label: 'DARK' },
    { emoji: '✨', y: 0.72, color: '#FCD34D', label: 'MYTH' },
    { emoji: '❄️', y: 0.84, color: '#93C5FD', label: 'ICE' },
  ];

  ctx.textAlign = 'center';
  elements.forEach((el) => {
    const ey = sh * el.y;

    // Glow circle behind each icon
    const glow = ctx.createRadialGradient(sw/2, ey, 2, sw/2, ey, 32);
    glow.addColorStop(0, el.color + '40');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sw/2, ey, 32, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.font = '20px serif';
    ctx.fillText(el.emoji, sw/2, ey + 7);

    // Small label
    ctx.fillStyle = el.color + '99';
    ctx.font = '700 7px Outfit, sans-serif';
    ctx.fillText(el.label, sw/2, ey + 22);
  });

  // ── Decorative dots along edges ────────────────────────
  for (let y = 15; y < sh - 15; y += 38) {
    ctx.fillStyle = 'rgba(252,211,77,0.35)';
    ctx.beginPath();
    ctx.arc(12, y, 2.5, 0, Math.PI * 2);
    ctx.arc(sw - 12, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Connecting vertical lines ──────────────────────────
  ctx.strokeStyle = 'rgba(252,211,77,0.15)';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 8]);
  ctx.beginPath();
  ctx.moveTo(12, 10);
  ctx.lineTo(12, sh - 10);
  ctx.moveTo(sw - 12, 10);
  ctx.lineTo(sw - 12, sh - 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Top & bottom cap markers ───────────────────────────
  ['rgba(252,211,77,0.5)', 'rgba(192,132,252,0.5)'].forEach((color, i) => {
    const cy = i === 0 ? 42 : sh - 42;
    ctx.fillStyle = color;
    ctx.font = '700 8px Outfit, sans-serif';
    ctx.fillText(i === 0 ? '▲' : '▼', sw/2, cy + 3);
  });

  // ── Metallic sheen overlay ─────────────────────────────
  const sheenGrad = ctx.createLinearGradient(0, 0, sw, 0);
  sheenGrad.addColorStop(0, 'rgba(255,255,255,0.00)');
  sheenGrad.addColorStop(0.35, 'rgba(255,255,255,0.04)');
  sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  sheenGrad.addColorStop(0.65, 'rgba(255,255,255,0.04)');
  sheenGrad.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 0, sw, sh);

  return new THREE.CanvasTexture(canvas);
}

// ─────────────────────────────────────────────────────────────
// FACE 5: TOP — Crimp seal (the part you tear open)
// ─────────────────────────────────────────────────────────────
function createPackTopTexture() {
  const tw = 512, th = 128;
  const canvas = document.createElement('canvas');
  canvas.width = tw; canvas.height = th;
  const ctx = canvas.getContext('2d');

  // Dark foil base
  const grad = ctx.createLinearGradient(0, 0, 0, th);
  grad.addColorStop(0, '#1A0A3E');
  grad.addColorStop(0.5, '#3B0764');
  grad.addColorStop(1, '#1A0A3E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, tw, th);

  // Serrated crimp pattern (zigzag perforation)
  ctx.strokeStyle = 'rgba(252,211,77,0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= tw; x += 14) {
    const zigY = th / 2 + (x % 28 === 0 ? -8 : 8);
    x === 0 ? ctx.moveTo(x, zigY) : ctx.lineTo(x, zigY);
  }
  ctx.stroke();

  // Crimp ridges (horizontal lines simulating the pressed seal)
  for (let y = 0; y < th; y += 6) {
    const alpha = 0.05 + Math.abs(Math.sin(y * 0.5)) * 0.10;
    ctx.strokeStyle = `rgba(252,211,77,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(tw, y + (y % 12 === 0 ? 1 : -0.5));
    ctx.stroke();
  }

  // Metallic sheen
  const sheenGrad = ctx.createLinearGradient(0, 0, 0, th);
  sheenGrad.addColorStop(0, 'rgba(255,255,255,0.00)');
  sheenGrad.addColorStop(0.4, 'rgba(255,255,255,0.07)');
  sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  sheenGrad.addColorStop(0.6, 'rgba(255,255,255,0.07)');
  sheenGrad.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 0, tw, th);

  // "TEAR HERE" label
  ctx.fillStyle = 'rgba(252,211,77,0.6)';
  ctx.font = '700 13px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ ROBEK / TEAR ⚡', tw / 2, th / 2 + 5);

  return new THREE.CanvasTexture(canvas);
}

// ─────────────────────────────────────────────────────────────
// FACE 6: BOTTOM — Bottom crimp seal (mirrored)
// ─────────────────────────────────────────────────────────────
function createPackBottomTexture() {
  const tw = 512, th = 128;
  const canvas = document.createElement('canvas');
  canvas.width = tw; canvas.height = th;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, th);
  grad.addColorStop(0, '#1A0A3E');
  grad.addColorStop(0.5, '#3B0764');
  grad.addColorStop(1, '#1A0A3E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, tw, th);

  // Crimp zigzag
  ctx.strokeStyle = 'rgba(252,211,77,0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= tw; x += 14) {
    const zigY = th / 2 + (x % 28 === 0 ? 8 : -8);
    x === 0 ? ctx.moveTo(x, zigY) : ctx.lineTo(x, zigY);
  }
  ctx.stroke();

  // Crimp ridges
  for (let y = 0; y < th; y += 6) {
    const alpha = 0.05 + Math.abs(Math.sin(y * 0.5)) * 0.10;
    ctx.strokeStyle = `rgba(252,211,77,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(tw, y + (y % 12 === 0 ? -1 : 0.5));
    ctx.stroke();
  }

  // Metallic sheen
  const sheenGrad = ctx.createLinearGradient(0, 0, 0, th);
  sheenGrad.addColorStop(0, 'rgba(255,255,255,0.00)');
  sheenGrad.addColorStop(0.4, 'rgba(255,255,255,0.07)');
  sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  sheenGrad.addColorStop(0.6, 'rgba(255,255,255,0.07)');
  sheenGrad.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 0, tw, th);

  // Serial number
  ctx.fillStyle = 'rgba(252,211,77,0.3)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MC-PACK-2025  |  BATCH #0042', tw / 2, th / 2 + 4);

  return new THREE.CanvasTexture(canvas);
}

function initScene() {
  if (!containerRef.value) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  if (w === 0 || h === 0) {
    if (initRetries < 15) { initRetries++; requestAnimationFrame(() => initScene()); }
    return;
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.dpr));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  containerRef.value.appendChild(renderer.domElement);

  // Ensure canvas receives touch events properly on mobile
  renderer.domElement.style.touchAction = 'none';

  // Environment map — foil metalik pack memantulkan "ruangan" (per-renderer,
  // render target PMREM terikat context ini)
  envTexture = createEnvironmentTexture(renderer);
  scene.environment = envTexture;
  scene.environmentIntensity = 0.75;

  // ── Dramatic lighting for foil pack ────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.50));
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.15);
  mainLight.position.set(3, 5, 8);
  scene.add(mainLight);
  const rimLight = new THREE.DirectionalLight(0x7C3AED, 0.50);
  rimLight.position.set(-3, -2, 4);
  scene.add(rimLight);
  const goldRim = new THREE.DirectionalLight(0xF59E0B, 0.35);
  goldRim.position.set(2, -3, 5);
  scene.add(goldRim);
  // Top-down accent light to catch the crimp seal
  const topAccent = new THREE.DirectionalLight(0xffffff, 0.40);
  topAccent.position.set(0, 6, 1);
  scene.add(topAccent);

  packGroup = new THREE.Group();
  scene.add(packGroup);

  // ── Generate all 6 unique textures ─────────────────────
  const frontTex = createPackFrontTexture();
  const backTex = createPackBackTexture();
  const sideTex = createPackSideTexture();
  const topTex = createPackTopTexture();
  const bottomTex = createPackBottomTexture();

  // ── Foil-like materials (high metalness, low roughness) ─
  const frontMat = new THREE.MeshStandardMaterial({
    map: frontTex,
    roughness: 0.22,
    metalness: 0.55,
    emissive: new THREE.Color(0x2D1B69),
    emissiveIntensity: 0.08,
  });
  const backMat = new THREE.MeshStandardMaterial({
    map: backTex,
    roughness: 0.22,
    metalness: 0.55,
    emissive: new THREE.Color(0x0F172A),
    emissiveIntensity: 0.05,
  });
  const sideMat = new THREE.MeshStandardMaterial({
    map: sideTex,
    roughness: 0.30,
    metalness: 0.50,
    emissive: new THREE.Color(0x1E293B),
    emissiveIntensity: 0.03,
  });
  const topCrimpMat = new THREE.MeshStandardMaterial({
    map: topTex,
    roughness: 0.25,
    metalness: 0.60,
    emissive: new THREE.Color(0x1A0A3E),
    emissiveIntensity: 0.06,
  });
  const bottomCrimpMat = new THREE.MeshStandardMaterial({
    map: bottomTex,
    roughness: 0.25,
    metalness: 0.60,
    emissive: new THREE.Color(0x1A0A3E),
    emissiveIntensity: 0.06,
  });

  // ── BOX — pack geometry ──
  const packGeo = new THREE.BoxGeometry(PACK_W, PACK_H, PACK_D);

  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  const packMaterials = [
    sideMat,         // +X right side
    sideMat,         // -X left side
    topCrimpMat,     // +Y top crimp seal
    bottomCrimpMat,  // -Y bottom crimp seal
    frontMat,        // +Z front artwork
    backMat,         // -Z back details
  ];
  packWhole = new THREE.Mesh(packGeo, packMaterials);
  packGroup.add(packWhole);

  // ── Rip-open pieces (BoxGeometry — hanya saat animasi sobek) ──
  const STRIP_H = 0.34;
  const BODY_H = PACK_H - STRIP_H;
  const stripGeo = new THREE.BoxGeometry(PACK_W, STRIP_H, PACK_D);
  const bodyGeo = new THREE.BoxGeometry(PACK_W, BODY_H, PACK_D);

  // +X(0), -X(1), +Y(2), -Y(3), +Z(4), -Z(5)
  const tearMats = [
    sideMat.clone(),         // 0: +X right
    sideMat.clone(),         // 1: -X left
    topCrimpMat.clone(),     // 2: +Y top
    bottomCrimpMat.clone(),  // 3: -Y bottom
    frontMat.clone(),        // 4: +Z front
    backMat.clone(),         // 5: -Z back
  ];

  packTopHalf = new THREE.Mesh(stripGeo, tearMats.map(m => m.clone()));
  packTopHalf.position.y = (PACK_H / 2) - (STRIP_H / 2);
  packTopHalf.visible = false;
  packTopHalf.userData = { stripH: STRIP_H, bodyH: BODY_H };
  packGroup.add(packTopHalf);

  packBottomHalf = new THREE.Mesh(bodyGeo, tearMats.map(m => m.clone()));
  packBottomHalf.position.y = -(STRIP_H / 2);
  packBottomHalf.visible = false;
  packGroup.add(packBottomHalf);

  startLoop();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (!packGroup || !renderer || !scene || !camera) return;

  const now = performance.now() * 0.001;

  // Idle floating
  if (!isDragging && !isTearDragging && !props.shaking && !props.tearing && !props.tearMode) {
    packGroup.position.y = Math.sin(now * 1.2) * 0.05;
    rotationVelocity.x *= 0.97;
    rotationVelocity.y *= 0.97;
    packRotation.y += 0.003 + rotationVelocity.x;
    packRotation.x += rotationVelocity.y;
  }

  // Tear mode: face forward, stop rotation
  if (props.tearMode && !props.tearing) {
    // Gradually return to front-facing
    packRotation.x *= 0.9;
    packRotation.y *= 0.9;

    // Interactive rip progress — top strip peels sideways (Pokémon TCG Pocket style)
    if (tearProgressPercent.value > 0.05) {
      packWhole.visible = false;
      packTopHalf.visible = true;
      packBottomHalf.visible = true;

      const p = tearProgressPercent.value;
      const strip = packTopHalf.userData.stripH || 0.34;
      const baseY = (PACK_H / 2) - (strip / 2);
      // Strip slides to the right, lifts up, tilts and curls as it's torn
      packTopHalf.position.x = p * 1.9;
      packTopHalf.position.y = baseY + p * 0.35;
      packTopHalf.position.z = p * 0.25;
      packTopHalf.rotation.z = -p * 0.5;
      packTopHalf.rotation.y = p * 0.6;

      // Body stays put but trembles slightly as it opens
      packBottomHalf.position.x = Math.sin(now * 30) * p * 0.015;

      // Glow intensity based on progress (light leaking out of the opening)
      const emissiveIntensity = p * 0.4;
      packTopHalf.material?.forEach?.(m => { if (m.emissiveIntensity !== undefined) m.emissiveIntensity = emissiveIntensity; });
      packBottomHalf.material?.forEach?.(m => { if (m.emissiveIntensity !== undefined) m.emissiveIntensity = emissiveIntensity; });
    } else {
      packWhole.visible = true;
      packTopHalf.visible = false;
      packBottomHalf.visible = false;
    }
  }

  // Shake effect
  if (props.shaking) {
    shakeIntensity = Math.min(shakeIntensity + 0.008, 0.12);
    const freq = 20 + shakeIntensity * 80;
    packGroup.position.x = Math.sin(now * freq) * shakeIntensity;
    packGroup.position.y = Math.cos(now * (freq * 1.15)) * shakeIntensity * 0.7;
    packRotation.x = Math.sin(now * freq * 0.8) * shakeIntensity * 0.3;
    packRotation.y = Math.cos(now * freq * 0.6) * shakeIntensity * 0.2;
  } else {
    shakeIntensity = Math.max(shakeIntensity - 0.015, 0);
    if (!isDragging && !props.tearMode) { packGroup.position.x *= 0.92; }
  }

  // Tear completion animation
  if (props.tearing) {
    tearProgress = Math.min(tearProgress + 0.025, 1);
    flashOpacity.value = Math.sin(tearProgress * Math.PI) * 0.7;

    const s = 1 - tearProgress * 0.4;
    packGroup.scale.set(s, s, s);
    packGroup.rotation.z = tearProgress * 0.4;
    packGroup.position.y = tearProgress * -0.8;

    // Strip flies off to the side, body drops away
    if (packTopHalf.visible) {
      const strip = packTopHalf.userData.stripH || 0.34;
      const baseY = (PACK_H / 2) - (strip / 2);
      packTopHalf.position.x = 1.9 + tearProgress * 5;
      packTopHalf.position.y = baseY + tearProgress * 2;
      packTopHalf.rotation.z = -0.5 - tearProgress * 2;
      packTopHalf.rotation.y = 0.6 + tearProgress * 2;
      packBottomHalf.position.y = -(strip / 2) - tearProgress * 3;
      packBottomHalf.rotation.x = tearProgress * 0.4;
    }

    if (tearProgress > 0.7) { packGroup.visible = tearProgress < 0.95; }

    if (tearProgress >= 1) { emit('tear-animation-complete'); }
  }

  packGroup.rotation.x = packRotation.x;
  packGroup.rotation.y = packRotation.y;

  renderer.render(scene, camera);
}

// Drag handlers — direct 1:1 finger tracking (TCG-style)
let dragStartRotation = { x: 0, y: 0 };
let dragStartMouse = { x: 0, y: 0 };
const DRAG_ROTATE_FACTOR = 0.008; // direct mapping: pixel delta → radians

function onDragStart(e) {
  if (props.tearMode && !props.tearing) {
    isTearDragging = true;
    tearStartX = e.clientX;
  } else if (!props.tearMode) {
    isDragging = true;
    dragStartRotation = { x: packRotation.x, y: packRotation.y };
    dragStartMouse = { x: e.clientX, y: e.clientY };
  }
  prevMouse = { x: e.clientX, y: e.clientY };
}

function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  if (props.tearMode && !props.tearing) {
    isTearDragging = true;
    tearStartX = e.touches[0].clientX;
  } else if (!props.tearMode) {
    isDragging = true;
    dragStartRotation = { x: packRotation.x, y: packRotation.y };
    dragStartMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}

function onDragMove(e) {
  if (isTearDragging) {
    const dx = e.clientX - tearStartX;
    const progress = Math.max(0, Math.min(1, dx / TEAR_THRESHOLD));
    tearProgressPercent.value = progress;
    emit('tear-progress', progress);
  } else if (isDragging) {
    // Direct 1:1 mapping: finger delta → rotation (no velocity lag)
    const dx = e.clientX - dragStartMouse.x;
    const dy = e.clientY - dragStartMouse.y;
    packRotation.y = dragStartRotation.y + dx * DRAG_ROTATE_FACTOR;
    packRotation.x = dragStartRotation.x + dy * DRAG_ROTATE_FACTOR;
    // Store velocity for decay after release
    rotationVelocity.x = (e.clientX - prevMouse.x) * 0.008;
    rotationVelocity.y = (e.clientY - prevMouse.y) * 0.008;
    prevMouse = { x: e.clientX, y: e.clientY };
  }
}

function onTouchMove(e) {
  if (e.touches.length !== 1) return;
  if (isTearDragging) {
    const dx = e.touches[0].clientX - tearStartX;
    const progress = Math.max(0, Math.min(1, dx / TEAR_THRESHOLD));
    tearProgressPercent.value = progress;
    emit('tear-progress', progress);
  } else if (isDragging) {
    // Direct 1:1 mapping: finger delta → rotation (no velocity lag)
    const dx = e.touches[0].clientX - dragStartMouse.x;
    const dy = e.touches[0].clientY - dragStartMouse.y;
    packRotation.y = dragStartRotation.y + dx * DRAG_ROTATE_FACTOR;
    packRotation.x = dragStartRotation.x + dy * DRAG_ROTATE_FACTOR;
    // Store velocity for decay after release
    rotationVelocity.x = (e.touches[0].clientX - prevMouse.x) * 0.015;
    rotationVelocity.y = (e.touches[0].clientY - prevMouse.y) * 0.015;
    prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
}

function onDragEnd() {
  if (isTearDragging) {
    if (tearProgressPercent.value >= 0.70) {
      // Tear complete!
      tearProgressPercent.value = 1;
      emit('tear-drag-complete');
    } else {
      // Spring back
      tearProgressPercent.value = 0;
    }
    isTearDragging = false;
  }
  isDragging = false;
}

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
  stopLoop();
  envTexture?.dispose();
  envTexture = null;
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
  scene = camera = renderer = packGroup = packWhole = packTopHalf = packBottomHalf = null;
}

function startLoop() {
  if (animationId === null && renderer) animationId = requestAnimationFrame(animate);
}

function stopLoop() {
  if (animationId !== null) { cancelAnimationFrame(animationId); animationId = null; }
}

// Loop hanya jalan saat pack terlihat & tab aktif
function syncLoopState() {
  if (isInViewport && !document.hidden) startLoop();
  else stopLoop();
}

watch(() => props.tearing, (val) => {
  if (val) { tearProgress = 0; if (packGroup) { packGroup.visible = true; packGroup.scale.set(1,1,1); } }
});

watch(() => props.tearMode, (val) => {
  if (val) {
    tearProgressPercent.value = 0;
    // Ensure halves start hidden
    if (packTopHalf) packTopHalf.visible = false;
    if (packBottomHalf) packBottomHalf.visible = false;
    if (packWhole) packWhole.visible = true;
  }
});

function onVisibilityChange() {
  syncLoopState();
}

onMounted(() => {
  nextTick(() => {
    initScene();
    if (containerRef.value) {
      intersectionObserver = new IntersectionObserver((entries) => {
        isInViewport = entries[0]?.isIntersecting ?? true;
        syncLoopState();
      });
      intersectionObserver.observe(containerRef.value);
    }
  });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  intersectionObserver?.disconnect();
  intersectionObserver = null;
  cleanup();
});

defineExpose({
  tearProgressPercent,
});
</script>
