/**
 * MemeCats TCG Dynamic Card Frame Generator — "Hybrid Fantasy-Luxe"
 * Generates high-fidelity card textures on HTML5 Canvas.
 *
 * Bahasa desain bertingkat per rarity:
 *   Common    → "Playful Clean"  (bersih, bevel halus, Outfit)
 *   Rare      → "Neon Circuit"   (identitas cyan, dipoles bevel)
 *   Epic      → "Arcane Ornate"  (Cinzel, gem faceted, constellation)
 *   Legendary → "Royal Artifact" (Cinzel 900, emas beveled, parchment)
 *
 * Sistem koordinat logis SELALU 600×840 — resolusi output diskalakan
 * via ctx.scale() sesuai quality tier (lihat drawCardCanvas).
 */
import { getQualityConfig } from './quality.js';

// Helper to draw a rounded rectangle path
function drawRoundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof r === 'number') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.roundRect(x, y, w, h, r || 0);
  }
}

// Helper to draw centered text with a shadow/stroke
function drawTextWithStroke(ctx, text, x, y, font, fillStyle, strokeStyle, strokeWidth = 3) {
  ctx.save();
  ctx.font = font;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Helper to draw legacy paw icon if needed
function drawPawIcon(ctx, cx, cy, radius, fillStyle, strokeStyle) {
  ctx.save();
  ctx.fillStyle = fillStyle;
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
  }

  // Main pad
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius * 0.25, radius * 0.65, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (strokeStyle) ctx.stroke();

  // 3 toes
  const toeOffsets = [
    [-radius * 0.55, -radius * 0.3],
    [0, -radius * 0.65],
    [radius * 0.55, -radius * 0.3]
  ];
  toeOffsets.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy + dy, radius * 0.28, radius * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    if (strokeStyle) ctx.stroke();
  });

  ctx.restore();
}

// Draw centered/covered image inside a box
function drawCoverImage(ctx, img, x, y, w, h, transform) {
  if (!img) return;
  ctx.save();
  // Clip to the target box
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const zoom = (transform && transform.zoom) || 1.0;
  const offX = (transform && transform.offsetX) || 0.0;
  const offY = (transform && transform.offsetY) || 0.0;

  // Scale factor to cover target viewport
  const coverScale = Math.max(w / img.width, h / img.height);
  const currentScale = coverScale * zoom;

  // Source crop width and height in image space
  const sWidth = w / currentScale;
  const sHeight = h / currentScale;

  if (sWidth <= img.width && sHeight <= img.height) {
    // Zoomed In / Cover state (normal behavior)
    let sx = (img.width - sWidth) / 2;
    let sy = (img.height - sHeight) / 2;

    const maxPanX = img.width - sWidth;
    const maxPanY = img.height - sHeight;

    sx = sx + offX * (maxPanX / 2);
    sy = sy + offY * (maxPanY / 2);

    sx = Math.max(0, Math.min(sx, img.width - sWidth));
    sy = Math.max(0, Math.min(sy, img.height - sHeight));

    ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
  } else {
    // Zoomed Out / Fit inside state (e.g. zoom < 1.0)
    // Clear canvas background to card default dark color before drawing
    ctx.fillStyle = '#090d16';
    ctx.fillRect(x, y, w, h);

    const dw = img.width * currentScale;
    const dh = img.height * currentScale;

    let dx = x + (w - dw) / 2;
    let dy = y + (h - dh) / 2;

    const maxPanX = w - dw;
    const maxPanY = h - dh;

    dx = dx + offX * (maxPanX / 2);
    dy = dy + offY * (maxPanY / 2);

    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
  }

  ctx.restore();
}

// Helper to parse elements from string/emoji for weakness & resistance
function parseElementFromEmojiOrText(str) {
  if (!str) return 'Normal';
  if (str.includes('💧') || str.toLowerCase().includes('water')) return 'Water';
  if (str.includes('🔥') || str.toLowerCase().includes('fire')) return 'Fire';
  if (str.includes('⚡') || str.toLowerCase().includes('electric')) return 'Electric';
  if (str.includes('🌌') || str.toLowerCase().includes('cosmic')) return 'Cosmic';
  if (str.includes('🌑') || str.toLowerCase().includes('shadow')) return 'Shadow';
  if (str.includes('🌿') || str.toLowerCase().includes('nature')) return 'Nature';
  return 'Normal';
}

// Helper to draw customized energy symbols replacing generic paw prints
function drawElementSymbol(ctx, cx, cy, radius, element) {
  ctx.save();
  
  // 1. Get colors based on element
  let bgStyle = '#64748B';
  let borderStyle = '#E2E8F0';
  const el = (element || 'Normal').toLowerCase();
  
  if (el === 'fire') {
    bgStyle = '#EF4444';
    borderStyle = '#FEE2E2';
  } else if (el === 'water') {
    bgStyle = '#3B82F6';
    borderStyle = '#DBEAFE';
  } else if (el === 'electric') {
    bgStyle = '#EAB308';
    borderStyle = '#FEF9C3';
  } else if (el === 'cosmic') {
    bgStyle = '#8B5CF6';
    borderStyle = '#EDE9FE';
  } else if (el === 'shadow') {
    bgStyle = '#312E81';
    borderStyle = '#E0E7FF';
  } else if (el === 'nature') {
    bgStyle = '#10B981';
    borderStyle = '#D1FAE5';
  } else {
    // Normal / Colorless
    bgStyle = '#78889B';
    borderStyle = '#F1F5F9';
  }
  
  // Draw base circle shadow/glow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  
  // Draw base circle
  ctx.fillStyle = bgStyle;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Clean shadow for icon drawing
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw border ring
  ctx.strokeStyle = borderStyle;
  ctx.lineWidth = radius * 0.16;
  ctx.stroke();
  
  // Draw inner symbol graphic
  if (el === 'fire') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx, cy + radius * 0.5);
    ctx.quadraticCurveTo(cx - radius * 0.45, cy + radius * 0.3, cx - radius * 0.4, cy - radius * 0.05);
    ctx.quadraticCurveTo(cx - radius * 0.35, cy - radius * 0.5, cx, cy - radius * 0.65);
    ctx.quadraticCurveTo(cx + radius * 0.15, cy - radius * 0.25, cx - radius * 0.1, cy + radius * 0.05);
    ctx.quadraticCurveTo(cx + radius * 0.45, cy + radius * 0.05, cx + radius * 0.4, cy - radius * 0.2);
    ctx.quadraticCurveTo(cx + radius * 0.5, cy + radius * 0.35, cx, cy + radius * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (el === 'water') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius * 0.6);
    ctx.bezierCurveTo(cx - radius * 0.45, cy - radius * 0.1, cx - radius * 0.45, cy + radius * 0.5, cx, cy + radius * 0.55);
    ctx.bezierCurveTo(cx + radius * 0.45, cy + radius * 0.5, cx + radius * 0.45, cy - radius * 0.1, cx, cy - radius * 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (el === 'electric') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx + radius * 0.1, cy - radius * 0.6);
    ctx.lineTo(cx - radius * 0.35, cy + radius * 0.05);
    ctx.lineTo(cx - radius * 0.05, cy + radius * 0.05);
    ctx.lineTo(cx - radius * 0.2, cy + radius * 0.6);
    ctx.lineTo(cx + radius * 0.35, cy - radius * 0.05);
    ctx.lineTo(cx + radius * 0.05, cy - radius * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (el === 'cosmic') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.lineTo(cx + Math.cos(angle) * radius * 0.6, cy + Math.sin(angle) * radius * 0.6);
      const nextAngle = angle + Math.PI / 4;
      ctx.lineTo(cx + Math.cos(nextAngle) * radius * 0.2, cy + Math.sin(nextAngle) * radius * 0.2);
    }
    ctx.closePath();
    ctx.fill();
  } else if (el === 'shadow') {
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.15, cy, radius * 0.42, -Math.PI / 2, Math.PI / 2, false);
    ctx.arc(cx + radius * 0.05, cy, radius * 0.35, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();
  } else if (el === 'nature') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.4, cy + radius * 0.4);
    ctx.quadraticCurveTo(cx - radius * 0.45, cy - radius * 0.35, cx + radius * 0.4, cy - radius * 0.4);
    ctx.quadraticCurveTo(cx + radius * 0.45, cy + radius * 0.35, cx - radius * 0.4, cy + radius * 0.4);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = bgStyle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.25, cy + radius * 0.25);
    ctx.lineTo(cx + radius * 0.25, cy - radius * 0.25);
    ctx.stroke();
  } else {
    // Normal / Paw Print
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx, cy + radius * 0.15, radius * 0.42, radius * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    const toeOffsets = [
      [-radius * 0.36, -radius * 0.18],
      [0, -radius * 0.42],
      [radius * 0.36, -radius * 0.18]
    ];
    toeOffsets.forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy + dy, radius * 0.18, radius * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  ctx.restore();
}

