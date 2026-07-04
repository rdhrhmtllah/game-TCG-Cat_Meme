<template>
  <div ref="containerRef" class="w-full relative" style="height: 100%; touch-action: none;"
    @mousedown="onDragStart" @mousemove="onDragMove" @mouseup="onDragEnd" @mouseleave="onDragEnd"
    @touchstart.prevent="onTouchStart" @touchmove.prevent="onTouchMove" @touchend="onTouchEnd"
  >
    <!-- Vignette overlay -->
    <div
      class="absolute inset-0 z-10 pointer-events-none transition-opacity duration-500 rounded-xl"
      :style="{
        opacity: shaking || tearMode || selectMode ? 1 : 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(7, 11, 26, 0.7) 100%)',
      }"
    />

    <!-- Hint pilih pack (carousel) -->
    <div v-if="selectMode && !focusedPack" class="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-full text-center">
      <p class="text-xs font-display text-legendary/90 animate-pulse">✨ Geser untuk memutar • Tap pack pilihanmu</p>
    </div>

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
      <span v-for="i in 14" :key="'tp'+i"
        class="absolute text-xs"
        :style="{
          left: (18 + tearProgressPercent * 58 + Math.sin(i * 0.9) * 8) + '%',
          top: (22 + Math.cos(i * 0.7) * 6) + '%',
          opacity: tearProgressPercent * 0.9,
          color: ['#FCD34D','#FEF08A','#F59E0B','#FBBF24','#FFF7D6'][i % 5],
          transform: `scale(${0.4 + tearProgressPercent * 1.1})`,
          transition: 'all 0.1s ease',
        }"
      >✦</span>
    </div>

    <!-- Screen flash for tear completion -->
    <div v-if="tearing"
      class="absolute inset-0 z-40 pointer-events-none rounded-xl"
      :style="{ opacity: flashOpacity, background: 'radial-gradient(circle at center, white 0%, rgba(252, 211, 77, 0.55) 45%, transparent 80%)' }"
    />

    <!-- Sparkle burst on tear completion -->
    <div v-if="tearing" class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
      <span v-for="i in 22" :key="'s'+i"
        class="absolute text-sm animate-sparkle"
        :style="{
          left: 25 + Math.sin(i * 0.286) * (18 + (i % 3) * 9) + '%',
          top: 25 + Math.cos(i * 0.286) * (18 + (i % 3) * 9) + '%',
          animationDelay: (i * 0.035) + 's',
          color: ['#FCD34D','#FEF08A','#F59E0B','#FBBF24','#FFFBEB','#C084FC'][i % 6],
          fontSize: (8 + Math.random() * 10) + 'px',
        }"
      >✦</span>
    </div>

    <!-- Energy glow when shaking -->
    <div v-if="shaking"
      class="absolute inset-0 z-5 pointer-events-none flex items-center justify-center">
      <div class="w-40 h-40 rounded-full animate-energy-pulse"
        style="background: radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, transparent 70%);"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as THREE from 'three';
import { getQualityConfig } from '@/utils/quality.js';
import { createEnvironmentTexture } from '@/utils/threeEnv.js';
import { ensureFontsLoaded } from '@/utils/fonts.js';

const quality = getQualityConfig();

const props = defineProps({
  tearing: { type: Boolean, default: false },
  shaking: { type: Boolean, default: false },
  tearMode: { type: Boolean, default: false },   // Enable interactive tear
  selectMode: { type: Boolean, default: false }, // Carousel pilih pack (spin transition)
});

const emit = defineEmits(['tear-drag-complete', 'tear-animation-complete', 'tear-progress', 'pack-selected']);

const containerRef = ref(null);
const flashOpacity = ref(0);
const tearProgressPercent = ref(0);
const focusedPack = ref(false); // true saat pack pilihan sedang di-zoom

let scene, camera, renderer;
let packGroup = null;                 // group pack aktif (idle & tear)
let packWhole, packTopHalf, packBottomHalf, leakMesh;
let envTexture = null;
let animationId = null;
let isInViewport = true;
let intersectionObserver = null;
let resizeObserver = null;
let isDragging = false;
let isTearDragging = false;
let prevMouse = { x: 0, y: 0 };
let tearStartX = 0;
let rotationVelocity = { x: 0, y: 0 };
let packRotation = { x: 0, y: 0 };
let tearProgress = 0;
let tearP = 0;          // progress sobek TER-SMOOTH (lerp) — anti kaku
let shakeIntensity = 0;
let initRetries = 0;
let lastFrameTime = 0;
let baseCamZ = 5;

// Easing untuk journey sobekan
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
const disposables = []; // geometry/material/texture yang harus di-dispose

const TEAR_THRESHOLD = ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 80 : 120;

// ═══════════════════════════════════════════════════════════════
// DIMENSI POUCH (bungkus foil, BUKAN kotak)
// ═══════════════════════════════════════════════════════════════
const PACK_W = 1.72, PACK_H = 2.98; // ramping & jangkung seperti foil pack asli
const CORE_D = 0.04;    // ketebalan inti wrapper — tipis, sleek
const BULGE = 0.06;     // gembungan halus saja (jangan gendut)
const CRIMP = 0.27;     // tinggi zona crimp seal atas & bawah
const TEETH = 12;       // jumlah gerigi zigzag di tepi crimp
const TOOTH_H = 0.032;
const STRIP_H = 0.44;   // tinggi strip sobekan atas (termasuk crimp)
const TEAR_Y = PACK_H / 2 - STRIP_H; // garis sobek (koordinat pack)

