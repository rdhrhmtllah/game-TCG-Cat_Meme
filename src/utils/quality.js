// Adaptive quality tier — dideteksi sekali saat startup, dibaca oleh
// Card3D/GachaPack saat init. Override manual untuk debugging:
//   localStorage.setItem('memecats_quality', 'low' | 'medium' | 'high')

const STORAGE_KEY = 'memecats_quality';
const TIERS = ['low', 'medium', 'high'];

let cachedTier = null;

function probeGpuRenderer() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return renderer || '';
  } catch {
    return '';
  }
}

function detectTier() {
  const override = localStorage.getItem(STORAGE_KEY);
  if (TIERS.includes(override)) return override;

  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // undefined di Safari/Firefox
  const gpu = probeGpuRenderer();

  // GPU software renderer / GPU mobile lama → low
  if (/swiftshader|llvmpipe|software|mali-4|mali-t[67]|adreno \(tm\) [1-4]/i.test(gpu)) {
    return 'low';
  }
  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

export function getQualityTier() {
  if (!cachedTier) cachedTier = detectTier();
  return cachedTier;
}

/**
 * Konfigurasi turunan per tier:
 * - dpr / dprMini     : cap devicePixelRatio renderer (mode full / mini)
 * - bloom             : 'full' (Epic+Legendary) | 'legendary' | 'off'
 * - particleScale     : pengali jumlah particle three.js
 * - dynLight          : point light orbit aktif atau tidak
 * - canvasScale       : skala resolusi texture kartu (cardRenderer)
 */
const CONFIGS = {
  high:   { dpr: 2.0, dprMini: 1.5,  bloom: 'full',      particleScale: 1.0, dynLight: true,  canvasScale: 2 },
  medium: { dpr: 1.5, dprMini: 1.25, bloom: 'legendary', particleScale: 0.5, dynLight: true,  canvasScale: 2 },
  low:    { dpr: 1.0, dprMini: 1.0,  bloom: 'off',       particleScale: 0.0, dynLight: false, canvasScale: 1 },
};

export function getQualityConfig() {
  return CONFIGS[getQualityTier()];
}