// Draw dynamic textured background based on element and rarity
function drawElementBackground(ctx, w, h, element, rarity) {
  ctx.save();
  const el = (element || 'Normal').toLowerCase();
  let mainGrad = ctx.createLinearGradient(0, 0, 0, h);
  
  if (el === 'fire') {
    mainGrad.addColorStop(0, '#7F1D1D');
    mainGrad.addColorStop(0.5, '#F97316');
    mainGrad.addColorStop(1, '#EF4444');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Fire flames
    ctx.fillStyle = 'rgba(254, 215, 170, 0.12)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.25 + i * 140);
      ctx.bezierCurveTo(w * 0.35, h * 0.15 + i * 140, w * 0.65, h * 0.45 + i * 140, w, h * 0.35 + i * 140);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    }
  } else if (el === 'water') {
    mainGrad.addColorStop(0, '#1E3A8A');
    mainGrad.addColorStop(0.5, '#2563EB');
    mainGrad.addColorStop(1, '#60A5FA');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Bubble patterns
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 4;
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.35, i * 62, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (el === 'electric') {
    mainGrad.addColorStop(0, '#1E1B4B');
    mainGrad.addColorStop(0.5, '#312E81');
    mainGrad.addColorStop(1, '#4F46E5');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Lightning bolts
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.26)';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#EAB308';
    ctx.shadowBlur = 8;
    
    const drawLightning = (sx, sy, segments) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      let cx = sx;
      let cy = sy;
      for (let j = 0; j < segments; j++) {
        cx += (Math.random() - 0.5) * 55;
        cy += 45 + Math.random() * 25;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    };
    drawLightning(w * 0.2, 0, 7);
    drawLightning(w * 0.8, 0, 7);
    drawLightning(w * 0.5, h * 0.2, 5);
  } else if (el === 'cosmic') {
    mainGrad.addColorStop(0, '#2E1065');
    mainGrad.addColorStop(0.5, '#5B21B6');
    mainGrad.addColorStop(1, '#701A75');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Starfield
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 45; i++) {
      const sx = Math.random() * w;
      const sy = Math.random() * h;
      const sr = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nebula glow
    const radial = ctx.createRadialGradient(w/2, h*0.35, 0, w/2, h*0.35, w * 0.6);
    radial.addColorStop(0, 'rgba(192, 132, 252, 0.28)');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, w, h);
  } else if (el === 'shadow') {
    mainGrad.addColorStop(0, '#0F172A');
    mainGrad.addColorStop(0.5, '#1E293B');
    mainGrad.addColorStop(1, '#020617');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Vortex smoke wave
    ctx.fillStyle = 'rgba(109, 40, 217, 0.1)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.3 + i * 130);
      ctx.quadraticCurveTo(w * 0.35, h * 0.15 + i * 130, w * 0.5, h * 0.35 + i * 130);
      ctx.quadraticCurveTo(w * 0.7, h * 0.5 + i * 130, w, h * 0.3 + i * 130);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    }
  } else if (el === 'nature') {
    mainGrad.addColorStop(0, '#064E3B');
    mainGrad.addColorStop(0.5, '#047857');
    mainGrad.addColorStop(1, '#059669');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Organic leaf veins
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w/2, 0);
    ctx.lineTo(w/2, h);
    ctx.stroke();
    for (let i = 90; i < h; i += 110) {
      ctx.beginPath();
      ctx.moveTo(w/2, i);
      ctx.quadraticCurveTo(w * 0.25, i - 30, 0, i - 80);
      ctx.moveTo(w/2, i + 30);
      ctx.quadraticCurveTo(w * 0.75, i, w, i - 60);
      ctx.stroke();
    }
  } else {
    // Normal / Carbon silver style
    mainGrad.addColorStop(0, '#CBD5E1');
    mainGrad.addColorStop(0.5, '#94A3B8');
    mainGrad.addColorStop(1, '#64748B');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Diagonal stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 14;
    for (let i = -w; i < w * 2; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h * 0.7, h);
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

// Get element theme color hex code
function getElementColor(element) {
  const el = (element || 'Normal').toLowerCase();
  return {
    fire: '#EF4444',
    water: '#3B82F6',
    electric: '#F59E0B',
    cosmic: '#A855F7',
    shadow: '#6366F1',
    nature: '#10B981',
    normal: '#94A3B8'
  }[el] || '#94A3B8';
}

function isFullBleed(foilStyle) {
  return foilStyle === 'Full Art ex' || foilStyle === 'Secret Gold' || foilStyle === 'Special Illustration';
}

// Seeded pseudorandom number generator for consistent rendering
function createSeededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ============================================================
// FANTASY-LUXE PREMIUM HELPERS
// Teknik bersama untuk bevel metalik, tekstur, seam, dan footer
// ============================================================

// Tile noise offscreen (di-cache) — jauh lebih murah daripada per-pixel
// ImageData di resolusi penuh; dipakai sebagai pattern repeat
const noiseTileCache = new Map();
function getNoiseTile(seed, light) {
  const key = `${seed}-${light}`;
  if (noiseTileCache.has(key)) return noiseTileCache.get(key);
  const tile = document.createElement('canvas');
  tile.width = tile.height = 96;
  const tctx = tile.getContext('2d');
  const rand = createSeededRandom(seed);
  const v = light ? 255 : 0;
  for (let i = 0; i < 1300; i++) {
    tctx.fillStyle = `rgba(${v},${v},${v},${(0.02 + rand() * 0.05).toFixed(3)})`;
    tctx.fillRect(Math.floor(rand() * 96), Math.floor(rand() * 96), 1, 1);
  }
  noiseTileCache.set(key, tile);
  return tile;
}

// Grain halus dua arah (gelap+terang) — bikin permukaan terasa "kertas"
function applyGrain(ctx, x, y, w, h, opacity = 0.55) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = ctx.createPattern(getNoiseTile(11, false), 'repeat');
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = ctx.createPattern(getNoiseTile(23, true), 'repeat');
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Inner shadow 4 sisi via gradient strip — untuk edge darkening & seam art
function drawInnerShadowRect(ctx, x, y, w, h, depth, color) {
  ctx.save();
  const mk = (x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    return g;
  };
  ctx.fillStyle = mk(x, y, x, y + depth);         ctx.fillRect(x, y, w, depth);
  ctx.fillStyle = mk(x, y + h, x, y + h - depth); ctx.fillRect(x, y + h - depth, w, depth);
  ctx.fillStyle = mk(x, y, x + depth, y);         ctx.fillRect(x, y, depth, h);
  ctx.fillStyle = mk(x + w, y, x + w - depth, y); ctx.fillRect(x + w - depth, y, depth, h);
  ctx.restore();
}

// Color grade tipis bernuansa element di atas artwork — menyatukan art
// dengan frame (art upload-an admin warnanya acak)
function applyElementGrade(ctx, x, y, w, h, element, alpha = 0.10) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = getElementColor(element);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Finishing art window: grade element + feathered seam (inner shadow)
// supaya pertemuan art ↔ frame tidak berupa garis keras
function finishArtworkWindow(ctx, x, y, w, h, element) {
  applyElementGrade(ctx, x, y, w, h, element, 0.09);
  drawInnerShadowRect(ctx, x, y, w, h, 13, 'rgba(2,6,16,0.40)');
}

// Border metalik ber-bevel: chamfer gelap luar → body gradient dengan
// specular band → garis terang dalam → garis gelap terdalam.
// stops: array [posisi, warna] untuk body metal (banded = brushed metal)
function drawBeveledBorder(ctx, w, h, opts) {
  const {
    inset = 8, width = 14, radius = 20, stops,
    bright = 'rgba(255,255,255,0.75)',
    chamfer = 'rgba(0,0,0,0.55)',
    innerDark = 'rgba(0,0,0,0.45)',
    glow = null,
  } = opts;
  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.strokeStyle = g;
  ctx.lineWidth = width;
  drawRoundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const half = width / 2;
  // Chamfer gelap tepi luar
  const xo = inset - half + 0.75;
  ctx.strokeStyle = chamfer; ctx.lineWidth = 1.5;
  drawRoundRectPath(ctx, xo, xo, w - xo * 2, h - xo * 2, radius + half);
  ctx.stroke();
  // Garis specular terang (sisi dalam border, kena "cahaya")
  const xb = inset + half - 1.2;
  ctx.strokeStyle = bright; ctx.lineWidth = 1.2;
  drawRoundRectPath(ctx, xb, xb, w - xb * 2, h - xb * 2, Math.max(4, radius - half + 1));
  ctx.stroke();
  // Garis gelap terdalam (bayangan jatuh ke isi kartu)
  const xd = inset + half + 0.8;
  ctx.strokeStyle = innerDark; ctx.lineWidth = 1;
  drawRoundRectPath(ctx, xd, xd, w - xd * 2, h - xd * 2, Math.max(3, radius - half));
  ctx.stroke();
  ctx.restore();
}

// Palet metal siap pakai (banded → kesan brushed/polished metal)
const METAL_STOPS = {
  silver: [[0,'#8E979F'],[0.08,'#F4F6F8'],[0.25,'#B7BEC7'],[0.5,'#E8ECF0'],[0.75,'#9AA2AB'],[0.92,'#DEE3E8'],[1,'#6E767E']],
  gold:   [[0,'#8A5A0B'],[0.08,'#FDE9A8'],[0.22,'#E8A81C'],[0.42,'#FFF3C4'],[0.55,'#F5C542'],[0.72,'#B87E0E'],[0.88,'#FDE9A8'],[1,'#7A4E08']],
  cyan:   [[0,'#0C4A6E'],[0.1,'#BAE6FD'],[0.3,'#0EA5E9'],[0.5,'#E0F7FF'],[0.7,'#0284C7'],[0.9,'#7DD3FC'],[1,'#075985']],
  purple: [[0,'#581C87'],[0.1,'#E9D5FF'],[0.3,'#A855F7'],[0.5,'#F0E1FF'],[0.7,'#9333EA'],[0.9,'#D8B4FE'],[1,'#4C1D95']],
};

// Path bintang N-titik (untuk rarity pip)
function starPath(ctx, cx, cy, spikes, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Rarity pip ala TCG fisik: ● Common, ◆ Rare, ★ Epic, ★★ Legendary
function drawRarityPip(ctx, cx, cy, rarity) {
  ctx.save();
  const r = (rarity || 'Common').toLowerCase();
  if (r === 'legendary') {
    ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 4;
    const g = ctx.createLinearGradient(cx, cy - 5, cx, cy + 5);
    g.addColorStop(0, '#FEF9C3'); g.addColorStop(1, '#D97706');
    ctx.fillStyle = g;
    starPath(ctx, cx - 5, cy, 5, 5, 2.2); ctx.fill();
    starPath(ctx, cx + 5, cy, 5, 5, 2.2); ctx.fill();
  } else if (r === 'epic') {
    ctx.shadowColor = '#A855F7'; ctx.shadowBlur = 4;
    const g = ctx.createLinearGradient(cx, cy - 5, cx, cy + 5);
    g.addColorStop(0, '#E9D5FF'); g.addColorStop(1, '#7C3AED');
    ctx.fillStyle = g;
    starPath(ctx, cx, cy, 5, 5.5, 2.4); ctx.fill();
  } else if (r === 'rare') {
    const g = ctx.createLinearGradient(cx, cy - 5, cx, cy + 5);
    g.addColorStop(0, '#BAE6FD'); g.addColorStop(1, '#0284C7');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5.5); ctx.lineTo(cx + 4.5, cy); ctx.lineTo(cx, cy + 5.5); ctx.lineTo(cx - 4.5, cy);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(cx - 1.2, cy - 1.2, 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Ekstrak multiplier dari string weakness lama ("💧 ×2" → "×2")
function extractMultiplier(str, fallback = '×2') {
  if (!str) return fallback;
  const m = String(str).match(/[×xX]\s?(\d+(?:\.\d+)?)/);
  return m ? `×${m[1]}` : fallback;
}

// Ekstrak angka resistance ("🔥 -20" → "−20"), '—' bila kosong
function extractResistance(str) {
  if (!str || String(str).trim() === '—') return null;
  const m = String(str).match(/-?\d+/);
  return m ? `−${Math.abs(parseInt(m[0], 10))}` : null;
}

// Footer premium TANPA emoji: pip element vector untuk weakness/resistance,
// paw vector untuk retreat, rarity pip + wordmark di baris bawah
function drawPremiumFooter(ctx, w, h, footerY, cardData, opts) {
  const { rarity = 'Common', labelColor, valueColor, metaColor } = opts;
  const retreatCount = (rarity === 'Epic' || rarity === 'Legendary') ? 2 : 1;

  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // — Weakness —
  let x = 34;
  ctx.fillStyle = labelColor; ctx.font = '700 8px "Inter",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('WEAKNESS', x, footerY);
  x += ctx.measureText('WEAKNESS').width + 12;
  const weakEl = parseElementFromEmojiOrText(cardData.weakness);
  drawElementSymbol(ctx, x, footerY - 3, 7, weakEl);
  x += 12;
  ctx.fillStyle = valueColor; ctx.font = '700 10px "Inter",sans-serif';
  ctx.fillText(extractMultiplier(cardData.weakness), x, footerY);

  // — Resistance —
  x = 218;
  ctx.fillStyle = labelColor; ctx.font = '700 8px "Inter",sans-serif';
  ctx.fillText('RESISTANCE', x, footerY);
  x += ctx.measureText('RESISTANCE').width + 12;
  const resVal = extractResistance(cardData.resistance);
  if (resVal) {
    const resEl = parseElementFromEmojiOrText(cardData.resistance);
    drawElementSymbol(ctx, x, footerY - 3, 7, resEl);
    x += 12;
    ctx.fillStyle = valueColor; ctx.font = '700 10px "Inter",sans-serif';
    ctx.fillText(resVal, x, footerY);
  } else {
    ctx.fillStyle = valueColor; ctx.font = '700 10px "Inter",sans-serif';
    ctx.fillText('—', x, footerY);
  }

  // — Retreat (paw vector, bukan emoji) —
  ctx.fillStyle = labelColor; ctx.font = '700 8px "Inter",sans-serif'; ctx.textAlign = 'right';
  const pawSpace = retreatCount * 16 + 6;
  ctx.fillText('RETREAT', w - 34 - pawSpace, footerY);
  for (let i = 0; i < retreatCount; i++) {
    drawPawIcon(ctx, w - 34 - i * 16 - 6, footerY - 3, 6, valueColor, null);
  }

  // — Baris meta: illustrator + rarity pip + wordmark —
  ctx.fillStyle = metaColor; ctx.font = '600 8px "Inter",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`Illus. ${cardData.illustrator || 'AI Artist'}`, 30, h - 13);
  ctx.textAlign = 'right';
  ctx.font = '800 8px "Outfit",sans-serif';
  const wordmark = 'MEMECATS  ©2026';
  ctx.fillText(wordmark, w - 30, h - 13);
  drawRarityPip(ctx, w - 38 - ctx.measureText(wordmark).width, h - 16, rarity);
  ctx.restore();
}

// Font-fit: kecilkan ukuran sampai muat maxW (nama kartu bisa panjang)
function fitFont(ctx, text, weight, sizePx, family, maxW) {
  let size = sizePx;
  while (size > 13) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 1;
  }
  return `${weight} ${size}px ${family}`;
}

// Panel parchment (Legendary "Royal Artifact"): kertas tua bertekstur
// dengan bercak, edge darkening, dan trim emas ganda
function drawParchmentPanel(ctx, x, y, w, h, radius) {
  ctx.save();
  drawRoundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#F2E2BD');
  g.addColorStop(0.5, '#E9D4A4');
  g.addColorStop(1, '#DBC08A');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  applyGrain(ctx, x, y, w, h, 0.7);
  // Bercak penuaan
  const rand = createSeededRandom(555);
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 9; i++) {
    const bx = x + rand() * w, by = y + rand() * h, br = 24 + rand() * 60;
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    bg.addColorStop(0, 'rgba(160,124,54,0.10)');
    bg.addColorStop(1, 'rgba(160,124,54,0)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  drawInnerShadowRect(ctx, x, y, w, h, 16, 'rgba(101,67,14,0.30)');
  ctx.restore();
  // Trim emas ganda
  ctx.save();
  ctx.strokeStyle = '#B87E0E'; ctx.lineWidth = 2.5;
  drawRoundRectPath(ctx, x, y, w, h, radius); ctx.stroke();
  ctx.strokeStyle = 'rgba(254,240,138,0.8)'; ctx.lineWidth = 1;
  drawRoundRectPath(ctx, x + 4, y + 4, w - 8, h - 8, Math.max(3, radius - 3)); ctx.stroke();
  ctx.restore();
}

// Filigree royal berlapis: understroke gelap (kedalaman ukiran) → body
// gradient emas → highlight putih tipis → titik emas bercahaya
function drawRoyalFiligree(ctx, cx, cy, size, dx, dy) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    // Batang utama melengkung dari dua arah sudut
    ctx.moveTo(cx, cy + dy * size);
    ctx.quadraticCurveTo(cx + dx * size * 0.06, cy + dy * size * 0.34, cx + dx * size, cy);
    // Spiral curl di lengkungan
    ctx.moveTo(cx + dx * size * 0.56, cy + dy * size * 0.15);
    ctx.quadraticCurveTo(cx + dx * size * 0.80, cy + dy * size * 0.28, cx + dx * size * 0.64, cy + dy * size * 0.43);
    ctx.quadraticCurveTo(cx + dx * size * 0.50, cy + dy * size * 0.52, cx + dx * size * 0.46, cy + dy * size * 0.36);
    // Daun kecil ke arah dalam
    ctx.moveTo(cx + dx * size * 0.26, cy + dy * size * 0.30);
    ctx.quadraticCurveTo(cx + dx * size * 0.46, cy + dy * size * 0.36, cx + dx * size * 0.40, cy + dy * size * 0.56);
  };
  ctx.strokeStyle = 'rgba(61,38,6,0.9)'; ctx.lineWidth = 4; path(); ctx.stroke();
  const g = ctx.createLinearGradient(cx, cy, cx + dx * size, cy + dy * size);
  g.addColorStop(0, '#FDE68A'); g.addColorStop(0.5, '#F59E0B'); g.addColorStop(1, '#B45309');
  ctx.strokeStyle = g; ctx.lineWidth = 2.2; path(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,251,235,0.85)'; ctx.lineWidth = 0.8; path(); ctx.stroke();
  ctx.fillStyle = '#FEF08A'; ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 5;
  [[0.64, 0.43], [0.40, 0.56], [0.97, 0.03]].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.arc(cx + dx * size * fx, cy + dy * size * fy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// Gem faceted sungguhan: dudukan logam gelap → 8 facet segitiga dengan
// shade selang-seling → table (facet datar) terang → glint
function drawFacetedGem(ctx, cx, cy, size, palette) {
  const { light, mid, dark, rim, glow } = palette;
  ctx.save();
  ctx.shadowColor = glow; ctx.shadowBlur = 12;
  // Dudukan logam (octagon luar)
  const outer = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 8;
    outer.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
  }
  ctx.beginPath();
  outer.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
  ctx.closePath();
  ctx.fillStyle = rim; ctx.fill();
  ctx.shadowBlur = 0;
  // Facet segitiga (tepi → pusat), shade selang-seling meniru refraksi
  const inner = outer.map(([px, py]) => [cx + (px - cx) * 0.85, cy + (py - cy) * 0.85]);
  const shades = [mid, dark, light, mid, dark, mid, light, dark];
  for (let i = 0; i < 8; i++) {
    const [x1, y1] = inner[i];
    const [x2, y2] = inner[(i + 1) % 8];
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fillStyle = shades[i]; ctx.fill();
  }
  // Table facet datar di tengah
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 8;
    const px = cx + size * 0.38 * Math.cos(a);
    const py = cy + size * 0.38 * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  const tg = ctx.createLinearGradient(cx - size * 0.4, cy - size * 0.4, cx + size * 0.4, cy + size * 0.4);
  tg.addColorStop(0, light); tg.addColorStop(1, mid);
  ctx.fillStyle = tg; ctx.fill();
  // Glint
  ctx.beginPath();
  ctx.arc(cx - size * 0.22, cy - size * 0.26, size * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
  ctx.restore();
}

// Common Holo: silver glitter around artwork window
function drawGlitterPattern(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(241, 245, 249, 0.75)';
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 4;
  const rand = createSeededRandom(42);
  for (let i = 0; i < 30; i++) {
    const sx = x + rand() * w;
    const sy = y + rand() * h;
    const size = 1.5 + rand() * 2.5;
    
    ctx.beginPath();
    ctx.moveTo(sx, sy - size);
    ctx.lineTo(sx + size * 0.2, sy - size * 0.2);
    ctx.lineTo(sx + size, sy);
    ctx.lineTo(sx + size * 0.2, sy + size * 0.2);
    ctx.lineTo(sx, sy + size);
    ctx.lineTo(sx - size * 0.2, sy + size * 0.2);
    ctx.lineTo(sx - size, sy);
    ctx.lineTo(sx - size * 0.2, sy - size * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Common Special Illustration: hand-drawn sketchy pencil borders
function drawSketchBorder(ctx, w, h, borderOuter) {
  ctx.save();
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.85)';
  ctx.lineWidth = 1.5;
  const rand = createSeededRandom(101);
  for (let i = 0; i < 3; i++) {
    const offset = (i - 1) * 1.5;
    ctx.beginPath();
    const r = 24 + offset;
    const x = borderOuter / 2 + offset + (rand() - 0.5) * 1.5;
    const y = borderOuter / 2 + offset + (rand() - 0.5) * 1.5;
    const width = w - borderOuter + (rand() - 0.5) * 1.5;
    const height = h - borderOuter + (rand() - 0.5) * 1.5;
    ctx.roundRect(x, y, width, height, r);
    ctx.stroke();
  }
  
  // Sketch hatching in corners
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.25)';
  ctx.lineWidth = 1;
  const corners = [
    [40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]
  ];
  corners.forEach(([cx, cy]) => {
    for (let j = 0; j < 6; j++) {
      ctx.beginPath();
      ctx.moveTo(cx - 15 + j * 5, cy - 15);
      ctx.lineTo(cx - 15 + j * 5 - 10, cy + 15);
      ctx.stroke();
    }
  });
  ctx.restore();
}

// Rare Holo: double glowing neon-blue border
function drawNeonRareBorder(ctx, ax, ay, aw, ah) {
  ctx.save();
  ctx.shadowColor = '#06B6D4';
  ctx.shadowBlur = 10;
  
  // Outer neon frame
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 3;
  ctx.strokeRect(ax - 2, ay - 2, aw + 4, ah + 4);
  
  // Inner neon frame
  ctx.shadowColor = '#00F0FF';
  ctx.shadowBlur = 5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ax + 2, ay + 2, aw - 4, ah - 4);
  
  ctx.restore();
}

// Rare Reverse Holo: cyan neon ripple wave patterns
function drawRareReverseHoloBorder(ctx, w, h, borderOuter) {
  ctx.save();
  // Draw base cyan border gradient
  const baseGrad = ctx.createLinearGradient(0, 0, w, h);
  baseGrad.addColorStop(0, '#0284C7');
  baseGrad.addColorStop(1, '#0EA5E9');
  ctx.strokeStyle = baseGrad;
  ctx.lineWidth = borderOuter;
  ctx.beginPath();
  ctx.roundRect(borderOuter / 2, borderOuter / 2, w - borderOuter, h - borderOuter, 24);
  ctx.stroke();

  // Draw neon ripple patterns inside the border clip
  ctx.beginPath();
  ctx.roundRect(borderOuter / 2, borderOuter / 2, w - borderOuter, h - borderOuter, 24);
  ctx.clip();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#38BDF8';
  ctx.shadowBlur = 6;

  const rand = createSeededRandom(303);
  for (let i = 0; i < 8; i++) {
    const rx = rand() * w;
    const ry = rand() * h;
    for (let r = 20; r < 140; r += 24) {
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Rare Special Illustration: watercolor splotch organic borders
function drawWatercolorBorder(ctx, w, h, borderOuter) {
  ctx.save();
  const rand = createSeededRandom(202);
  ctx.globalCompositeOperation = 'multiply';
  
  const colors = ['rgba(56, 189, 248, 0.16)', 'rgba(6, 182, 212, 0.13)', 'rgba(14, 165, 233, 0.12)'];
  
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    let cx, cy;
    if (t < 0.25) {
      cx = (t / 0.25) * w;
      cy = borderOuter;
    } else if (t < 0.5) {
      cx = w - borderOuter;
      cy = ((t - 0.25) / 0.25) * h;
    } else if (t < 0.75) {
      cx = (1 - (t - 0.5) / 0.25) * w;
      cy = h - borderOuter;
    } else {
      cx = borderOuter;
      cy = (1 - (t - 0.75) / 0.25) * h;
    }
    
    cx += (rand() - 0.5) * 16;
    cy += (rand() - 0.5) * 16;
    
    const r = 20 + rand() * 25;
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Inner soft watercolor line
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(borderOuter / 2, borderOuter / 2, w - borderOuter, h - borderOuter, 24);
  ctx.stroke();
  ctx.restore();
}

// Epic Holo: purple constellation starry border around artwork window
function drawEpicConstellations(ctx, ax, ay, aw, ah) {
  ctx.save();
  const rand = createSeededRandom(404);
  
  ctx.strokeStyle = '#8B5CF6';
  ctx.lineWidth = 4;
  ctx.strokeRect(ax, ay, aw, ah);

  const points = [];
  for (let i = 0; i < 16; i++) {
    let px, py;
    const edge = rand();
    if (edge < 0.25) {
      px = ax + rand() * aw;
      py = ay + (rand() - 0.5) * 10;
    } else if (edge < 0.5) {
      px = ax + aw + (rand() - 0.5) * 10;
      py = ay + rand() * ah;
    } else if (edge < 0.75) {
      px = ax + rand() * aw;
      py = ay + ah + (rand() - 0.5) * 10;
    } else {
      px = ax + (rand() - 0.5) * 10;
      py = ay + rand() * ah;
    }
    points.push({ x: px, y: py });
  }

  // Draw constellation lines
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < points.length; i++) {
    const nextIdx = (i + 1) % points.length;
    ctx.beginPath();
    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[nextIdx].x, points[nextIdx].y);
    ctx.stroke();
    
    if (rand() < 0.35) {
      const farIdx = (i + 3) % points.length;
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[farIdx].x, points[farIdx].y);
      ctx.stroke();
    }
  }

  // Draw star nodes
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#E9D5FF';
    ctx.shadowBlur = 6;
    ctx.fill();
  });

  ctx.restore();
}

// Epic Reverse Holo: Swirling galaxy nebula textures on outer border
function drawEpicReverseHoloBorder(ctx, w, h, borderOuter) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(borderOuter / 2, borderOuter / 2, w - borderOuter, h - borderOuter, 24);
  ctx.clip();

  const rand = createSeededRandom(505);
  ctx.fillStyle = '#1E1B4B';
  ctx.fillRect(0, 0, w, h);

  const colors = [
    'rgba(124, 58, 237, 0.45)', // Violet
    'rgba(219, 39, 119, 0.35)', // Pink
    'rgba(29, 78, 216, 0.25)',  // Royal Blue
    'rgba(76, 29, 149, 0.55)'   // Purple
  ];

  for (let i = 0; i < 18; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const r = 70 + rand() * 110;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, colors[Math.floor(rand() * colors.length)]);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add stars
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 45; i++) {
    const sx = rand() * w;
    const sy = rand() * h;
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }

  ctx.restore();
}