// ═══════════════════════════════════════════════════════════════
// TEXTURE — desain hitam-emas ala referensi:
// foil matte gelap + grid halus, frame emas tipis, emblem kucing
// mahkota dalam lingkaran emas, wordmark MEMECATS emas
// ═══════════════════════════════════════════════════════════════
const TEX_W = 512, TEX_H = 888; // aspek disamakan dgn PACK_W/PACK_H (0.577)
const CRIMP_PX = Math.round((CRIMP / PACK_H) * TEX_H);

function goldGrad(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#8A5A0B');
  g.addColorStop(0.3, '#FCD34D');
  g.addColorStop(0.5, '#FEF3C7');
  g.addColorStop(0.7, '#FCD34D');
  g.addColorStop(1, '#8A5A0B');
  return g;
}

// Emblem kucing mahkota (wink) dalam lingkaran emas — pusat desain
function drawGoldCatEmblem(ctx, cx, cy, R) {
  ctx.save();
  ctx.strokeStyle = goldGrad(ctx, cx - R, cy - R, cx + R, cy + R);
  ctx.lineWidth = R * 0.085;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(252,211,77,0.55)';
  ctx.shadowBlur = 18;

  // Lingkaran emblem
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 6;
  const r = R * 0.62;

  // Mahkota
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy - r * 0.44);
  ctx.lineTo(cx - r * 0.52, cy - r * 0.92);
  ctx.lineTo(cx - r * 0.2, cy - r * 0.62);
  ctx.lineTo(cx, cy - r * 1.0);
  ctx.lineTo(cx + r * 0.2, cy - r * 0.62);
  ctx.lineTo(cx + r * 0.52, cy - r * 0.92);
  ctx.lineTo(cx + r * 0.42, cy - r * 0.44);
  ctx.stroke();

  // Kepala kucing (telinga + wajah membulat)
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.30, cy - r * 0.38);
  ctx.lineTo(cx - r * 0.66, cy - r * 0.66);
  ctx.lineTo(cx - r * 0.62, cy - r * 0.05);
  ctx.quadraticCurveTo(cx - r * 0.55, cy + r * 0.52, cx, cy + r * 0.62);
  ctx.quadraticCurveTo(cx + r * 0.55, cy + r * 0.52, cx + r * 0.62, cy - r * 0.05);
  ctx.lineTo(cx + r * 0.66, cy - r * 0.66);
  ctx.lineTo(cx + r * 0.30, cy - r * 0.38);
  ctx.stroke();

  // Kumis
  ctx.lineWidth = R * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.68, cy + r * 0.14); ctx.lineTo(cx - r * 1.02, cy + r * 0.08);
  ctx.moveTo(cx - r * 0.68, cy + r * 0.30); ctx.lineTo(cx - r * 1.02, cy + r * 0.32);
  ctx.moveTo(cx + r * 0.68, cy + r * 0.14); ctx.lineTo(cx + r * 1.02, cy + r * 0.08);
  ctx.moveTo(cx + r * 0.68, cy + r * 0.30); ctx.lineTo(cx + r * 1.02, cy + r * 0.32);
  ctx.stroke();

  // Mata: kiri terbuka, kanan wink (garis) — playful seperti referensi
  ctx.fillStyle = '#FCD34D';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.24, cy + r * 0.06, r * 0.085, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.13, cy + r * 0.06);
  ctx.lineTo(cx + r * 0.36, cy + r * 0.06);
  ctx.stroke();

  // Hidung kecil
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.05, cy + r * 0.30);
  ctx.lineTo(cx + r * 0.05, cy + r * 0.30);
  ctx.lineTo(cx, cy + r * 0.37);
  ctx.closePath();
  ctx.fillStyle = '#FCD34D';
  ctx.fill();

  ctx.restore();
}

// Zona crimp: garis lipatan vertikal rapat (kesan foil terjepit mesin)
function drawCrimpBand(ctx, y0, height) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, y0, 0, y0 + height);
  grad.addColorStop(0, '#17171C');
  grad.addColorStop(0.5, '#0C0C10');
  grad.addColorStop(1, '#17171C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y0, TEX_W, height);
  for (let x = 4; x < TEX_W; x += 9) {
    ctx.strokeStyle = 'rgba(255,235,180,0.05)';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x, y0 + 3); ctx.lineTo(x, y0 + height - 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x + 3.5, y0 + 3); ctx.lineTo(x + 3.5, y0 + height - 3); ctx.stroke();
  }
  // Garis emas tipis pembatas crimp
  ctx.strokeStyle = 'rgba(252,211,77,0.35)';
  ctx.lineWidth = 1.5;
  const yLine = y0 < TEX_H / 2 ? y0 + height - 2 : y0 + 2;
  ctx.beginPath(); ctx.moveTo(0, yLine); ctx.lineTo(TEX_W, yLine); ctx.stroke();
  ctx.restore();
}

