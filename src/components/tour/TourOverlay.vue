<template>
  <Teleport to="body">
    <div v-if="tour.active.value && step" class="tour-root" aria-live="polite">
      <!-- Blocker: gelap penuh utk langkah tengah; transparan penutup klik utk info.
           Langkah action tidak diblok agar user bisa berinteraksi. -->
      <div v-if="showBlocker" class="tour-blocker" :style="{ background: step.center ? 'rgba(4,8,22,0.82)' : 'transparent' }"></div>

      <!-- Spotlight hole (box-shadow membuat dim + lubang) -->
      <div v-if="holeRect && !step.center" class="tour-hole" :class="{ 'is-action': isAction }" :style="holeStyle"></div>

      <!-- Hint ringkas utk langkah yg butuh layar penuh (gacha/detail/showcase) -->
      <div v-if="compact" class="tour-hint" :style="hintStyle">
        <span class="tour-hint-dot"></span>
        <div class="tour-hint-text">
          <p class="tour-hint-title">{{ step.title }}</p>
          <p class="tour-hint-body">👉 {{ step.actionHint }}</p>
        </div>
        <div class="tour-hint-meta">
          <span>{{ tour.progress.value }}/{{ tour.total }}</span>
          <button class="tour-skip" @click="tour.skip()">Lewati</button>
        </div>
      </div>

      <!-- Tooltip utama -->
      <div v-else class="tour-tip" :class="{ 'tour-tip-center': step.center }" :style="tipStyle">
        <div class="tour-tip-head">
          <span class="tour-step-badge">Langkah {{ tour.progress.value }} / {{ tour.total }}</span>
          <button class="tour-skip" @click="tour.skip()">Lewati ✕</button>
        </div>
        <h3 class="tour-tip-title">{{ step.title }}</h3>
        <p class="tour-tip-body">{{ step.body }}</p>

        <p v-if="isAction && step.actionHint" class="tour-action-hint">👉 {{ step.actionHint }}</p>

        <!-- progress dots -->
        <div class="tour-dots">
          <span v-for="i in tour.total" :key="i" class="tour-dot" :class="{ on: i === tour.progress.value }"></span>
        </div>

        <div class="tour-tip-actions">
          <button v-if="tour.stepIndex.value > 0" class="tour-btn-ghost" @click="tour.prev()">Kembali</button>
          <span class="flex-1"></span>
          <button v-if="!isAction" class="tour-btn-primary" @click="tour.next()">
            {{ step.finishLabel || 'Lanjut' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useTour } from '@/composables/useTour.js';

const tour = useTour();

const step = computed(() => tour.current.value);
const isAction = computed(() => !!step.value?.action);
const compact = computed(() => isAction.value && step.value?.minimizeOnAction);
// Blokir interaksi hanya untuk langkah tengah & info (bukan action)
const showBlocker = computed(() => step.value && (step.value.center || !isAction.value));

// ── Lacak posisi target via rAF selama tour aktif ──────────────
const holeRect = ref(null);
let rafId = null;
const PAD = 8; // ruang napas di sekeliling target

function tick() {
  const s = step.value;
  if (!s || s.center || !s.target) {
    holeRect.value = null;
  } else {
    const el = tour.getTargetEl(s.target);
    if (el) {
      const r = el.getBoundingClientRect();
      holeRect.value = { top: r.top, left: r.left, width: r.width, height: r.height };
    } else {
      holeRect.value = null;
    }
  }
  rafId = requestAnimationFrame(tick);
}

watch(() => tour.active.value, (on) => {
  if (on && rafId == null) { rafId = requestAnimationFrame(tick); }
  else if (!on && rafId != null) { cancelAnimationFrame(rafId); rafId = null; holeRect.value = null; }
}, { immediate: true });

onBeforeUnmount(() => { if (rafId != null) cancelAnimationFrame(rafId); });

// ── Style lubang spotlight ─────────────────────────────────────
const holeStyle = computed(() => {
  const r = holeRect.value;
  if (!r) return { display: 'none' };
  return {
    top: (r.top - PAD) + 'px',
    left: (r.left - PAD) + 'px',
    width: (r.width + PAD * 2) + 'px',
    height: (r.height + PAD * 2) + 'px',
  };
});

// ── Penempatan tooltip: tengah, atau berlawanan arah dgn target ─
const tipStyle = computed(() => {
  if (step.value?.center || !holeRect.value) return {};
  const r = holeRect.value;
  const vh = window.innerHeight;
  const targetMid = r.top + r.height / 2;
  if (targetMid < vh / 2) {
    // target di atas → tooltip di bawahnya
    return { top: Math.min(r.top + r.height + 18, vh - 40) + 'px' };
  }
  // target di bawah → tooltip di atasnya (anchor dari bawah)
  return { bottom: Math.min(vh - r.top + 18, vh - 40) + 'px' };
});

// ── Penempatan hint ringkas: jangan menutupi target/kontrol ────
// - Ada target terlihat → tempel tepat di ATAS/BAWAH target (bukan menimpanya).
// - Tanpa target (fase gacha fullscreen: reveal dll) → taruh di ATAS layar,
//   supaya tak menutupi kontrol reveal (Buka/Next Card) yang ada di bawah.
const hintStyle = computed(() => {
  const r = holeRect.value;
  if (!r) return { top: '18px', bottom: 'auto' };
  const vh = window.innerHeight;
  const targetMid = r.top + r.height / 2;
  if (targetMid > vh / 2) {
    // target di paruh bawah → hint di atas target
    return { bottom: Math.max(16, vh - r.top + 14) + 'px', top: 'auto' };
  }
  // target di paruh atas → hint di bawah target
  return { top: Math.min(vh - 90, r.top + r.height + 14) + 'px', bottom: 'auto' };
});
</script>

<style scoped>
.tour-root { position: fixed; inset: 0; z-index: 9999; pointer-events: none; }
.tour-blocker { position: fixed; inset: 0; pointer-events: auto; }

/* Lubang spotlight: box-shadow raksasa = dim sekeliling + lubang terang */
.tour-hole {
  position: fixed;
  border-radius: 16px;
  box-shadow: 0 0 0 9999px rgba(4, 8, 22, 0.78);
  border: 2px solid rgba(192, 132, 252, 0.9);
  pointer-events: none; /* klik tembus ke elemen target */
  transition: top .25s ease, left .25s ease, width .25s ease, height .25s ease;
  animation: tour-pulse 1.8s ease-in-out infinite;
}
.tour-hole.is-action { border-color: rgba(252, 211, 77, 0.95); }
@keyframes tour-pulse {
  0%, 100% { box-shadow: 0 0 0 9999px rgba(4,8,22,0.78), 0 0 0 2px rgba(192,132,252,0.5); }
  50%      { box-shadow: 0 0 0 9999px rgba(4,8,22,0.78), 0 0 26px 4px rgba(192,132,252,0.55); }
}

/* Tooltip utama */
.tour-tip {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 380px;
  pointer-events: auto;
  background: linear-gradient(160deg, rgba(20, 26, 52, 0.98), rgba(12, 16, 36, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 18px 18px 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55), 0 0 40px rgba(124, 58, 237, 0.15);
  animation: tour-tip-in .35s cubic-bezier(0.22, 1, 0.36, 1);
}
.tour-tip-center { top: 50%; transform: translate(-50%, -50%); }
@keyframes tour-tip-in { from { opacity: 0; transform: translateX(-50%) translateY(8px); } }
.tour-tip-center { animation: none; }

.tour-tip-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.tour-step-badge {
  font-family: 'Outfit', sans-serif; font-size: 0.66rem; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(196, 132, 252, 0.95);
  background: rgba(124, 58, 237, 0.14); border: 1px solid rgba(124, 58, 237, 0.24);
  padding: 0.25rem 0.6rem; border-radius: 9999px;
}
.tour-tip-title { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.1rem; color: #fff; margin-bottom: 6px; }
.tour-tip-body { font-size: 0.86rem; line-height: 1.55; color: rgba(226, 232, 240, 0.85); }
.tour-action-hint {
  margin-top: 10px; font-size: 0.8rem; font-weight: 600; color: #FCD34D;
  background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px; padding: 8px 10px;
}

.tour-dots { display: flex; gap: 5px; justify-content: center; margin: 14px 0 12px; }
.tour-dot { width: 6px; height: 6px; border-radius: 9999px; background: rgba(255,255,255,0.18); transition: all .3s; }
.tour-dot.on { width: 18px; background: linear-gradient(90deg, #7C3AED, #C084FC); }

.tour-tip-actions { display: flex; align-items: center; gap: 10px; }
.flex-1 { flex: 1; }
.tour-btn-primary {
  font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.88rem; color: #fff;
  background: linear-gradient(135deg, #7C3AED, #A855F7); border: none;
  padding: 0.6rem 1.3rem; border-radius: 12px; cursor: pointer;
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35); transition: filter .2s, transform .1s;
}
.tour-btn-primary:hover { filter: brightness(1.1); }
.tour-btn-primary:active { transform: scale(0.97); }
.tour-btn-ghost {
  font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 0.84rem;
  color: rgba(226, 232, 240, 0.7); background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12); padding: 0.55rem 1rem; border-radius: 12px; cursor: pointer;
}
.tour-btn-ghost:hover { color: #fff; border-color: rgba(255,255,255,0.25); }
.tour-skip {
  font-family: 'Outfit', sans-serif; font-size: 0.74rem; color: rgba(148, 163, 184, 0.8);
  background: transparent; border: none; cursor: pointer;
}
.tour-skip:hover { color: rgba(226, 232, 240, 0.95); }

/* Hint ringkas (langkah layar-penuh) */
.tour-hint {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  width: calc(100% - 28px); max-width: 440px; pointer-events: auto;
  display: flex; align-items: center; gap: 12px;
  background: linear-gradient(160deg, rgba(20, 26, 52, 0.97), rgba(12, 16, 36, 0.97));
  border: 1px solid rgba(252, 211, 77, 0.35);
  border-radius: 16px; padding: 12px 14px;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.12);
  animation: tour-tip-in .3s ease;
}
.tour-hint-dot {
  width: 10px; height: 10px; border-radius: 9999px; flex-shrink: 0;
  background: #FCD34D; box-shadow: 0 0 12px #FCD34D; animation: tour-pulse-dot 1.2s ease-in-out infinite;
}
@keyframes tour-pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.tour-hint-text { flex: 1; min-width: 0; }
.tour-hint-title { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.86rem; color: #fff; }
.tour-hint-body { font-size: 0.78rem; color: #FCD34D; }
.tour-hint-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.tour-hint-meta > span { font-family: 'Outfit', sans-serif; font-size: 0.72rem; color: rgba(148,163,184,0.9); }

@media (max-width: 640px) {
  .tour-hint { bottom: 96px; } /* di atas bottom-nav mobile */
}
</style>