// Epic Special Illustration: Dark purple cosmic dust frame with alternate-art crop lines
function drawEpicSpecialIllustrationFrame(ctx, w, h, borderOuter) {
  ctx.save();
  ctx.strokeStyle = '#5B21B6';
  ctx.lineWidth = borderOuter;
  ctx.beginPath();
  ctx.roundRect(borderOuter / 2, borderOuter / 2, w - borderOuter, h - borderOuter, 24);
  ctx.stroke();

  // Overlay crop marks at the corners of the border
  ctx.strokeStyle = '#E9D5FF';
  ctx.lineWidth = 1.5;
  const inset = 24;
  const len = 14;
  
  // Top-left
  ctx.beginPath(); ctx.moveTo(inset, inset + len); ctx.lineTo(inset, inset); ctx.lineTo(inset + len, inset); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(inset - 5, inset); ctx.lineTo(inset - 15, inset); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(inset, inset - 5); ctx.lineTo(inset, inset - 15); ctx.stroke();

  // Top-right
  ctx.beginPath(); ctx.moveTo(w - inset, inset + len); ctx.lineTo(w - inset, inset); ctx.lineTo(w - inset - len, inset); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - inset + 5, inset); ctx.lineTo(w - inset + 15, inset); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - inset, inset - 5); ctx.lineTo(w - inset, inset - 15); ctx.stroke();

  // Bottom-left
  ctx.beginPath(); ctx.moveTo(inset, h - inset - len); ctx.lineTo(inset, h - inset); ctx.lineTo(inset + len, h - inset); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(inset - 5, h - inset); ctx.lineTo(inset - 15, h - inset); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(inset, h - inset + 5); ctx.lineTo(inset, h - inset + 15); ctx.stroke();

  // Bottom-right
  ctx.beginPath(); ctx.moveTo(w - inset, h - inset - len); ctx.lineTo(w - inset, h - inset); ctx.lineTo(w - inset - len, h - inset); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - inset + 5, h - inset); ctx.lineTo(w - inset + 15, h - inset); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - inset, h - inset + 5); ctx.lineTo(w - inset, h - inset + 15); ctx.stroke();

  ctx.restore();
}