// Desain LENGKAP wrapper (dipakai utuh & di-slice untuk potongan sobekan)
function drawWrapperDesign(ctx, isBack = false) {
  const w = TEX_W, h = TEX_H, cx = w / 2;

  // ── Base foil hitam matte dengan sheen halus ──
  const bg = ctx.createLinearGradient(0, 0, w * 0.35, h);
  bg.addColorStop(0, '#131318');
  bg.addColorStop(0.4, '#0A0A0E');
  bg.addColorStop(0.72, '#101014');
  bg.addColorStop(1, '#08080B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Grid diagonal halus (tekstur foil ala referensi)
  ctx.save();
  ctx.strokeStyle = 'rgba(252,211,77,0.045)';
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 26) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke();
  }
  ctx.restore();

  // Sheen diagonal lembut (highlight foil)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, 'rgba(255,244,214,0)');
  sheen.addColorStop(0.42, 'rgba(255,244,214,0.05)');
  sheen.addColorStop(0.5, 'rgba(255,244,214,0.10)');
  sheen.addColorStop(0.58, 'rgba(255,244,214,0.05)');
  sheen.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Crimp seal atas & bawah
  drawCrimpBand(ctx, 0, CRIMP_PX);
  drawCrimpBand(ctx, h - CRIMP_PX, CRIMP_PX);

  // ── Frame emas tipis + baut sudut ──
  const fx = 26, fy = CRIMP_PX + 16;
  const fw = w - fx * 2, fh = h - CRIMP_PX * 2 - 32;
  ctx.save();
  ctx.strokeStyle = 'rgba(252,211,77,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(fx, fy, fw, fh, 14);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(252,211,77,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(fx + 5, fy + 5, fw - 10, fh - 10, 10);
  ctx.stroke();
  // Baut emas di 4 sudut frame
  [[fx + 10, fy + 10], [fx + fw - 10, fy + 10], [fx + 10, fy + fh - 10], [fx + fw - 10, fy + fh - 10]].forEach(([bx, by]) => {
    const bg2 = ctx.createRadialGradient(bx - 1.5, by - 1.5, 0.5, bx, by, 5);
    bg2.addColorStop(0, '#FEF3C7');
    bg2.addColorStop(0.5, '#F59E0B');
    bg2.addColorStop(1, '#6B4308');
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();

  if (!isBack) {
    // ── FRONT: emblem + wordmark ──
    drawGoldCatEmblem(ctx, cx, h * 0.40, 92);

    // MEMECATS — emas tebal dengan bevel
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 58px "Outfit", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.shadowColor = 'rgba(245,158,11,0.5)';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = '#3A2504';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText('MEMECATS', cx, h * 0.665);
    const tg = ctx.createLinearGradient(0, h * 0.665 - 44, 0, h * 0.665 + 8);
    tg.addColorStop(0, '#FEF3C7');
    tg.addColorStop(0.45, '#FCD34D');
    tg.addColorStop(1, '#B45309');
    ctx.fillStyle = tg;
    ctx.fillText('MEMECATS', cx, h * 0.665);
    ctx.shadowBlur = 0;

    // THE VIRAL COLLECTION
    ctx.font = '700 17px "Outfit", sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillStyle = 'rgba(252,211,77,0.75)';
    ctx.fillText('THE VIRAL COLLECTION', cx, h * 0.725);
    ctx.letterSpacing = '0px';
    // Garis pengapit kecil
    ctx.strokeStyle = 'rgba(252,211,77,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 150, h * 0.75); ctx.lineTo(cx - 40, h * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 40, h * 0.75); ctx.lineTo(cx + 150, h * 0.75); ctx.stroke();
    ctx.fillStyle = 'rgba(252,211,77,0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.744); ctx.lineTo(cx + 6, h * 0.75); ctx.lineTo(cx, h * 0.756); ctx.lineTo(cx - 6, h * 0.75);
    ctx.closePath(); ctx.fill();

    // 5 KARTU • 100 KOIN kecil di bawah
    ctx.font = '600 13px "Inter", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = 'rgba(210,190,140,0.5)';
    ctx.fillText('5 CARDS PER PACK', cx, h * 0.82);
    ctx.letterSpacing = '0px';
    ctx.restore();
  } else {
    // ── BACK: emblem kecil + fake barcode/legal ──
    drawGoldCatEmblem(ctx, cx, h * 0.34, 60);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 26px "Outfit", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(252,211,77,0.8)';
    ctx.fillText('MEMECATS', cx, h * 0.5);
    ctx.font = '500 11px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(210,190,140,0.45)';
    ctx.letterSpacing = '1px';
    ctx.fillText('BOOSTER PACK • 5 RANDOM CARDS', cx, h * 0.55);
    ctx.fillText('MC-PACK-2026 | BATCH #0042', cx, h * 0.585);
    // Fake barcode
    ctx.letterSpacing = '0px';
    let bx = cx - 80;
    while (bx < cx + 80) {
      const bwid = 1.5 + Math.random() * 4;
      ctx.fillStyle = 'rgba(230,215,170,0.55)';
      ctx.fillRect(bx, h * 0.66, bwid, 44);
      bx += bwid + 2 + Math.random() * 4;
    }
    ctx.restore();
  }

  // Vignette tepi
  ctx.save();
  const vig = ctx.createRadialGradient(cx, h / 2, h * 0.28, cx, h / 2, h * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Zigzag alpha cut di tepi crimp (dipanggil setelah desain digambar)
function cutZigzagEdge(ctx, w, edgeY, dir) {
  // dir -1 = potong ke atas dari edgeY (tepi atas), +1 = ke bawah (tepi bawah)
  // Skala gerigi disamakan dengan silhouette geometri core
  const toothPx = (TOOTH_H / PACK_H) * TEX_H;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  const n = TEETH;
  if (dir < 0) {
    ctx.moveTo(0, edgeY - 1);
    for (let i = 0; i <= n; i++) {
      const x0 = (i / n) * w;
      ctx.lineTo(x0, edgeY + (i % 2 === 0 ? toothPx : 0));
    }
    ctx.lineTo(w, -20); ctx.lineTo(0, -20);
  } else {
    ctx.moveTo(0, edgeY + 1);
    for (let i = 0; i <= n; i++) {
      const x0 = (i / n) * w;
      ctx.lineTo(x0, edgeY - (i % 2 === 0 ? toothPx : 0));
    }
    ctx.lineTo(w, TEX_H + 20); ctx.lineTo(0, TEX_H + 20);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Tepi sobekan tak beraturan (alpha) + sliver foil terang = kesan "brewek"
function tornEdge(ctx, w, edgeY, dir) {
  ctx.save();
  // Potong tak beraturan
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(0, edgeY);
  let x = 0;
  const pts = [];
  while (x < w) {
    const ny = edgeY + dir * (Math.random() * 7);
    pts.push([x, ny]);
    ctx.lineTo(x, ny);
    x += 6 + Math.random() * 14;
  }
  pts.push([w, edgeY]);
  ctx.lineTo(w, edgeY);
  ctx.lineTo(w, edgeY - dir * 40);
  ctx.lineTo(0, edgeY - dir * 40);
  ctx.closePath();
  ctx.fill();
  // Sliver foil perak-emas di tepi sobekan
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255,240,200,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.stroke();
  ctx.restore();
}

// Canvas texture: 'whole' | 'strip' | 'body', front/back
function createWrapperTexture(part, isBack) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  const stripPx = Math.round((STRIP_H / PACK_H) * TEX_H);
  canvas.height = part === 'whole' ? TEX_H : part === 'strip' ? stripPx : TEX_H - stripPx;
  const ctx = canvas.getContext('2d');
  if (part === 'body') ctx.translate(0, -stripPx);
  drawWrapperDesign(ctx, isBack);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Zigzag cut di tepi crimp
  if (part === 'whole' || part === 'strip') cutZigzagEdge(ctx, TEX_W, 2, -1);
  if (part === 'whole' || part === 'body') cutZigzagEdge(ctx, TEX_W, canvas.height - 2, 1);
  // Tepi sobekan tak beraturan
  if (part === 'strip') tornEdge(ctx, TEX_W, canvas.height - 2, 1);
  if (part === 'body') tornEdge(ctx, TEX_W, 2, -1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  disposables.push(tex);
  return tex;
}

// ═══════════════════════════════════════════════════════════════
// GEOMETRI POUCH — lembar depan/belakang menggembung (pillow) +
// core tipis dengan silhouette zigzag untuk ketebalan tepi
// ═══════════════════════════════════════════════════════════════

// Gembungan bantal: 0 di tepi kiri/kanan & zona crimp, max di tengah
function pillow(x, gy) {
  const nx = Math.min(Math.abs(x) / (PACK_W / 2), 1);
  const fx = Math.pow(Math.cos(nx * Math.PI / 2), 0.62);
  const bodyHalf = PACK_H / 2 - CRIMP;
  const ny = Math.min(Math.abs(gy) / bodyHalf, 1);
  const fy = Math.pow(Math.cos(ny * Math.PI / 2), 0.42);
  return BULGE * fx * fy;
}

// Outline wrapper (untuk core): zigzag di tepi crimp, lurus di garis sobek
function buildOutlineShape(yBottom, yTop, zigBottom, zigTop) {
  const s = new THREE.Shape();
  const W2 = PACK_W / 2;
  const step = PACK_W / TEETH;
  s.moveTo(-W2, yBottom);
  if (zigBottom) {
    for (let i = 0; i <= TEETH; i++) {
      s.lineTo(-W2 + i * step, yBottom + (i % 2 === 0 ? 0 : TOOTH_H));
    }
  } else {
    s.lineTo(W2, yBottom);
  }
  s.lineTo(W2, yTop);
  if (zigTop) {
    for (let i = 0; i <= TEETH; i++) {
      s.lineTo(W2 - i * step, yTop - (i % 2 === 0 ? 0 : TOOTH_H));
    }
  } else {
    s.lineTo(-W2, yTop);
  }
  s.lineTo(-W2, yBottom);
  return s;
}

// Inti wrapper harus nyaris hitam pekat — env map dikecilkan supaya tidak
// memantul jadi abu-abu murahan
const coreMaterial = new THREE.MeshStandardMaterial({
  color: 0x050508, roughness: 0.7, metalness: 0.15, envMapIntensity: 0.25,
});
disposables.push(coreMaterial);

function buildSheetGeometry(yBottom, yTop) {
  const height = yTop - yBottom;
  const centerY = (yBottom + yTop) / 2;
  const geo = new THREE.PlaneGeometry(PACK_W, height, 30, 40);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const gy = pos.getY(i) + centerY; // koordinat pack global
    pos.setZ(i, CORE_D / 2 + pillow(x, gy));
  }
  geo.computeVertexNormals();
  disposables.push(geo);
  return { geo, centerY };
}

function makeSheetMaterial(tex) {
  // Matte black foil premium: specular ada tapi terkendali — highlight
  // muncul sebagai sheen lembut yang bergerak saat pack dirotasi
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.44,
    metalness: 0.5,
    envMapIntensity: 0.65,
    transparent: true,
    alphaTest: 0.35,
    emissive: new THREE.Color(0x120C02),
    emissiveIntensity: 0.06,
  });
  disposables.push(mat);
  return mat;
}

// Bangun satu unit pouch utuh (core + sheet depan + sheet belakang)
function buildPouchUnit() {
  const group = new THREE.Group();

  const coreGeo = new THREE.ExtrudeGeometry(
    buildOutlineShape(-PACK_H / 2, PACK_H / 2, true, true),
    { depth: CORE_D, bevelEnabled: false }
  );
  coreGeo.translate(0, 0, -CORE_D / 2);
  disposables.push(coreGeo);
  const core = new THREE.Mesh(coreGeo, coreMaterial);
  group.add(core);

  const { geo: sheetGeo } = buildSheetGeometry(-PACK_H / 2, PACK_H / 2);
  const front = new THREE.Mesh(sheetGeo, makeSheetMaterial(createWrapperTexture('whole', false)));
  group.add(front);
  const back = new THREE.Mesh(sheetGeo, makeSheetMaterial(createWrapperTexture('whole', true)));
  back.rotation.y = Math.PI;
  group.add(back);

  group.userData.sheets = [front, back];
  return group;
}

// Potongan sobekan (strip atas + badan) — dibuat sekali, dipakai pack aktif
function buildTearPieces() {
  // Strip atas: crimp + gerigi atas, tepi bawah = garis sobek
  const stripGroup = new THREE.Group();
  const stripCoreGeo = new THREE.ExtrudeGeometry(
    buildOutlineShape(TEAR_Y, PACK_H / 2, false, true),
    { depth: CORE_D, bevelEnabled: false }
  );
  const stripCenterY = (TEAR_Y + PACK_H / 2) / 2;
  stripCoreGeo.translate(0, -stripCenterY, -CORE_D / 2);
  disposables.push(stripCoreGeo);
  stripGroup.add(new THREE.Mesh(stripCoreGeo, coreMaterial));
  {
    const { geo } = buildSheetGeometry(TEAR_Y, PACK_H / 2);
    geo.translate(0, 0, 0); // geometry lokal sudah centered di plane
    const front = new THREE.Mesh(geo, makeSheetMaterial(createWrapperTexture('strip', false)));
    const back = new THREE.Mesh(geo, makeSheetMaterial(createWrapperTexture('strip', true)));
    back.rotation.y = Math.PI;
    stripGroup.add(front, back);
    stripGroup.userData.sheets = [front, back];
  }
  stripGroup.userData.baseY = stripCenterY;
  stripGroup.position.y = stripCenterY;

  // Badan: dari bawah sampai garis sobek
  const bodyGroup = new THREE.Group();
  const bodyCoreGeo = new THREE.ExtrudeGeometry(
    buildOutlineShape(-PACK_H / 2, TEAR_Y, true, false),
    { depth: CORE_D, bevelEnabled: false }
  );
  const bodyCenterY = (-PACK_H / 2 + TEAR_Y) / 2;
  bodyCoreGeo.translate(0, -bodyCenterY, -CORE_D / 2);
  disposables.push(bodyCoreGeo);
  bodyGroup.add(new THREE.Mesh(bodyCoreGeo, coreMaterial));
  {
    const { geo } = buildSheetGeometry(-PACK_H / 2, TEAR_Y);
    const front = new THREE.Mesh(geo, makeSheetMaterial(createWrapperTexture('body', false)));
    const back = new THREE.Mesh(geo, makeSheetMaterial(createWrapperTexture('body', true)));
    back.rotation.y = Math.PI;
    bodyGroup.add(front, back);
    bodyGroup.userData.sheets = [front, back];
  }
  bodyGroup.userData.baseY = bodyCenterY;
  bodyGroup.position.y = bodyCenterY;

  return { stripGroup, bodyGroup };
}

// Cahaya emas bocor dari garis sobekan (intensitas ∝ progress)
function buildLeakMesh() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 32, 4, 128, 32, 128);
  g.addColorStop(0, 'rgba(255,248,220,1)');
  g.addColorStop(0.35, 'rgba(252,211,77,0.8)');
  g.addColorStop(1, 'rgba(245,158,11,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  disposables.push(tex);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  disposables.push(mat);
  const geo = new THREE.PlaneGeometry(PACK_W * 1.05, 0.3);
  disposables.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, TEAR_Y, CORE_D / 2 + 0.02);
  return mesh;
}

// ═══════════════════════════════════════════════════════════════
// CAROUSEL PILIH PACK
// ═══════════════════════════════════════════════════════════════
const SELECT_COUNT = 4;
const RING_R = 1.7;
let carouselGroup = null;
let packUnits = [];         // unit pouch di carousel (index 0 = pack utama)
let carouselAngle = 0;
let spinVel = 0;
let focusAnim = null;       // { chosen, t, others }
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

function enterCarousel() {
  if (!scene || carouselGroup || !packGroup) return;
  focusedPack.value = false;
  carouselGroup = new THREE.Group();
  scene.add(carouselGroup);

  // Pack utama ikut masuk carousel + tambahan unit baru
  packGroup.visible = false;
  packUnits = [];
  for (let i = 0; i < SELECT_COUNT; i++) {
    const unit = buildPouchUnit();
    unit.userData.index = i;
    carouselGroup.add(unit);
    packUnits.push(unit);
  }
  carouselAngle = 0;
  spinVel = 5.2; // rad/s — transisi BERPUTAR kencang, mereda ke idle
}

function exitCarousel(keepUnit) {
  if (!carouselGroup) return;
  packUnits.forEach((u) => {
    if (u !== keepUnit) carouselGroup.remove(u);
  });
  if (keepUnit) {
    carouselGroup.remove(keepUnit);
    scene.add(keepUnit);
  }
  scene.remove(carouselGroup);
  carouselGroup = null;
  packUnits = [];
}