// Legendary Holo: gold sparkles around the artwork window
function drawLegendaryHoloArtworkBorder(ctx, ax, ay, aw, ah) {
  ctx.save();
  const goldGrad = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
  goldGrad.addColorStop(0, '#F59E0B');
  goldGrad.addColorStop(0.5, '#FEF08A');
  goldGrad.addColorStop(1, '#D97706');
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = 5;
  ctx.strokeRect(ax, ay, aw, ah);

  const rand = createSeededRandom(707);
  ctx.fillStyle = '#FEF08A';
  ctx.shadowColor = '#F59E0B';
  ctx.shadowBlur = 8;
  for (let i = 0; i < 35; i++) {
    let sx, sy;
    const edge = rand();
    if (edge < 0.25) {
      sx = ax + rand() * aw;
      sy = ay;
    } else if (edge < 0.5) {
      sx = ax + aw;
      sy = ay + rand() * ah;
    } else if (edge < 0.75) {
      sx = ax + rand() * aw;
      sy = ay + ah;
    } else {
      sx = ax;
      sy = ay + rand() * ah;
    }
    
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5 + rand() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Legendary Special Illustration: floating gold leaves and stars border
function drawLegendaryGoldLeavesBorder(ctx, w, h, borderOuter) {
  ctx.save();
  const goldGrad = ctx.createLinearGradient(0, 0, w, h);
  goldGrad.addColorStop(0, '#D97706');
  goldGrad.addColorStop(0.5, '#F59E0B');
  goldGrad.addColorStop(1, '#B45309');
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = borderOuter;
  ctx.beginPath();
  ctx.roundRect(borderOuter / 2, borderOuter / 2, w - borderOuter, h - borderOuter, 24);
  ctx.stroke();

  // Draw gold leaves wrapping around
  ctx.fillStyle = '#FEF08A';
  const rand = createSeededRandom(606);
  for (let side = 0; side < 4; side++) {
    const count = side % 2 === 0 ? 5 : 7;
    for (let i = 1; i < count; i++) {
      let lx, ly;
      if (side === 0) { // top
        lx = (i / count) * w;
        ly = borderOuter - 4;
      } else if (side === 1) { // right
        lx = w - borderOuter + 4;
        ly = (i / count) * h;
      } else if (side === 2) { // bottom
        lx = (i / count) * w;
        ly = h - borderOuter + 4;
      } else { // left
        lx = borderOuter - 4;
        ly = (i / count) * h;
      }

      ctx.beginPath();
      ctx.ellipse(lx, ly, 8, 4, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      
      if (rand() < 0.4) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(lx + (rand() - 0.5) * 15, ly + (rand() - 0.5) * 15, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
      }
    }
  }
  ctx.restore();
}

// ============================================================
// NEW PREMIUM HELPER FUNCTIONS
// ============================================================

// Corner rivet bolts (Common "Titanium Plate")
function drawCornerRivets(ctx, x, y, w, h, color) {
  const positions = [
    [x + 18, y + 18], [x + w - 18, y + 18],
    [x + 18, y + h - 18], [x + w - 18, y + h - 18]
  ];
  positions.forEach(([cx, cy]) => {
    ctx.save();
    // Outer bolt ring
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 7);
    grad.addColorStop(0, '#E5E7EB');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, '#1F2937');
    ctx.fillStyle = grad;
    ctx.fill();
    // Inner bolt head
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#374151';
    ctx.fill();
    // Highlight glint
    ctx.beginPath();
    ctx.arc(cx - 1.5, cy - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.restore();
  });
}

// L-bracket corner frame (Rare "Neon Sapphire Circuit")
function drawCircuitCorners(ctx, x, y, w, h, color, glowColor) {
  const len = 36;
  const corners = [
    { ox: x,     oy: y,     dx: 1,  dy: 1  },
    { ox: x + w, oy: y,     dx: -1, dy: 1  },
    { ox: x,     oy: y + h, dx: 1,  dy: -1 },
    { ox: x + w, oy: y + h, dx: -1, dy: -1 },
  ];
  corners.forEach(({ ox, oy, dx, dy }) => {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'square';
    // Main L
    ctx.beginPath();
    ctx.moveTo(ox + dx * len, oy);
    ctx.lineTo(ox, oy);
    ctx.lineTo(ox, oy + dy * len);
    ctx.stroke();
    // Secondary short tick
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = glowColor;
    ctx.beginPath();
    ctx.moveTo(ox + dx * (len * 0.5), oy);
    ctx.lineTo(ox + dx * (len * 0.5), oy + dy * 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, oy + dy * (len * 0.5));
    ctx.lineTo(ox + dx * 6, oy + dy * (len * 0.5));
    ctx.stroke();
    // Corner dot
    ctx.beginPath();
    ctx.arc(ox + dx * 3, oy + dy * 3, 3, 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  });
}

// PCB hex grid overlay (Rare background)
function drawHexGrid(ctx, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const size = 28;
  const col = Math.ceil(w / (size * 1.5)) + 2;
  const row = Math.ceil(h / (size * Math.sqrt(3))) + 2;
  for (let r = -1; r < row; r++) {
    for (let c = -1; c < col; c++) {
      const cx = c * size * 1.5;
      const cy = r * size * Math.sqrt(3) + (c % 2 === 0 ? 0 : size * Math.sqrt(3) / 2);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + size * 0.82 * Math.cos(angle);
        const py = cy + size * 0.82 * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// VSTAR / ABILITY badge pill (Epic)
function drawVStarBadge(ctx, x, y, label, colorA, colorB) {
  const bw = 72, bh = 22;
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x + bw, y + bh);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.shadowColor = colorA;
  ctx.shadowBlur = 10;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, 11);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 italic 11px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + bw / 2, y + 15);
  ctx.restore();
}

// Amethyst octagon gem (Epic corners)
function drawAmethystGem(ctx, cx, cy, size) {
  ctx.save();
  ctx.shadowColor = '#A855F7';
  ctx.shadowBlur = 14;
  // Outer octagon
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8;
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  const outerGrad = ctx.createRadialGradient(cx - size * 0.2, cy - size * 0.2, 0, cx, cy, size);
  outerGrad.addColorStop(0, '#E9D5FF');
  outerGrad.addColorStop(0.4, '#A855F7');
  outerGrad.addColorStop(1, '#3B0764');
  ctx.fillStyle = outerGrad;
  ctx.fill();
  // Inner diamond
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.55);
  ctx.lineTo(cx + size * 0.55, cy);
  ctx.lineTo(cx, cy + size * 0.55);
  ctx.lineTo(cx - size * 0.55, cy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(233,213,255,0.30)';
  ctx.fill();
  // Glint
  ctx.beginPath();
  ctx.arc(cx - size * 0.2, cy - size * 0.25, size * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.shadowBlur = 0;
  ctx.fill();
  ctx.restore();
}

// Radial aura rays from center (Legendary background)
function drawRadialAuraRays(ctx, cx, cy, maxRadius, color, count) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const x1 = cx + Math.cos(angle) * 40;
    const y1 = cy + Math.sin(angle) * 40;
    const x2 = cx + Math.cos(angle) * maxRadius;
    const y2 = cy + Math.sin(angle) * maxRadius;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, color.replace(')', ', 0.25)').replace('rgb', 'rgba'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 18;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Crown watermark (Legendary background)
function drawCrownWatermark(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.06;
  ctx.lineJoin = 'round';
  const s = size;
  // Crown base
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.55, cy + s * 0.3);
  ctx.lineTo(cx - s * 0.55, cy - s * 0.05);
  ctx.lineTo(cx - s * 0.28, cy - s * 0.45);
  ctx.lineTo(cx, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.28, cy - s * 0.45);
  ctx.lineTo(cx + s * 0.55, cy - s * 0.05);
  ctx.lineTo(cx + s * 0.55, cy + s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Top spires
  ctx.beginPath();
  ctx.arc(cx - s * 0.28, cy - s * 0.55, s * 0.1, 0, Math.PI * 2);
  ctx.arc(cx, cy - s * 0.32, s * 0.1, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.28, cy - s * 0.55, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// 8-point star diamond gem (Legendary corners)
function drawStarDiamondGem(ctx, cx, cy, size) {
  ctx.save();
  ctx.shadowColor = '#FCD34D';
  ctx.shadowBlur = 18;
  // 8-point star outer
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const outerR = size;
    const innerR = size * 0.42;
    const aOuter = (Math.PI / 4) * i - Math.PI / 2;
    const aInner = aOuter + Math.PI / 8;
    const px = cx + outerR * Math.cos(aOuter);
    const py = cy + outerR * Math.sin(aOuter);
    const ix = cx + innerR * Math.cos(aInner);
    const iy = cy + innerR * Math.sin(aInner);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  const starGrad = ctx.createRadialGradient(cx - size * 0.2, cy - size * 0.2, 0, cx, cy, size);
  starGrad.addColorStop(0, '#FFFDE7');
  starGrad.addColorStop(0.35, '#FCD34D');
  starGrad.addColorStop(0.7, '#D97706');
  starGrad.addColorStop(1, '#92400E');
  ctx.fillStyle = starGrad;
  ctx.fill();
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Center sparkle glint
  ctx.beginPath();
  ctx.arc(cx - size * 0.18, cy - size * 0.22, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.60)';
  ctx.shadowBlur = 0;
  ctx.fill();
  ctx.restore();
}

// Gold filigree flourish in corner (Legendary artwork frame)
function drawGoldFiligreeCorner(ctx, cx, cy, size, dx, dy) {
  ctx.save();
  ctx.strokeStyle = '#FCD34D';
  ctx.shadowColor = '#F59E0B';
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  // Primary curve
  ctx.beginPath();
  ctx.moveTo(cx, cy + dy * size * 0.55);
  ctx.quadraticCurveTo(cx + dx * size * 0.15, cy + dy * size * 0.2, cx + dx * size * 0.55, cy);
  ctx.stroke();
  // Secondary inner curve
  ctx.beginPath();
  ctx.moveTo(cx, cy + dy * size * 0.38);
  ctx.quadraticCurveTo(cx + dx * size * 0.12, cy + dy * size * 0.12, cx + dx * size * 0.38, cy);
  ctx.stroke();
  // Leaf dot cluster
  const dots = [
    [cx + dx * size * 0.22, cy + dy * size * 0.22],
    [cx + dx * size * 0.38, cy + dy * size * 0.10],
    [cx + dx * size * 0.10, cy + dy * size * 0.38],
  ];
  ctx.shadowBlur = 4;
  dots.forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FCD34D';
    ctx.fill();
  });
  ctx.restore();
}

// Constellation dots + lines around artwork frame (Epic)
function drawConstellationFrame(ctx, ax, ay, aw, ah) {
  ctx.save();
  const rand = createSeededRandom(404);
  const points = [];
  const edgeCount = 20;
  for (let i = 0; i < edgeCount; i++) {
    const t = i / edgeCount;
    let px, py;
    const perimeter = 2 * (aw + ah);
    const pos = t * perimeter;
    if (pos < aw)           { px = ax + pos;       py = ay; }
    else if (pos < aw + ah) { px = ax + aw;         py = ay + (pos - aw); }
    else if (pos < 2*aw+ah) { px = ax + aw - (pos - aw - ah); py = ay + ah; }
    else                    { px = ax;               py = ay + ah - (pos - 2*aw - ah); }
    px += (rand() - 0.5) * 14;
    py += (rand() - 0.5) * 14;
    points.push({ x: px, y: py });
  }
  // Lines
  ctx.strokeStyle = 'rgba(192,132,252,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    if (rand() < 0.7) {
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
    if (rand() < 0.25) {
      const far = points[(i + 3) % points.length];
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
    }
  }
  // Star nodes
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#F3E8FF';
    ctx.shadowColor = '#C084FC';
    ctx.shadowBlur = 8;
    ctx.fill();
  });
  ctx.restore();
}

// Brushed-metal scanline background texture (Common)
function drawBrushedMetal(ctx, w, h, baseColor, lineColor) {
  ctx.save();
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 3) {
    ctx.globalAlpha = 0.04 + (y % 9 === 0 ? 0.04 : 0);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Diagonal scratch highlights
  ctx.lineWidth = 0.8;
  const rand = createSeededRandom(77);
  for (let i = 0; i < 18; i++) {
    const sx = rand() * w;
    const sy = rand() * h;
    ctx.globalAlpha = 0.03 + rand() * 0.04;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + w * 0.3 + rand() * w * 0.2, sy + h * 0.06);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Helper for drawing text wrapper
function drawWrappedText(ctx, text, cx, startY, maxW, lineHeight, color, font) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > maxW && i > 0) {
      ctx.fillText(line.trim(), cx, startY + lineCount * lineHeight);
      line = words[i] + ' ';
      lineCount++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), cx, startY + lineCount * lineHeight);
  ctx.restore();
}