function trySelectPack(clientX, clientY) {
  if (!carouselGroup || focusAnim) return;
  const rect = containerRef.value.getBoundingClientRect();
  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(carouselGroup.children, true);
  if (!hits.length) return;
  let obj = hits[0].object;
  while (obj && !packUnits.includes(obj)) obj = obj.parent;
  if (!obj) return;

  // Mulai animasi fokus: pilihan ke depan-tengah, sisanya menyingkir
  focusedPack.value = true;
  focusAnim = {
    chosen: obj,
    t: 0,
    starts: new Map(packUnits.map((u) => [u, {
      pos: u.position.clone(),
      rot: u.rotation.y,
      scale: u.scale.x,
    }])),
  };
}

// ═══════════════════════════════════════════════════════════════
// SCENE
// ═══════════════════════════════════════════════════════════════
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
  camera.position.z = baseCamZ = 5;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.dpr));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  containerRef.value.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  // Environment map — refleksi lingkungan dijaga rendah supaya foil hitam
  // tetap pekat (terlalu kuat = pack terlihat abu-abu)
  envTexture = createEnvironmentTexture(renderer);
  scene.environment = envTexture;
  scene.environmentIntensity = 0.55;

  // Lighting dramatis emas
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(3, 5, 8);
  scene.add(mainLight);
  const goldRim = new THREE.DirectionalLight(0xF59E0B, 0.75);
  goldRim.position.set(-4, -2, 4);
  scene.add(goldRim);
  const goldRim2 = new THREE.DirectionalLight(0xFCD34D, 0.45);
  goldRim2.position.set(4, -3, 5);
  scene.add(goldRim2);
  const topAccent = new THREE.DirectionalLight(0xffffff, 0.4);
  topAccent.position.set(0, 6, 1);
  scene.add(topAccent);

  // Pack utama (idle & tear) — texture menggambar wordmark, jadi WAJIB
  // menunggu font siap dulu (kalau tidak, MEMECATS ter-render font sistem)
  ensureFontsLoaded().then(() => {
    if (!scene) return;
    packGroup = new THREE.Group();
    scene.add(packGroup);
    packWhole = buildPouchUnit();
    packGroup.add(packWhole);

    const pieces = buildTearPieces();
    packTopHalf = pieces.stripGroup;
    packBottomHalf = pieces.bodyGroup;
    packTopHalf.visible = false;
    packBottomHalf.visible = false;
    packGroup.add(packTopHalf, packBottomHalf);

    leakMesh = buildLeakMesh();
    leakMesh.visible = false;
    packGroup.add(leakMesh);

    // Kalau user sudah keburu masuk mode pilih pack sebelum font siap
    if (props.selectMode && !carouselGroup) enterCarousel();
  });

  startLoop();
}

function setPieceEmissive(group, value) {
  group.userData.sheets?.forEach((mesh) => {
    mesh.material.emissiveIntensity = value;
  });
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (!scene || !renderer || !camera) return;

  const nowMs = performance.now();
  const now = nowMs * 0.001;
  const dt = Math.min((nowMs - (lastFrameTime || nowMs)) * 0.001, 0.05);
  lastFrameTime = nowMs;

  // ── CAROUSEL: pack BERPUTAR, user memilih ──
  if (carouselGroup) {
    if (!focusAnim) {
      spinVel += (0.35 - spinVel) * (1 - Math.exp(-dt * 1.6)); // mereda mulus
      carouselAngle += spinVel * dt;
      packUnits.forEach((u, i) => {
        const a = carouselAngle + (i * Math.PI * 2) / SELECT_COUNT;
        const x = Math.sin(a) * RING_R;
        const z = Math.cos(a) * RING_R - 0.9;
        u.position.set(x, Math.sin(now * 1.6 + i * 1.7) * 0.05, z);
        u.rotation.y = -x * 0.22;
        const depth = (z + RING_R + 0.9) / (RING_R * 2); // 0..1
        const s = 0.66 + depth * 0.3;
        u.scale.set(s, s, s);
      });
    } else {
      // Fokus ke pack pilihan
      focusAnim.t = Math.min(focusAnim.t + dt * 1.6, 1);
      const t = focusAnim.t;
      const ease = 1 - Math.pow(1 - t, 3);
      packUnits.forEach((u) => {
        const s0 = focusAnim.starts.get(u);
        if (u === focusAnim.chosen) {
          u.position.lerpVectors(s0.pos, new THREE.Vector3(0, 0, 0.4), ease);
          u.rotation.y = s0.rot * (1 - ease) + Math.PI * 2 * ease; // satu putaran penuh saat maju
          const sc = s0.scale + (1.0 - s0.scale) * ease;
          u.scale.set(sc, sc, sc);
        } else {
          const dir = s0.pos.x >= 0 ? 1 : -1;
          u.position.set(
            s0.pos.x + dir * ease * 4.5,
            s0.pos.y - ease * 0.6,
            s0.pos.z - ease * 2.5
          );
          u.rotation.y = s0.rot + ease * dir * 2.2;
          u.userData.sheets?.forEach((m) => { m.material.opacity = 1 - ease; });
        }
      });
      if (t >= 1) {
        const chosen = focusAnim.chosen;
        focusAnim = null;
        exitCarousel(chosen);
        // Pack pilihan jadi pack aktif: pindahkan visualnya ke packGroup
        scene.remove(chosen);
        packGroup.visible = true;
        packWhole.visible = true;
        packGroup.position.set(0, 0, 0.4);
        packRotation.x = 0; packRotation.y = 0;
        emit('pack-selected');
      }
    }
  }

  if (!packGroup) { renderer.render(scene, camera); return; }

  // Idle floating (pack tunggal)
  if (!carouselGroup && !isDragging && !isTearDragging && !props.shaking && !props.tearing && !props.tearMode && !props.selectMode) {
    packGroup.position.y = Math.sin(now * 1.2) * 0.05;
    rotationVelocity.x *= 0.97;
    rotationVelocity.y *= 0.97;
    packRotation.y += 0.003 + rotationVelocity.x;
    packRotation.x += rotationVelocity.y;
  }

  // Tear mode: hadap depan + strip peel interaktif (SMOOTHED — bukan 1:1)
  if (props.tearMode && !props.tearing) {
    packRotation.x *= 0.9;
    packRotation.y *= 0.9;
    packGroup.position.z += (0.4 - packGroup.position.z) * 0.08;

    // Progress dirender lewat lerp: jari berhenti → strip masih "mengejar"
    // dengan lembut; lepas → spring-back halus, tidak menyentak
    tearP += (tearProgressPercent.value - tearP) * Math.min(dt * 14, 1);

    if (tearP > 0.02) {
      packWhole.visible = false;
      packTopHalf.visible = true;
      packBottomHalf.visible = true;
      leakMesh.visible = true;

      const p = tearP;
      const pe = easeOutQuad(p);
      const baseY = packTopHalf.userData.baseY;
      // Flutter: strip bergetar seperti foil sungguhan saat ditarik
      const flutter = Math.sin(now * 17) * 0.02 * p + Math.sin(now * 31) * 0.008 * p;

      // Strip terkelupas: naik melengkung, melintir, DAN menggulung ke belakang
      packTopHalf.position.x = pe * 2.1;
      packTopHalf.position.y = baseY + pe * 0.38 + flutter * 0.5;
      packTopHalf.position.z = pe * 0.34;
      packTopHalf.rotation.z = -pe * 0.62 + flutter;
      packTopHalf.rotation.y = pe * 0.85;
      packTopHalf.rotation.x = -pe * 0.38; // curl ke belakang seperti foil terkelupas

      // Badan ikut miring dikit melawan tarikan + getar naik bertahap
      packBottomHalf.position.x = Math.sin(now * 30) * p * p * 0.02;
      packBottomHalf.rotation.z = -pe * 0.03;

      // Cahaya emas bocor dari celah — ramp lembut + flicker hidup
      const leak = clamp01((p - 0.08) / 0.92);
      leakMesh.material.opacity = easeOutQuad(leak) * (0.8 + Math.sin(now * 21) * 0.14 + Math.sin(now * 47) * 0.06);
      leakMesh.scale.set(0.35 + leak * 0.95, 0.4 + leak * 1.8, 1);

      setPieceEmissive(packTopHalf, leak * 0.5);
      setPieceEmissive(packBottomHalf, leak * 0.5);
    } else {
      packWhole.visible = true;
      packTopHalf.visible = false;
      packBottomHalf.visible = false;
      leakMesh.visible = false;
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
    if (!isDragging && !props.tearMode && !carouselGroup) { packGroup.position.x *= 0.92; }
  }

  // Tear completion — BREWEK sinematik berfase:
  // [0–0.45] RIP: strip meledak lepas berputar tumbling + camera punch
  // [0.2–1 ] FALL: badan jatuh floaty dengan sway, cahaya meledak
  if (props.tearing) {
    tearProgress = Math.min(tearProgress + dt / 1.5, 1);
    const t = tearProgress;
    const tRip = clamp01(t / 0.45);
    const tFall = clamp01((t - 0.2) / 0.8);

    flashOpacity.value = Math.sin(clamp01(t * 1.6) * Math.PI) * 0.9;

    // Camera punch tajam di momen rip, lalu kembali mulus
    camera.position.z = baseCamZ - Math.sin(clamp01(t * 2.4) * Math.PI) * 0.5;

    // Group menyusut belakangan saja (biarkan momen rip terbaca dulu)
    const shrink = easeInCubic(clamp01((t - 0.35) / 0.65));
    const s = 1 - shrink * 0.42;
    packGroup.scale.set(s, s, s);
    packGroup.rotation.z = shrink * 0.35;
    packGroup.position.y = -shrink * 0.7;

    if (packTopHalf.visible) {
      const baseY = packTopHalf.userData.baseY;
      const rip = easeOutCubic(tRip);
      // Strip terbang parabola (naik lalu turun) sambil tumbling liar
      packTopHalf.position.x = 2.1 + rip * 6.5;
      packTopHalf.position.y = baseY + 0.38 + 3.0 * rip - 2.3 * rip * rip;
      packTopHalf.position.z = 0.34 + rip * 1.2;
      packTopHalf.rotation.z = -0.62 - rip * 3.4;
      packTopHalf.rotation.y = 0.85 + rip * 4.2;
      packTopHalf.rotation.x = -0.38 - rip * 2.2;

      // Badan jatuh floaty: mulai pelan, akselerasi, dengan sway kertas
      const fall = easeInCubic(tFall);
      const sway = Math.sin(tFall * 7) * 0.07 * (1 - tFall);
      packBottomHalf.position.y = packBottomHalf.userData.baseY - fall * 3.4;
      packBottomHalf.position.x = sway;
      packBottomHalf.rotation.x = 0.12 + fall * 0.55;
      packBottomHalf.rotation.z = sway * 1.6;

      // Ledakan cahaya dari mulut pack — memuncak cepat lalu memudar
      leakMesh.visible = true;
      const burst = Math.sin(clamp01(t * 1.8) * Math.PI);
      leakMesh.material.opacity = burst * 1.25;
      leakMesh.scale.set(1.1 + burst * 2.6, 1.6 + burst * 5.5, 1);
      setPieceEmissive(packTopHalf, 0.5 + burst * 0.7);
      setPieceEmissive(packBottomHalf, 0.5 + burst * 0.7);
    }

    if (t > 0.75) { packGroup.visible = t < 0.96; }
    if (t >= 1) {
      camera.position.z = baseCamZ;
      emit('tear-animation-complete');
    }
  }

  packGroup.rotation.x = packRotation.x;
  packGroup.rotation.y = packRotation.y;

  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════════════
// INPUT — drag rotasi / drag sobek / drag carousel / tap pilih
// ═══════════════════════════════════════════════════════════════
let dragStartRotation = { x: 0, y: 0 };
let dragStartMouse = { x: 0, y: 0 };
let dragTotalMove = 0;
const DRAG_ROTATE_FACTOR = 0.008;
const TAP_THRESHOLD = 8;

function onDragStart(e) {
  dragTotalMove = 0;
  dragStartMouse = { x: e.clientX, y: e.clientY };
  if (props.selectMode && carouselGroup) {
    isDragging = true;
  } else if (props.tearMode && !props.tearing) {
    isTearDragging = true;
    tearStartX = e.clientX;
  } else if (!props.tearMode) {
    isDragging = true;
    dragStartRotation = { x: packRotation.x, y: packRotation.y };
  }
  prevMouse = { x: e.clientX, y: e.clientY };
}

function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  onDragStart({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
}

function handleMove(clientX, clientY) {
  dragTotalMove += Math.abs(clientX - prevMouse.x) + Math.abs(clientY - prevMouse.y);
  if (props.selectMode && carouselGroup && isDragging && !focusAnim) {
    // Drag memutar carousel
    const dx = clientX - prevMouse.x;
    carouselAngle += dx * 0.008;
    spinVel = dx * 0.28;
  } else if (isTearDragging) {
    const dx = clientX - tearStartX;
    const progress = Math.max(0, Math.min(1, dx / TEAR_THRESHOLD));
    tearProgressPercent.value = progress;
    emit('tear-progress', progress);
  } else if (isDragging) {
    const dx = clientX - dragStartMouse.x;
    const dy = clientY - dragStartMouse.y;
    packRotation.y = dragStartRotation.y + dx * DRAG_ROTATE_FACTOR;
    packRotation.x = dragStartRotation.x + dy * DRAG_ROTATE_FACTOR;
    rotationVelocity.x = (clientX - prevMouse.x) * 0.008;
    rotationVelocity.y = (clientY - prevMouse.y) * 0.008;
  }
  prevMouse = { x: clientX, y: clientY };
}

function onDragMove(e) { if (isDragging || isTearDragging) handleMove(e.clientX, e.clientY); }
function onTouchMove(e) {
  if (e.touches.length !== 1) return;
  if (isDragging || isTearDragging) handleMove(e.touches[0].clientX, e.touches[0].clientY);
}

function finishDrag(clientX, clientY) {
  if (props.selectMode && carouselGroup && isDragging) {
    // Tap (bukan drag) = pilih pack
    if (dragTotalMove < TAP_THRESHOLD) trySelectPack(clientX, clientY);
  }
  if (isTearDragging) {
    if (tearProgressPercent.value >= 0.70) {
      tearProgressPercent.value = 1;
      emit('tear-drag-complete');
    } else {
      tearProgressPercent.value = 0;
    }
    isTearDragging = false;
  }
  isDragging = false;
}

function onDragEnd(e) { finishDrag(e?.clientX ?? prevMouse.x, e?.clientY ?? prevMouse.y); }
function onTouchEnd(e) {
  const t = e.changedTouches?.[0];
  finishDrag(t?.clientX ?? prevMouse.x, t?.clientY ?? prevMouse.y);
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
  disposables.forEach((d) => d?.dispose?.());
  disposables.length = 0;
  envTexture?.dispose();
  envTexture = null;
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
  scene = camera = renderer = packGroup = packWhole = packTopHalf = packBottomHalf = leakMesh = null;
  carouselGroup = null;
  packUnits = [];
}

function startLoop() {
  if (animationId === null && renderer) {
    lastFrameTime = 0;
    animationId = requestAnimationFrame(animate);
  }
}

function stopLoop() {
  if (animationId !== null) { cancelAnimationFrame(animationId); animationId = null; }
}

// Loop hanya jalan saat pack terlihat & tab aktif
function syncLoopState() {
  if (isInViewport && !document.hidden) startLoop();
  else stopLoop();
}

watch(() => props.selectMode, (val) => {
  if (val) enterCarousel();
  else if (carouselGroup && !focusAnim) {
    exitCarousel(null);
    packGroup.visible = true;
  }
});

watch(() => props.tearing, (val) => {
  if (val) {
    tearProgress = 0;
    if (packGroup) { packGroup.visible = true; packGroup.scale.set(1, 1, 1); }
    // Auto-tear: drag manual belum sempat memunculkan potongan — paksa
    // terlihat supaya animasi strip/badan tetap jalan
    if (packWhole && packTopHalf && packBottomHalf) {
      packWhole.visible = false;
      packTopHalf.visible = true;
      packBottomHalf.visible = true;
    }
  }
});

watch(() => props.tearMode, (val) => {
  if (val) {
    tearProgressPercent.value = 0;
    tearP = 0;
    if (packTopHalf) packTopHalf.visible = false;
    if (packBottomHalf) packBottomHalf.visible = false;
    if (packWhole) packWhole.visible = true;
    if (leakMesh) leakMesh.visible = false;
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
      // Renderer ikut resize saat kontainer berubah (kotak → fullscreen)
      resizeObserver = new ResizeObserver(() => onResize());
      resizeObserver.observe(containerRef.value);
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
  resizeObserver?.disconnect();
  resizeObserver = null;
  cleanup();
});

defineExpose({
  tearProgressPercent,
});
</script>