// ============================================================
// COMMON TCG Template Design — "TITANIUM PLATE"
// ============================================================
function drawCommon(ctx, w, h, cardData, artworkImage, foilStyle = 'Standard') {
  const isBleed = isFullBleed(foilStyle);

  // ── 1. BACKGROUND ──────────────────────────────────────────
  if (isBleed) {
    if (artworkImage) drawCoverImage(ctx, artworkImage, 0, 0, w, h, cardData._imgTransform);
    else { ctx.fillStyle = '#1C2333'; ctx.fillRect(0, 0, w, h); }
    const vig = ctx.createLinearGradient(0, h * 0.52, 0, h);
    vig.addColorStop(0, 'rgba(15,23,42,0)');
    vig.addColorStop(0.5, 'rgba(15,23,42,0.52)');
    vig.addColorStop(1, 'rgba(10,16,30,0.92)');
    ctx.fillStyle = vig; ctx.fillRect(0, h * 0.52, w, h * 0.48);
  } else {
    // Brushed titanium plate background
    drawBrushedMetal(ctx, w, h,
      (() => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0,'#2D3748'); g.addColorStop(0.5,'#1E293B'); g.addColorStop(1,'#111827'); return g; })(),
      'rgba(148,163,184,0.06)'
    );
    // Subtle element color tint overlay
    const el = getElementColor(cardData.element);
    ctx.save(); ctx.globalAlpha = 0.08;
    ctx.fillStyle = el; ctx.fillRect(0, 0, w, h);
    ctx.restore();
    applyGrain(ctx, 0, 0, w, h, 0.4);
  }

  // ── 2. BORDER ──────────────────────────────────────────────
  ctx.save();
  if (foilStyle === 'Special Illustration') {
    drawSketchBorder(ctx, w, h, 16);
  } else if (foilStyle === 'Reverse Holo') {
    const rg = ctx.createLinearGradient(0, 0, w, h);
    rg.addColorStop(0,'#FECACA'); rg.addColorStop(0.2,'#FDE68A'); rg.addColorStop(0.4,'#A7F3D0');
    rg.addColorStop(0.6,'#BFDBFE'); rg.addColorStop(0.8,'#C7D2FE'); rg.addColorStop(1,'#FBCFE8');
    ctx.strokeStyle = rg; ctx.lineWidth = 16;
    drawRoundRectPath(ctx, 8, 8, w - 16, h - 16, 20); ctx.stroke();
  } else if (foilStyle === 'Secret Gold') {
    const gg = ctx.createLinearGradient(0,0,w,h);
    gg.addColorStop(0,'#D97706'); gg.addColorStop(0.5,'#FBBF24'); gg.addColorStop(1,'#B45309');
    ctx.strokeStyle = gg; ctx.lineWidth = 16;
    drawRoundRectPath(ctx, 8, 8, w - 16, h - 16, 20); ctx.stroke();
    ctx.strokeStyle = '#FEF08A'; ctx.lineWidth = 1;
    drawRoundRectPath(ctx, 4, 4, w - 8, h - 8, 22); ctx.stroke();
  } else {
    // Beveled brushed-steel border (chamfer + specular band)
    drawBeveledBorder(ctx, w, h, {
      inset: 8, width: 14, radius: 20,
      stops: METAL_STOPS.silver,
      bright: 'rgba(255,255,255,0.80)',
      chamfer: 'rgba(9,13,22,0.70)',
      innerDark: 'rgba(17,24,39,0.55)',
    });
  }
  ctx.restore();

  // Rivet bolts at all 4 corners (framed only)
  if (!isBleed && foilStyle !== 'Special Illustration') {
    drawCornerRivets(ctx, 0, 0, w, h, '#6B7280');
  }

  // ── 3. HEADER BAR ──────────────────────────────────────────
  ctx.save();
  if (isBleed) {
    if (foilStyle === 'Secret Gold') {
      ctx.fillStyle = 'rgba(5,8,18,0.87)';
      drawRoundRectPath(ctx, 24, 26, w - 48, 62, 12); ctx.fill();
      const gg = ctx.createLinearGradient(0,0,w,80);
      gg.addColorStop(0,'#D97706'); gg.addColorStop(1,'#FBBF24');
      ctx.strokeStyle = gg; ctx.lineWidth = 2.5; ctx.stroke();
    } else if (foilStyle === 'Special Illustration') {
      ctx.fillStyle = 'rgba(248,250,252,0.90)';
      drawRoundRectPath(ctx, 24, 26, w - 48, 62, 10); ctx.fill();
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(17,24,39,0.80)';
      drawRoundRectPath(ctx, 24, 26, w - 48, 62, 12); ctx.fill();
      ctx.strokeStyle = '#4B5563'; ctx.lineWidth = 2; ctx.stroke();
    }
  } else {
    const hg = ctx.createLinearGradient(30, 64, w - 30, 64);
    hg.addColorStop(0,'#374151'); hg.addColorStop(0.5,'#4B5563'); hg.addColorStop(1,'#374151');
    ctx.fillStyle = hg;
    drawRoundRectPath(ctx, 30, 64, w - 60, 50, 8); ctx.fill();
    // Scanlines inside header
    for (let sy = 68; sy < 112; sy += 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(32, sy); ctx.lineTo(w - 32, sy); ctx.stroke();
    }
    ctx.strokeStyle = '#6B7280'; ctx.lineWidth = 1.5;
    drawRoundRectPath(ctx, 30, 64, w - 60, 50, 8); ctx.stroke();
  }
  ctx.restore();

  // ex Badge
  if (foilStyle === 'Full Art ex') {
    ctx.save();
    const bg = ctx.createLinearGradient(36, 36, 86, 56);
    bg.addColorStop(0,'#374151'); bg.addColorStop(1,'#1F2937');
    ctx.fillStyle = bg; drawRoundRectPath(ctx, 36, 36, 50, 22, 6); ctx.fill();
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#F9FAFB'; ctx.font = 'bold italic 13px "Outfit",sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('ex', 61, 52);
    ctx.restore();
  }

  // Name + HP
  const textY = isBleed ? 67 : 97;
  const nameX = (foilStyle === 'Full Art ex') ? 100 : 48;
  const textFill = (foilStyle === 'Special Illustration' && isBleed) ? '#1F2937' : '#F9FAFB';
  const textShadow = '#111827';
  drawTextWithStroke(ctx, cardData.name || 'Meme Cat', nameX, textY, '800 24px "Outfit",sans-serif', textFill, textShadow, 3);
  ctx.save(); ctx.textAlign = 'right';
  drawTextWithStroke(ctx, `HP ${cardData.hypeScore || 50}`, w - 68, textY, 'bold 20px "Outfit",sans-serif', textFill, textShadow, 2.5);
  ctx.restore();
  drawElementSymbol(ctx, w - 50, textY - 8, 13, cardData.element);

  // ── 4. ARTWORK WINDOW ──────────────────────────────────────
  const artX = 30, artY = 126, artW = w - 60, artH = 340;
  if (!isBleed) {
    // Artwork frame with L-corner brackets
    if (foilStyle === 'Holo') {
      drawGlitterPattern(ctx, artX - 6, artY - 6, artW + 12, artH + 12);
      const hfg = ctx.createLinearGradient(artX, artY, artX + artW, artY + artH);
      hfg.addColorStop(0,'#D1D5DB'); hfg.addColorStop(0.5,'#F9FAFB'); hfg.addColorStop(1,'#9CA3AF');
      ctx.strokeStyle = hfg; ctx.lineWidth = 5;
    } else {
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 4;
    }
    ctx.strokeRect(artX, artY, artW, artH);
    // L corner brackets
    ctx.save();
    const bColor = foilStyle === 'Holo' ? '#E5E7EB' : '#6B7280';
    const bLen = 22;
    [[artX, artY, 1,1],[artX+artW, artY,-1,1],[artX, artY+artH,1,-1],[artX+artW, artY+artH,-1,-1]].forEach(([cx,cy,dx,dy]) => {
      ctx.strokeStyle = bColor; ctx.lineWidth = 3; ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(cx + dx*bLen, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy*bLen); ctx.stroke();
    });
    ctx.restore();
    if (artworkImage) drawCoverImage(ctx, artworkImage, artX, artY, artW, artH, cardData._imgTransform);
    else { ctx.fillStyle = '#1E293B'; ctx.fillRect(artX, artY, artW, artH); }
    // Feathered seam + element grade — art menyatu dengan frame
    finishArtworkWindow(ctx, artX, artY, artW, artH, cardData.element);
  }

  // ── 5. SPECIES BAR ─────────────────────────────────────────
  if (!isBleed) {
    ctx.save();
    ctx.fillStyle = '#1F2937'; ctx.fillRect(30, 476, w - 60, 22);
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.strokeRect(30, 476, w - 60, 22);
    ctx.fillStyle = '#9CA3AF'; ctx.font = 'italic 500 11px "Inter",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`COMMON • Hype: ${cardData.hypeScore || 50} • Yield: ${cardData.likesPerSec || 0} L/s`, w/2, 491);
    ctx.restore();
  }

  // ── 6. ATTACK PANEL ────────────────────────────────────────
  const panelY = isBleed ? 480 : 510, panelH = isBleed ? 300 : 262;
  ctx.save();
  if (isBleed) {
    if (foilStyle === 'Secret Gold') {
      ctx.fillStyle = 'rgba(5,8,18,0.88)';
      drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 18); ctx.fill();
      const gg = ctx.createLinearGradient(0,panelY,0,panelY+panelH);
      gg.addColorStop(0,'#D97706'); gg.addColorStop(1,'#FBBF24');
      ctx.strokeStyle = gg; ctx.lineWidth = 2.5; ctx.stroke();
    } else if (foilStyle === 'Special Illustration') {
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 14); ctx.fill();
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(17,24,39,0.82)';
      drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(75,85,99,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    }
  } else {
    // White frosted glass panel with subtle dot-grid texture
    ctx.fillStyle = 'rgba(249,250,251,0.88)';
    drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 12); ctx.fill();
    ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 1.5; ctx.stroke();
    // Dot grid texture
    ctx.fillStyle = 'rgba(107,114,128,0.1)';
    for (let gx = 44; gx < w - 28; gx += 18)
      for (let gy = panelY + 10; gy < panelY + panelH - 6; gy += 18) {
        ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI*2); ctx.fill();
      }
  }
  ctx.restore();

  const pText = (isBleed && foilStyle !== 'Special Illustration') ? '#F9FAFB' : '#111827';
  const pVal  = (isBleed && foilStyle !== 'Special Illustration') ? '#D1D5DB' : '#4B5563';
  const divY = isBleed ? panelY + 90 : panelY + 96;

  // Attack 1
  const a1y = isBleed ? panelY + 56 : panelY + 62;
  drawElementSymbol(ctx, 58, a1y - 8, 14, cardData.element);
  ctx.fillStyle = pText; ctx.font = 'bold 20px "Outfit",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(cardData.attackName1 || 'Viral Purr', 88, a1y);
  ctx.fillStyle = pVal; ctx.textAlign = 'right';
  ctx.fillText(`+${cardData.likesPerSec || 0.8} L/s`, w - 55, a1y);

  // Divider line
  ctx.save();
  ctx.strokeStyle = (isBleed && foilStyle !== 'Special Illustration') ? 'rgba(255,255,255,0.08)' : 'rgba(107,114,128,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(38, divY); ctx.lineTo(w-38, divY); ctx.stroke();
  ctx.restore();

  // Attack 2
  const a2y = isBleed ? panelY + 128 : panelY + 132;
  drawElementSymbol(ctx, 58, a2y - 8, 14, cardData.element);
  drawElementSymbol(ctx, 92, a2y - 8, 14, 'Normal');
  ctx.fillStyle = pText; ctx.font = 'bold 20px "Outfit",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(cardData.attackName2 || 'Meme Surge', 122, a2y);
  ctx.fillStyle = pVal; ctx.textAlign = 'right';
  ctx.fillText(`+${cardData.hypeScore || 50} HP`, w - 55, a2y);

  // Rule box (Full Art ex)
  if (foilStyle === 'Full Art ex') {
    const rx = 50, ry = panelY + 170, rw = w - 100, rh = 52;
    ctx.fillStyle = 'rgba(55,65,81,0.20)'; drawRoundRectPath(ctx, rx, ry, rw, rh, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(156,163,175,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#9CA3AF'; ctx.font = '900 italic 10px "Outfit",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('COMMON ex RULE', w/2, ry + 16);
    ctx.fillStyle = '#E5E7EB'; ctx.font = '500 10px "Inter",sans-serif';
    ctx.fillText('Showcasing this card boosts passive coin yield by 1.1×.', w/2, ry + 34);
  }

  // Description
  const descY = (foilStyle === 'Full Art ex') ? panelY + 248 : panelY + 198;
  drawWrappedText(ctx, cardData.description || 'Kucing meme yang ikonik dengan gaya tak tertandingi.', w/2, descY, w - 96, 18,
    (isBleed && foilStyle !== 'Special Illustration') ? '#9CA3AF' : '#4B5563',
    'italic 500 13px "Inter",sans-serif'
  );

  // ── 7. FOOTER ──────────────────────────────────────────────
  const footerY = isBleed ? h - 44 : 800;
  const ftColor = (isBleed && foilStyle !== 'Special Illustration') ? '#6B7280' : '#9CA3AF';
  drawPremiumFooter(ctx, w, h, footerY, cardData, {
    rarity: 'Common',
    labelColor: ftColor,
    valueColor: (isBleed && foilStyle !== 'Special Illustration') ? '#9CA3AF' : '#D1D5DB',
    metaColor: ftColor,
  });
}

// ============================================================
// RARE TCG Template Design — "NEON SAPPHIRE CIRCUIT"
// ============================================================
function drawRare(ctx, w, h, cardData, artworkImage, foilStyle = 'Standard') {
  const isBleed = isFullBleed(foilStyle);

  // ── 1. BACKGROUND ──────────────────────────────────────────
  if (isBleed) {
    if (artworkImage) drawCoverImage(ctx, artworkImage, 0, 0, w, h, cardData._imgTransform);
    else { ctx.fillStyle = '#0A1628'; ctx.fillRect(0, 0, w, h); }
    const vig = ctx.createLinearGradient(0, h * 0.52, 0, h);
    vig.addColorStop(0, 'rgba(7,11,26,0)');
    vig.addColorStop(0.5, 'rgba(7,11,26,0.55)');
    vig.addColorStop(1, 'rgba(4,8,20,0.92)');
    ctx.fillStyle = vig; ctx.fillRect(0, h * 0.52, w, h * 0.48);
  } else {
    drawElementBackground(ctx, w, h, cardData.element, 'Rare');
    // Hex circuit grid overlay
    drawHexGrid(ctx, w, h, 'rgba(56,189,248,0.06)');
    // Top-down cyber glow
    const glow = ctx.createRadialGradient(w/2, h*0.30, 20, w/2, h*0.30, w*0.7);
    glow.addColorStop(0, 'rgba(6,182,212,0.16)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    applyGrain(ctx, 0, 0, w, h, 0.35);
  }

  // ── 2. BORDER (3-layer neon) ───────────────────────────────
  ctx.save();
  if (foilStyle === 'Special Illustration') {
    drawWatercolorBorder(ctx, w, h, 16);
  } else if (foilStyle === 'Reverse Holo') {
    drawRareReverseHoloBorder(ctx, w, h, 16);
  } else if (foilStyle === 'Secret Gold') {
    const gg = ctx.createLinearGradient(0,0,w,h);
    gg.addColorStop(0,'#D97706'); gg.addColorStop(0.5,'#F59E0B'); gg.addColorStop(1,'#B45309');
    ctx.strokeStyle = gg; ctx.lineWidth = 16;
    drawRoundRectPath(ctx, 8, 8, w-16, h-16, 22); ctx.stroke();
  } else {
    // Beveled neon-cyan border: identitas circuit dipertahankan,
    // sekarang dengan chamfer + specular band metalik
    drawBeveledBorder(ctx, w, h, {
      inset: 8, width: 14, radius: 22,
      stops: METAL_STOPS.cyan,
      bright: 'rgba(207,250,254,0.90)',
      chamfer: 'rgba(4,20,38,0.75)',
      innerDark: 'rgba(7,32,51,0.60)',
      glow: '#06B6D4',
    });
  }
  ctx.restore();

  // Circuit L-brackets at corners (framed only)
  if (!isBleed && foilStyle !== 'Special Illustration' && foilStyle !== 'Secret Gold') {
    drawCircuitCorners(ctx, 16, 16, w-32, h-32, '#38BDF8', '#67E8F9');
  } else if (foilStyle === 'Secret Gold') {
    const cs = 34;
    ctx.save();
    [[18,18,1,1],[w-18,18,-1,1],[18,h-18,1,-1],[w-18,h-18,-1,-1]].forEach(([x,y,dx,dy]) => {
      ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y+cs*dy); ctx.lineTo(x, y); ctx.lineTo(x+cs*dx, y); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y+10*dy); ctx.lineTo(x+10*dx, y); ctx.lineTo(x, y-10*dy); ctx.lineTo(x-10*dx, y);
      ctx.closePath(); ctx.fillStyle = '#0284C7'; ctx.fill();
      ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 1; ctx.stroke();
    });
    ctx.restore();
  }

  // ── 3. HEADER BAR ──────────────────────────────────────────
  ctx.save();
  if (isBleed) {
    if (foilStyle === 'Secret Gold') {
      ctx.fillStyle = 'rgba(5,8,18,0.86)'; drawRoundRectPath(ctx, 24, 26, w-48, 62, 12); ctx.fill();
      const gg = ctx.createLinearGradient(0,0,w,80); gg.addColorStop(0,'#D97706'); gg.addColorStop(1,'#FBBF24');
      ctx.strokeStyle = gg; ctx.lineWidth = 2.5; ctx.stroke();
    } else if (foilStyle === 'Special Illustration') {
      ctx.fillStyle = 'rgba(248,250,252,0.90)'; drawRoundRectPath(ctx, 24, 26, w-48, 62, 10); ctx.fill();
      ctx.strokeStyle = '#0EA5E9'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(10,22,46,0.78)'; drawRoundRectPath(ctx, 24, 26, w-48, 62, 12); ctx.fill();
      ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2; ctx.stroke();
    }
  } else {
    const hg = ctx.createLinearGradient(30, 64, w-30, 64);
    hg.addColorStop(0,'#0A1628'); hg.addColorStop(0.5,'#15314F'); hg.addColorStop(1,'#0A1628');
    ctx.fillStyle = hg; drawRoundRectPath(ctx, 30, 64, w-60, 50, 8); ctx.fill();
    // Neon cyan underline
    ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 8;
    ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, 110); ctx.lineTo(w-40, 110); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(56,189,248,0.4)'; ctx.lineWidth = 1.5;
    drawRoundRectPath(ctx, 30, 64, w-60, 50, 8); ctx.stroke();
  }
  ctx.restore();

  // RARE chip badge (framed) or ex badge
  let nameX = 48;
  if (foilStyle === 'Full Art ex') {
    ctx.save();
    const bg = ctx.createLinearGradient(36,36,86,58); bg.addColorStop(0,'#06B6D4'); bg.addColorStop(1,'#0EA5E9');
    ctx.fillStyle = bg; drawRoundRectPath(ctx, 36, 36, 50, 22, 6); ctx.fill();
    ctx.strokeStyle = '#67E8F9'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold italic 13px "Outfit",sans-serif'; ctx.textAlign='center';
    ctx.fillText('ex', 61, 52); ctx.restore();
    nameX = 100;
  } else if (!isBleed) {
    ctx.save();
    const bg = ctx.createLinearGradient(40,72,86,92); bg.addColorStop(0,'#0891B2'); bg.addColorStop(1,'#06B6D4');
    ctx.shadowColor='#06B6D4'; ctx.shadowBlur=6; ctx.fillStyle = bg;
    drawRoundRectPath(ctx, 40, 73, 50, 18, 9); ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle='#ECFEFF'; ctx.font='900 10px "Outfit",sans-serif'; ctx.textAlign='center';
    ctx.fillText('RARE', 65, 86); ctx.restore();
    nameX = 102;
  }

  // Name + HP
  const textY = isBleed ? 67 : 97;
  const nx = isBleed ? (foilStyle === 'Full Art ex' ? 100 : 48) : nameX;
  const tStroke = (foilStyle === 'Secret Gold') ? '#78350F' : '#072033';
  const tFill = (isBleed && foilStyle === 'Special Illustration') ? '#0891B2' : (foilStyle === 'Secret Gold' ? '#FCD34D' : '#F0FBFF');
  if (isBleed && foilStyle === 'Special Illustration') {
    ctx.fillStyle = tFill; ctx.font='800 24px "Outfit",sans-serif'; ctx.textAlign='left';
    ctx.fillText(cardData.name || 'Meme Cat', nx, textY);
    ctx.textAlign='right'; ctx.fillText(`HP ${cardData.hypeScore || 200}`, w-68, textY);
  } else {
    drawTextWithStroke(ctx, cardData.name || 'Meme Cat', nx, textY, '800 24px "Outfit",sans-serif', tFill, tStroke, 3);
    ctx.save(); ctx.textAlign='right';
    drawTextWithStroke(ctx, `HP ${cardData.hypeScore || 200}`, w-68, textY, 'bold 20px "Outfit",sans-serif', tFill, tStroke, 2.5);
    ctx.restore();
  }
  drawElementSymbol(ctx, w - 50, textY - 8, 13, cardData.element);

  // ── 4. ARTWORK WINDOW ──────────────────────────────────────
  const artX = 30, artY = 126, artW = w - 60, artH = 340;
  if (!isBleed) {
    if (foilStyle === 'Holo') {
      drawNeonRareBorder(ctx, artX, artY, artW, artH);
    } else {
      ctx.save();
      const abg = ctx.createLinearGradient(artX, artY, artX+artW, artY+artH);
      abg.addColorStop(0,'#38BDF8'); abg.addColorStop(0.5,'#E0F7FF'); abg.addColorStop(1,'#0284C7');
      ctx.strokeStyle = abg; ctx.lineWidth = 4; ctx.strokeRect(artX, artY, artW, artH);
      ctx.restore();
    }
    if (artworkImage) drawCoverImage(ctx, artworkImage, artX, artY, artW, artH, cardData._imgTransform);
    else { ctx.fillStyle = '#0A1628'; ctx.fillRect(artX, artY, artW, artH); }
    // Feathered seam + element grade
    finishArtworkWindow(ctx, artX, artY, artW, artH, cardData.element);
    // Neon L-bracket corners on artwork
    ctx.save();
    const bLen = 20;
    [[artX,artY,1,1],[artX+artW,artY,-1,1],[artX,artY+artH,1,-1],[artX+artW,artY+artH,-1,-1]].forEach(([cx,cy,dx,dy]) => {
      ctx.shadowColor='#67E8F9'; ctx.shadowBlur=8;
      ctx.strokeStyle='#67E8F9'; ctx.lineWidth=2.5; ctx.lineCap='square';
      ctx.beginPath(); ctx.moveTo(cx+dx*bLen, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy+dy*bLen); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx+dx*2, cy+dy*2, 2.5, 0, Math.PI*2); ctx.fillStyle='#A5F3FC'; ctx.fill();
    });
    ctx.restore();
  }

  // ── 5. SPECIES BAR ─────────────────────────────────────────
  if (!isBleed) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,22,46,0.85)'; ctx.fillRect(30, 476, w-60, 22);
    ctx.strokeStyle = 'rgba(56,189,248,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(30, 476, w-60, 22);
    ctx.fillStyle = '#38BDF8'; ctx.font = 'italic 500 11px "Inter",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`HOLO RARE • Hype: ${cardData.hypeScore || 200} • Yield: ${cardData.likesPerSec || 0} L/s`, w/2, 491);
    ctx.restore();
  }

  // ── 6. ATTACK PANEL ────────────────────────────────────────
  const panelY = isBleed ? 480 : 510, panelH = isBleed ? 300 : 262;
  ctx.save();
  if (isBleed && foilStyle === 'Secret Gold') {
    ctx.fillStyle = 'rgba(5,8,18,0.88)'; drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 18); ctx.fill();
    const gg = ctx.createLinearGradient(0,panelY,0,panelY+panelH); gg.addColorStop(0,'#D97706'); gg.addColorStop(1,'#FBBF24');
    ctx.strokeStyle = gg; ctx.lineWidth = 2.5; ctx.stroke();
  } else if (isBleed && foilStyle === 'Special Illustration') {
    ctx.fillStyle = 'rgba(255,255,255,0.90)'; drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (isBleed) {
    ctx.fillStyle = 'rgba(10,22,46,0.84)'; drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  } else {
    const pg = ctx.createLinearGradient(0,panelY,0,panelY+panelH);
    pg.addColorStop(0,'rgba(10,22,46,0.86)'); pg.addColorStop(1,'rgba(15,40,68,0.86)');
    ctx.fillStyle = pg; drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();

  const pText = (isBleed && foilStyle === 'Special Illustration') ? '#0F172A' : '#F0FBFF';
  const pVal  = (isBleed && foilStyle === 'Special Illustration') ? '#0284C7' : '#38BDF8';
  const divY = isBleed ? panelY + 90 : panelY + 96;

  // Attack 1
  const a1y = isBleed ? panelY + 56 : panelY + 62;
  drawElementSymbol(ctx, 58, a1y - 8, 14, cardData.element);
  ctx.fillStyle = pText; ctx.font = 'bold 20px "Outfit",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(cardData.attackName1 || 'Hyper Mew', 88, a1y);
  ctx.fillStyle = pVal; ctx.textAlign = 'right';
  ctx.fillText(`+${cardData.likesPerSec || 2.5} L/s`, w - 55, a1y);

  // Cyan divider
  ctx.save();
  ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 4;
  ctx.strokeStyle = 'rgba(56,189,248,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(38, divY); ctx.lineTo(w-38, divY); ctx.stroke();
  ctx.restore();

  // Attack 2
  const a2y = isBleed ? panelY + 128 : panelY + 132;
  drawElementSymbol(ctx, 58, a2y - 8, 14, cardData.element);
  drawElementSymbol(ctx, 92, a2y - 8, 14, cardData.element);
  drawElementSymbol(ctx, 126, a2y - 8, 14, 'Normal');
  ctx.fillStyle = pText; ctx.font = 'bold 20px "Outfit",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(cardData.attackName2 || 'Cosmic Wave', 156, a2y);
  ctx.fillStyle = pVal; ctx.textAlign = 'right';
  ctx.fillText(`+${cardData.hypeScore || 200} HP`, w - 55, a2y);

  // Rule box
  if (foilStyle === 'Full Art ex') {
    const rx = 50, ry = panelY + 170, rw = w - 100, rh = 52;
    ctx.fillStyle = 'rgba(14,116,144,0.20)'; drawRoundRectPath(ctx, rx, ry, rw, rh, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#38BDF8'; ctx.font = '900 italic 10px "Outfit",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('RARE ex RULE', w/2, ry + 16);
    ctx.fillStyle = '#E0F7FF'; ctx.font = '500 10px "Inter",sans-serif';
    ctx.fillText('Showcasing this card boosts passive coin yield by 1.2×.', w/2, ry + 34);
  }

  // Description
  const descY = (foilStyle === 'Full Art ex') ? panelY + 248 : panelY + 198;
  drawWrappedText(ctx, cardData.description || 'Kucing langka bertatapan mistis yang memanipulasi algoritma viral.', w/2, descY, w - 96, 18,
    (isBleed && foilStyle === 'Special Illustration') ? '#475569' : '#94C5D9',
    'italic 500 13px "Inter",sans-serif'
  );

  // ── 7. FOOTER ──────────────────────────────────────────────
  const footerY = isBleed ? h - 44 : 800;
  drawPremiumFooter(ctx, w, h, footerY, cardData, {
    rarity: 'Rare',
    labelColor: '#5B8BAA',
    valueColor: '#A5DDF5',
    metaColor: '#456B85',
  });
}

// ============================================================
// EPIC TCG Template Design — "AMETHYST VORTEX VSTAR"
// ============================================================
function drawEpic(ctx, w, h, cardData, artworkImage, foilStyle = 'Standard') {
  const elementColor = getElementColor(cardData.element);
  const isBleed = isFullBleed(foilStyle);

  // ── 1. BACKGROUND (cosmic nebula) ──────────────────────────
  if (isBleed) {
    if (artworkImage) drawCoverImage(ctx, artworkImage, 0, 0, w, h, cardData._imgTransform);
    else { ctx.fillStyle = '#1A0B3D'; ctx.fillRect(0, 0, w, h); }
    const vig = ctx.createLinearGradient(0, h * 0.52, 0, h);
    vig.addColorStop(0, 'rgba(7,11,26,0)');
    vig.addColorStop(0.5, 'rgba(10,7,24,0.55)');
    vig.addColorStop(1, 'rgba(5,3,16,0.95)');
    ctx.fillStyle = vig; ctx.fillRect(0, h * 0.52, w, h * 0.48);
  } else {
    drawElementBackground(ctx, w, h, cardData.element, 'Epic');
    // Nebula radial multi-color overlay
    const neb = ctx.createRadialGradient(w*0.5, h*0.32, 10, w*0.5, h*0.32, w*0.85);
    neb.addColorStop(0, 'rgba(192,38,211,0.28)');
    neb.addColorStop(0.45, 'rgba(124,58,237,0.18)');
    neb.addColorStop(1, 'transparent');
    ctx.fillStyle = neb; ctx.fillRect(0, 0, w, h);
    // Scattered stars
    ctx.save(); ctx.fillStyle = '#F3E8FF';
    const rand = createSeededRandom(909);
    for (let i = 0; i < 40; i++) {
      const sx = rand()*w, sy = rand()*h, sr = 0.4 + rand()*1.4;
      ctx.globalAlpha = 0.3 + rand()*0.5;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    applyGrain(ctx, 0, 0, w, h, 0.35);
  }

  // ── 2. BORDER ──────────────────────────────────────────────
  ctx.save();
  if (foilStyle === 'Special Illustration') {
    drawEpicSpecialIllustrationFrame(ctx, w, h, 16);
  } else if (foilStyle === 'Reverse Holo') {
    drawEpicReverseHoloBorder(ctx, w, h, 16);
  } else if (foilStyle === 'Secret Gold') {
    const gg = ctx.createLinearGradient(0,0,w,h);
    gg.addColorStop(0,'#D97706'); gg.addColorStop(0.5,'#F59E0B'); gg.addColorStop(1,'#B45309');
    ctx.strokeStyle = gg; ctx.lineWidth = 16;
    drawRoundRectPath(ctx, 8, 8, w-16, h-16, 22); ctx.stroke();
  } else {
    // Beveled amethyst border: metal ungu ber-specular, arcane ornate
    drawBeveledBorder(ctx, w, h, {
      inset: 8, width: 16, radius: 22,
      stops: METAL_STOPS.purple,
      bright: 'rgba(243,232,255,0.85)',
      chamfer: 'rgba(30,10,55,0.80)',
      innerDark: 'rgba(46,16,101,0.60)',
      glow: '#A855F7',
    });
  }
  ctx.restore();

  // Amethyst gems at corners
  if (foilStyle !== 'Special Illustration') {
    if (foilStyle === 'Secret Gold') {
      const cs = 34;
      ctx.save();
      [[18,18,1,1],[w-18,18,-1,1],[18,h-18,1,-1],[w-18,h-18,-1,-1]].forEach(([x,y,dx,dy]) => {
        ctx.strokeStyle = '#C084FC'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y+cs*dy); ctx.lineTo(x, y); ctx.lineTo(x+cs*dx, y); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y+10*dy); ctx.lineTo(x+10*dx, y); ctx.lineTo(x, y-10*dy); ctx.lineTo(x-10*dx, y);
        ctx.closePath(); ctx.fillStyle = '#7C3AED'; ctx.fill();
      });
      ctx.restore();
    } else {
      // Gem amethyst faceted sungguhan di 4 sudut
      const amethyst = { light: '#E9D5FF', mid: '#A855F7', dark: '#6B21A8', rim: '#2E1065', glow: '#A855F7' };
      [[20,20],[w-20,20],[20,h-20],[w-20,h-20]].forEach(([cx,cy]) => drawFacetedGem(ctx, cx, cy, 13, amethyst));
    }
  }

  // ── 3. HEADER BAR ──────────────────────────────────────────
  ctx.save();
  if (isBleed) {
    if (foilStyle === 'Secret Gold') {
      ctx.fillStyle = 'rgba(5,8,18,0.86)'; drawRoundRectPath(ctx, 24, 26, w-48, 62, 12); ctx.fill();
      const gg = ctx.createLinearGradient(0,0,w,80); gg.addColorStop(0,'#D97706'); gg.addColorStop(1,'#FBBF24');
      ctx.strokeStyle = gg; ctx.lineWidth = 2.5; ctx.stroke();
    } else if (foilStyle === 'Special Illustration') {
      ctx.fillStyle = 'rgba(248,250,252,0.90)'; drawRoundRectPath(ctx, 24, 26, w-48, 62, 10); ctx.fill();
      ctx.strokeStyle = '#A855F7'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(10,7,20,0.80)'; drawRoundRectPath(ctx, 24, 26, w-48, 62, 12); ctx.fill();
      ctx.strokeStyle = '#A855F7'; ctx.lineWidth = 2; ctx.stroke();
    }
  } else {
    const hg = ctx.createLinearGradient(30, 64, w-30, 64);
    hg.addColorStop(0,'#1A0B3D'); hg.addColorStop(0.5,'#2E1065'); hg.addColorStop(1,'#1A0B3D');
    ctx.fillStyle = hg; drawRoundRectPath(ctx, 30, 64, w-60, 50, 8); ctx.fill();
    // Purple→pink gradient accent bar under name
    const ab = ctx.createLinearGradient(40, 0, w-40, 0);
    ab.addColorStop(0,'#C026D3'); ab.addColorStop(1,'#EC4899');
    ctx.fillStyle = ab; ctx.fillRect(40, 109, w-80, 3);
    ctx.strokeStyle = 'rgba(168,85,247,0.4)'; ctx.lineWidth = 1.5;
    drawRoundRectPath(ctx, 30, 64, w-60, 50, 8); ctx.stroke();
  }
  ctx.restore();

  // VSTAR badge (framed) or ex badge
  let nameX = 48;
  if (foilStyle === 'Full Art ex') {
    ctx.save();
    const bg = ctx.createLinearGradient(36,36,90,58); bg.addColorStop(0, elementColor); bg.addColorStop(1,'#EC4899');
    ctx.fillStyle = bg; drawRoundRectPath(ctx, 36, 36, 50, 22, 6); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold italic 15px "Outfit",sans-serif'; ctx.textAlign='center';
    ctx.fillText('ex', 61, 53); ctx.restore();
    nameX = 100;
  } else if (!isBleed) {
    drawVStarBadge(ctx, 40, 72, 'VSTAR', '#C026D3', '#7C3AED');
    nameX = 122;
  }

  // Name + HP
  const textY = isBleed ? 67 : 97;
  const nx = isBleed ? (foilStyle === 'Full Art ex' ? 100 : 48) : nameX;
  const tStroke = (foilStyle === 'Secret Gold') ? '#78350F' : '#2E1065';
  const tFill = (isBleed && foilStyle === 'Special Illustration') ? '#7C3AED' : (foilStyle === 'Secret Gold' ? '#FCD34D' : '#F8F0FF');
  // Nama pakai Cinzel — mood arcane dimulai dari Epic
  const epicName = cardData.name || 'Meme Cat';
  const epicNameFont = fitFont(ctx, epicName, '800', 22, '"Cinzel","Outfit",serif', w - nx - 165);
  if (isBleed && foilStyle === 'Special Illustration') {
    ctx.fillStyle = tFill; ctx.font = epicNameFont; ctx.textAlign='left';
    ctx.fillText(epicName, nx, textY);
    ctx.textAlign='right'; ctx.font='800 23px "Outfit",sans-serif';
    ctx.fillText(`HP ${cardData.hypeScore || 400}`, w-72, textY);
  } else {
    drawTextWithStroke(ctx, epicName, nx, textY, epicNameFont, tFill, tStroke, 3);
    ctx.save(); ctx.textAlign='right';
    drawTextWithStroke(ctx, `HP ${cardData.hypeScore || 400}`, w-72, textY, 'bold 21px "Outfit",sans-serif', tFill, tStroke, 2.5);
    ctx.restore();
  }
  drawElementSymbol(ctx, w - 52, textY - 8, 13, cardData.element);

  // ── 4. ARTWORK WINDOW ──────────────────────────────────────
  const artX = 30, artY = 126, artW = w - 60, artH = 340;
  if (!isBleed) {
    ctx.save();
    const abg = ctx.createLinearGradient(artX, artY, artX+artW, artY+artH);
    abg.addColorStop(0,'#C084FC'); abg.addColorStop(0.5,'#F3E8FF'); abg.addColorStop(1,'#7C3AED');
    ctx.strokeStyle = abg; ctx.lineWidth = 4; ctx.strokeRect(artX, artY, artW, artH);
    ctx.restore();
    if (artworkImage) drawCoverImage(ctx, artworkImage, artX, artY, artW, artH, cardData._imgTransform);
    else { ctx.fillStyle = '#1A0B3D'; ctx.fillRect(artX, artY, artW, artH); }
    // Feathered seam + element grade
    finishArtworkWindow(ctx, artX, artY, artW, artH, cardData.element);
    // Constellation ornament around the artwork
    drawConstellationFrame(ctx, artX, artY, artW, artH);
  }

  // ── 5. SPECIES BAR ─────────────────────────────────────────
  if (!isBleed) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,7,20,0.85)'; ctx.fillRect(30, 476, w-60, 22);
    ctx.strokeStyle = 'rgba(168,85,247,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(30, 476, w-60, 22);
    ctx.fillStyle = '#C084FC'; ctx.font = 'italic 500 11px "Inter",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`EPIC VSTAR • Hype: ${cardData.hypeScore || 400} • Yield: ${cardData.likesPerSec || 0} L/s`, w/2, 491);
    ctx.restore();
  }

  // ── 6. ATTACK PANEL ────────────────────────────────────────
  const panelY = isBleed ? 480 : 510, panelH = isBleed ? 300 : 262;
  ctx.save();
  if (isBleed && foilStyle === 'Secret Gold') {
    ctx.fillStyle = 'rgba(5,8,18,0.88)'; drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 18); ctx.fill();
    const gg = ctx.createLinearGradient(0,panelY,0,panelY+panelH); gg.addColorStop(0,'#D97706'); gg.addColorStop(1,'#FBBF24');
    ctx.strokeStyle = gg; ctx.lineWidth = 2.5; ctx.stroke();
  } else if (isBleed && foilStyle === 'Special Illustration') {
    ctx.fillStyle = 'rgba(255,255,255,0.90)'; drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(168,85,247,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (isBleed) {
    ctx.fillStyle = 'rgba(5,3,20,0.88)'; drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(168,85,247,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  } else {
    const pg = ctx.createLinearGradient(0,panelY,0,panelY+panelH);
    pg.addColorStop(0,'rgba(20,11,45,0.88)'); pg.addColorStop(1,'rgba(10,7,24,0.88)');
    ctx.fillStyle = pg; drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 12); ctx.fill();
    // Purple inner glow border
    ctx.shadowColor = '#A855F7'; ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(168,85,247,0.45)'; ctx.lineWidth = 1.5;
    drawRoundRectPath(ctx, 28, panelY, w-56, panelH, 12); ctx.stroke();
  }
  ctx.restore();

  const pText = (isBleed && foilStyle === 'Special Illustration') ? '#1E1B4B' : '#F8F0FF';
  const pVal  = (isBleed && foilStyle === 'Special Illustration') ? '#7C3AED' : '#C084FC';
  const divY = isBleed ? panelY + 90 : panelY + 96;

  // ABILITY badge + Attack 1
  const a1y = isBleed ? panelY + 56 : panelY + 62;
  drawElementSymbol(ctx, 56, a1y - 8, 14, cardData.element);
  ctx.fillStyle = pText; ctx.font = '800 21px "Outfit",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(cardData.attackName1 || 'Aura Strike', 86, a1y);
  ctx.fillStyle = pVal; ctx.textAlign = 'right';
  ctx.fillText(`+${cardData.likesPerSec || 6.5} L/s`, w - 55, a1y);

  // Glow divider
  ctx.save();
  ctx.shadowColor = '#A855F7'; ctx.shadowBlur = 5;
  ctx.strokeStyle = 'rgba(168,85,247,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(38, divY); ctx.lineTo(w-38, divY); ctx.stroke();
  ctx.restore();

  // Attack 2
  const a2y = isBleed ? panelY + 128 : panelY + 132;
  drawElementSymbol(ctx, 56, a2y - 8, 14, cardData.element);
  drawElementSymbol(ctx, 90, a2y - 8, 14, cardData.element);
  drawElementSymbol(ctx, 124, a2y - 8, 14, 'Normal');
  ctx.fillStyle = pText; ctx.font = '800 21px "Outfit",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(cardData.attackName2 || 'Vortex Blast', 154, a2y);
  ctx.fillStyle = pVal; ctx.textAlign = 'right';
  ctx.fillText(`+${cardData.hypeScore || 400} HP`, w - 55, a2y);

  // Rule box
  if (foilStyle === 'Full Art ex') {
    const rx = 50, ry = panelY + 170, rw = w - 100, rh = 52;
    ctx.fillStyle = 'rgba(168,85,247,0.18)'; drawRoundRectPath(ctx, rx, ry, rw, rh, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(236,72,153,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#F472B6'; ctx.font = '900 italic 10px "Outfit",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('EPIC VSTAR RULE', w/2, ry + 16);
    ctx.fillStyle = '#F3E8FF'; ctx.font = '500 10px "Inter",sans-serif';
    ctx.fillText('Showcasing this card boosts passive coin yield by 1.5×.', w/2, ry + 34);
  }

  // Description
  const descY = (foilStyle === 'Full Art ex') ? panelY + 248 : panelY + 198;
  drawWrappedText(ctx, cardData.description || 'Kucing legendaris berselimut energi galaksi ungu yang memancarkan aura tak tertandingi.', w/2, descY, w - 96, 17,
    (isBleed && foilStyle === 'Special Illustration') ? '#475569' : '#C4B5DD',
    'italic 500 13px "Inter",sans-serif'
  );

  // ── 7. FOOTER ──────────────────────────────────────────────
  const footerY = isBleed ? h - 44 : 800;
  drawPremiumFooter(ctx, w, h, footerY, cardData, {
    rarity: 'Epic',
    labelColor: '#9B7FC9',
    valueColor: '#E5D5FF',
    metaColor: '#6B5491',
  });
}

// ============================================================
// LEGENDARY TCG Template Design — "DIVINE CROWN MEGA"
// ============================================================
function drawLegendary(ctx, w, h, cardData, artworkImage, foilStyle = 'Standard') {
  const isBleed = isFullBleed(foilStyle);

  const goldGrad = ctx.createLinearGradient(0, 0, w, h);
  goldGrad.addColorStop(0, '#D97706');
  goldGrad.addColorStop(0.25, '#FBBF24');
  goldGrad.addColorStop(0.5, '#FEF08A');
  goldGrad.addColorStop(0.75, '#FBBF24');
  goldGrad.addColorStop(1, '#B45309');

  // ── 1. BACKGROUND (divine aura) ────────────────────────────
  if (isBleed) {
    if (artworkImage) drawCoverImage(ctx, artworkImage, 0, 0, w, h, cardData._imgTransform);
    else { ctx.fillStyle = '#1A0F02'; ctx.fillRect(0, 0, w, h); }
    const vig = ctx.createLinearGradient(0, h * 0.52, 0, h);
    vig.addColorStop(0, 'rgba(7,11,26,0)');
    vig.addColorStop(0.5, 'rgba(10,7,3,0.50)');
    vig.addColorStop(1, 'rgba(5,3,8,0.96)');
    ctx.fillStyle = vig; ctx.fillRect(0, h * 0.52, w, h * 0.48);
  } else {
    // Ultra-dark royal base
    const bg = ctx.createRadialGradient(w/2, h*0.34, 30, w/2, h*0.5, h*0.75);
    bg.addColorStop(0, '#2A1B05');
    bg.addColorStop(0.55, '#0F0A02');
    bg.addColorStop(1, '#05030A');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // Radial aura rays from center
    drawRadialAuraRays(ctx, w/2, h*0.34, h*0.7, 'rgb(245,158,11)', 12);
    // Crown watermark
    drawCrownWatermark(ctx, w/2, h*0.5, 130, '#F59E0B');
    // Gold dust stars
    ctx.save(); ctx.fillStyle = '#FEF08A';
    const rand = createSeededRandom(1212);
    for (let i = 0; i < 35; i++) {
      const sx = rand()*w, sy = rand()*h, sr = 0.4 + rand()*1.3;
      ctx.globalAlpha = 0.25 + rand()*0.45;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    applyGrain(ctx, 0, 0, w, h, 0.4);
  }

  // ── 2. TRIPLE GOLD BORDER ──────────────────────────────────
  ctx.save();
  if (foilStyle === 'Special Illustration') {
    drawLegendaryGoldLeavesBorder(ctx, w, h, 18);
  } else if (foilStyle === 'Reverse Holo') {
    const rg = ctx.createLinearGradient(0, 0, w, h);
    rg.addColorStop(0,'#F59E0B'); rg.addColorStop(0.25,'#FBBF24'); rg.addColorStop(0.5,'#A7F3D0');
    rg.addColorStop(0.75,'#BFDBFE'); rg.addColorStop(1,'#EC4899');
    ctx.strokeStyle = rg;
    ctx.lineWidth = 16;
    drawRoundRectPath(ctx, 9, 9, w - 18, h - 18, 22); ctx.stroke();
    ctx.strokeStyle = '#FEF9C3'; ctx.lineWidth = 2;
    drawRoundRectPath(ctx, 18, 18, w - 36, h - 36, 15); ctx.stroke();
  } else {
    // Border emas beveled metalik — specular ramp + chamfer, bukan
    // gradient datar. Ini "gold leaf" versi Royal Artifact.
    drawBeveledBorder(ctx, w, h, {
      inset: 9, width: 16, radius: 22,
      stops: METAL_STOPS.gold,
      bright: 'rgba(254,249,195,0.95)',
      chamfer: 'rgba(58,32,4,0.85)',
      innerDark: 'rgba(120,53,15,0.65)',
      glow: '#F59E0B',
    });
  }

  // 8-point star diamond gems at corners
  if (foilStyle !== 'Special Illustration') {
    [[22,22],[w-22,22],[22,h-22],[w-22,h-22]].forEach(([cx,cy]) => drawStarDiamondGem(ctx, cx, cy, 14));
  }
  ctx.restore();

  // ── 3. HEADER BAR ──────────────────────────────────────────
  ctx.save();
  if (isBleed) {
    ctx.fillStyle = 'rgba(5,5,8,0.86)'; drawRoundRectPath(ctx, 30, 30, w - 60, 64, 14); ctx.fill();
    ctx.strokeStyle = goldGrad; ctx.lineWidth = 3; ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(5,5,8,0.92)'; drawRoundRectPath(ctx, 30, 62, w - 60, 52, 10); ctx.fill();
    ctx.strokeStyle = goldGrad; ctx.lineWidth = 2.5; ctx.stroke();
    // Bright inner accent
    ctx.strokeStyle = 'rgba(254,240,138,0.5)'; ctx.lineWidth = 1;
    drawRoundRectPath(ctx, 34, 66, w - 68, 44, 8); ctx.stroke();
  }
  ctx.restore();

  // ex Badge
  if (foilStyle === 'Full Art ex') {
    ctx.save();
    const bg = ctx.createLinearGradient(82, 50, 132, 74); bg.addColorStop(0,'#D97706'); bg.addColorStop(1,'#EF4444');
    ctx.fillStyle = bg; drawRoundRectPath(ctx, 82, 50, 50, 24, 6); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold italic 15px "Outfit",sans-serif'; ctx.textAlign='center';
    ctx.fillText('ex', 107, 67); ctx.restore();
  }

  // Element icon + crown emblem in header
  const iconY = isBleed ? 64 : 90;
  ctx.save(); ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 10;
  drawElementSymbol(ctx, isBleed ? 58 : 54, iconY, 15, cardData.element);
  ctx.restore();

  // Name (gold gradient, Cinzel — font display royal) + HP
  const textY = isBleed ? 74 : 98;
  const nameX = (foilStyle === 'Full Art ex') ? 144 : (isBleed ? 88 : 82);
  ctx.save();
  const legendName = cardData.name || 'Meme Cat';
  ctx.font = fitFont(ctx, legendName, '900', 23, '"Cinzel","Outfit",serif', w - nameX - 170);
  ctx.textAlign = 'left';
  ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3D2606';
  ctx.strokeText(legendName, nameX, textY);
  const ng = ctx.createLinearGradient(nameX, textY - 20, nameX, textY + 4);
  ng.addColorStop(0, '#FEF9C3'); ng.addColorStop(0.5, '#FCD34D'); ng.addColorStop(1, '#D97706');
  ctx.fillStyle = ng; ctx.fillText(legendName, nameX, textY);
  ctx.restore();

  ctx.save(); ctx.textAlign = 'right';
  drawTextWithStroke(ctx, `HP ${cardData.hypeScore || 800}`, w - 74, textY, 'bold 22px "Outfit",sans-serif', '#FCD34D', '#3D2606', 3);
  ctx.restore();
  // Mini crown emblem near HP
  ctx.save(); ctx.globalAlpha = 0.9;
  drawCrownWatermark(ctx, w - 52, iconY, 22, '#FCD34D');
  ctx.restore();

  // ── 4. ARTWORK WINDOW (gold filigree corners) ──────────────
  const artX = 30, artY = 126, artW = w - 60, artH = 338;
  if (!isBleed) {
    if (foilStyle === 'Holo') {
      drawLegendaryHoloArtworkBorder(ctx, artX, artY, artW, artH);
    } else {
      ctx.save(); ctx.strokeStyle = goldGrad; ctx.lineWidth = 5;
      ctx.strokeRect(artX, artY, artW, artH); ctx.restore();
    }
    if (artworkImage) drawCoverImage(ctx, artworkImage, artX, artY, artW, artH, cardData._imgTransform);
    else { ctx.fillStyle = '#1A0F02'; ctx.fillRect(artX, artY, artW, artH); }
    // Feathered seam + element grade
    finishArtworkWindow(ctx, artX, artY, artW, artH, cardData.element);
    // Royal filigree berlapis (ukiran emas dengan kedalaman) di 4 sudut
    drawRoyalFiligree(ctx, artX,      artY,      42,  1,  1);
    drawRoyalFiligree(ctx, artX+artW, artY,      42, -1,  1);
    drawRoyalFiligree(ctx, artX,      artY+artH, 42,  1, -1);
    drawRoyalFiligree(ctx, artX+artW, artY+artH, 42, -1, -1);
    // Gold sparkle dots along sides
    ctx.save(); ctx.fillStyle = '#FEF08A'; ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 5;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.arc(artX + (artW/6)*i, artY - 1, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(artX + (artW/6)*i, artY + artH + 1, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ── 5. SPECIES BAR ─────────────────────────────────────────
  if (!isBleed) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,8,0.88)'; ctx.fillRect(30, 476, w-60, 22);
    ctx.strokeStyle = goldGrad; ctx.lineWidth = 1.5; ctx.strokeRect(30, 476, w-60, 22);
    ctx.fillStyle = '#FCD34D'; ctx.font = 'italic 500 11px "Inter",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`LEGENDARY DIVINE • Hype: ${cardData.hypeScore || 800} • Yield: ${cardData.likesPerSec || 0} L/s`, w/2, 491);
    ctx.restore();
  }

  // ── 6. ATTACK PANEL — PARCHMENT (Royal Artifact) ───────────
  // Kertas tua bertekstur dengan trim emas; teks jadi gelap seperti
  // tinta di gulungan mantra
  const panelY = isBleed ? 478 : 510, panelH = isBleed ? 302 : 262;
  drawParchmentPanel(ctx, 28, panelY, w-56, panelH, 16);

  // LEGENDARY RULE banner stamp at top of panel
  ctx.save();
  const bannerW = 200, bannerX = (w - bannerW)/2, bannerY = panelY - 12;
  const bgr = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY);
  bgr.addColorStop(0,'#92400E'); bgr.addColorStop(0.5,'#FBBF24'); bgr.addColorStop(1,'#92400E');
  ctx.fillStyle = bgr; ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  drawRoundRectPath(ctx, bannerX, bannerY, bannerW, 22, 11); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = '#FEF9C3'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#1A0F02'; ctx.font = '900 11px "Outfit",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('★ LEGENDARY CROWN RULE ★', w/2, bannerY + 15);
  ctx.restore();

  // Attack 1 — tinta gelap di atas parchment
  const a1y = isBleed ? panelY + 64 : panelY + 70;
  drawElementSymbol(ctx, 60, a1y - 8, 15, cardData.element);
  ctx.fillStyle = '#2E1F06'; ctx.font = '800 22px "Outfit",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(cardData.attackName1 || 'Omega Purr', 90, a1y);
  ctx.fillStyle = '#8A5A0B'; ctx.textAlign = 'right';
  ctx.fillText(`+${cardData.likesPerSec || 15} L/s`, w - 58, a1y);

  // Divider tinta emas-cokelat
  ctx.save();
  ctx.strokeStyle = 'rgba(138,90,11,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(48, a1y + 24); ctx.lineTo(w-48, a1y + 24); ctx.stroke();
  // Ornamen kecil di tengah divider
  ctx.fillStyle = 'rgba(138,90,11,0.55)';
  starPath(ctx, w/2, a1y + 24, 4, 4, 1.6); ctx.fill();
  ctx.restore();

  // Attack 2
  const a2y = isBleed ? panelY + 130 : panelY + 136;
  drawElementSymbol(ctx, 60, a2y - 8, 15, cardData.element);
  drawElementSymbol(ctx, 95, a2y - 8, 15, cardData.element);
  drawElementSymbol(ctx, 130, a2y - 8, 15, 'Normal');
  ctx.fillStyle = '#2E1F06'; ctx.font = '800 22px "Outfit",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(cardData.attackName2 || 'Golden Hype', 160, a2y);
  ctx.fillStyle = '#8A5A0B'; ctx.textAlign = 'right';
  ctx.fillText(`+${cardData.hypeScore || 800} HP`, w - 58, a2y);

  // Rule text
  ctx.fillStyle = '#8A5A0B'; ctx.font = '600 10px "Inter",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Generates coins at maximum divine efficiency.', w/2, a2y + 36);

  // Description — tinta cokelat tua italic
  const descY = isBleed ? panelY + 232 : panelY + 218;
  drawWrappedText(ctx, cardData.description || 'Penguasa internet tertinggi yang disembah para netizen. Kehadirannya melipatgandakan hype global secara instan.', w/2, descY, w - 96, 16,
    '#5B451D', 'italic 500 12px "Inter",sans-serif'
  );

  // ── 7. FOOTER ──────────────────────────────────────────────
  const footerY = isBleed ? h - 46 : 802;
  drawPremiumFooter(ctx, w, h, footerY, cardData, {
    rarity: 'Legendary',
    labelColor: '#A8895A',
    valueColor: '#FCD34D',
    metaColor: '#D97706',
  });
}

function applySecretGoldOverlay(ctx, w, h) {
  ctx.save();
  // Warm-gold color wash overlay
  ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  ctx.globalCompositeOperation = 'color-burn';
  ctx.fillRect(0, 0, w, h);
  
  // Diagonal gold metallic sheen shine overlay
  const shineGrad = ctx.createLinearGradient(0, 0, w, h);
  shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  shineGrad.addColorStop(0.35, 'rgba(251, 191, 36, 0.12)');
  shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.22)');
  shineGrad.addColorStop(0.65, 'rgba(251, 191, 36, 0.12)');
  shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = shineGrad;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Renders the full TCG layout for a card onto a canvas.
 * @param {Object} cardData - Metadata { name, rarity, description, hypeScore, likesPerSec, element, foilStyle }
 * @param {HTMLImageElement} artworkImage - The preloaded 2D cat illustration image
 * @returns {HTMLCanvasElement} The drawn canvas element
 */
export function drawCardCanvas(cardData, artworkImage) {
  const canvas = document.createElement('canvas');
  // Resolusi 2× di tier medium/high supaya teks & garis tetap tajam saat
  // kartu tampil besar; koordinat logis tetap 600×840 berkat ctx.scale
  const S = getQualityConfig().canvasScale;
  canvas.width = 600 * S;
  canvas.height = 840 * S;
  const ctx = canvas.getContext('2d');
  ctx.scale(S, S);

  const rarity = (cardData.rarity || 'Common').toLowerCase();
  const foilStyle = cardData.foilStyle || 'Standard';

  // Build image transform object for drawCoverImage
  cardData._imgTransform = {
    zoom: cardData.imgZoom ?? 1.0,
    offsetX: cardData.imgOffsetX ?? 0.0,
    offsetY: cardData.imgOffsetY ?? 0.0,
  };

  // Dimensi LOGIS (bukan piksel fisik) — ctx sudah di-scale
  const W = 600, H = 840;
  if (rarity === 'rare') {
    drawRare(ctx, W, H, cardData, artworkImage, foilStyle);
  } else if (rarity === 'epic') {
    drawEpic(ctx, W, H, cardData, artworkImage, foilStyle);
  } else if (rarity === 'legendary') {
    drawLegendary(ctx, W, H, cardData, artworkImage, foilStyle);
  } else {
    drawCommon(ctx, W, H, cardData, artworkImage, foilStyle);
  }

  // If foil style is Secret Gold, apply gold overlay for extra sparkle wash
  if (foilStyle === 'Secret Gold') {
    applySecretGoldOverlay(ctx, W, H);
  }

  return canvas;
}

