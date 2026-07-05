<template>
  <Teleport to="body">
    <Transition name="fusion-fade">
      <div v-if="active" class="fusion-root" :class="'phase-' + phase">
        <div class="fusion-backdrop"></div>

        <!-- Inti energi -->
        <div class="fusion-core"></div>
        <div class="fusion-ring"></div>

        <!-- Percikan energi -->
        <span v-for="i in 20" :key="'sp'+i" class="fusion-spark" :style="sparkStyle(i)"></span>

        <!-- Kilatan transisi -->
        <div class="fusion-flash"></div>

        <!-- Fase kumpul & fusi: 3 kartu identik menyatu -->
        <div v-if="phase !== 'reveal' && inputCard" class="fusion-inputs">
          <div v-for="n in 3" :key="'in'+n" class="fusion-input-card" :class="'fi-' + n">
            <Card2D v-bind="cardProps(inputCard)" :owned="true" />
          </div>
        </div>

        <!-- Status -->
        <p v-if="phase !== 'reveal'" class="fusion-status">
          <span class="fusion-status-dot"></span> Mensintesis kartu…
        </p>

        <!-- Fase reveal: kartu hasil -->
        <div v-if="phase === 'reveal' && result" class="fusion-reveal">
          <p class="fusion-title">⚗️ Sintesis Berhasil!</p>
          <div class="fusion-result-card" :class="'glow-' + result.resultCard.rarity.toLowerCase()">
            <Card2D v-bind="cardProps(result.resultCard)" :owned="true" />
          </div>
          <p class="fusion-flow">
            {{ inputCard?.name }} <span class="text-muted">×3</span>
            <span class="fusion-arrow">➔</span>
            <span class="text-white font-bold">{{ result.resultCard.name }}</span>
          </p>
          <span class="rarity-badge fusion-rarity" :class="'rarity-' + result.resultCard.rarity.toLowerCase()">
            {{ result.resultCard.rarity }}
          </span>
          <p v-if="result.resultCard.isNew" class="fusion-new">✨ KARTU BARU DITEMUKAN!</p>
          <p class="fusion-bonus">+{{ result.bonusCoins }} bonus koin 🪙</p>
          <button class="fusion-close" @click="$emit('close')">Selesai</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import Card2D from '@/components/Card2D.vue';

defineProps({
  active: { type: Boolean, default: false },
  phase: { type: String, default: 'gather' }, // gather | fuse | reveal
  inputCard: { type: Object, default: null },
  result: { type: Object, default: null },     // { resultCard, bonusCoins }
});
defineEmits(['close']);

function cardProps(c) {
  if (!c) return {};
  return {
    imageUrl: c.imageUrl, rarity: c.rarity, name: c.name, description: c.description,
    hypeScore: c.hypeScore, likesPerSec: c.likesPerSec, element: c.element,
    foilStyle: c.foilStyle, imgZoom: c.imgZoom, imgOffsetX: c.imgOffsetX, imgOffsetY: c.imgOffsetY,
  };
}

const SPARK_COLORS = ['#FCD34D', '#C084FC', '#F88CD4', '#7DD3FC'];
function sparkStyle(i) {
  const ang = (i / 20) * Math.PI * 2;
  const dist = 150 + (i % 4) * 55;
  return {
    '--tx': Math.cos(ang) * dist + 'px',
    '--ty': Math.sin(ang) * dist + 'px',
    background: SPARK_COLORS[i % SPARK_COLORS.length],
    animationDelay: (i % 6) * 0.05 + 's',
  };
}
</script>

<style scoped>
.fusion-root { position: fixed; inset: 0; z-index: 9998; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.fusion-backdrop {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 70% 55% at 50% 45%, rgba(40,20,70,0.85), rgba(4,6,15,0.97) 70%), #04060F;
  backdrop-filter: blur(4px);
}
.fusion-fade-enter-active, .fusion-fade-leave-active { transition: opacity .4s ease; }
.fusion-fade-enter-from, .fusion-fade-leave-to { opacity: 0; }

/* ── Inti energi ── */
.fusion-core {
  position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; margin: -20px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, #C084FC 42%, rgba(124,58,237,0.4) 70%, transparent 78%);
  opacity: 0; transition: width .9s ease, height .9s ease, margin .9s ease, opacity .6s ease;
}
.phase-fuse .fusion-core {
  width: 240px; height: 240px; margin: -120px; opacity: 1;
  animation: core-throb .5s ease-in-out infinite alternate;
}
.phase-reveal .fusion-core { opacity: 0; }
@keyframes core-throb { from { filter: brightness(1); } to { filter: brightness(1.5); transform: scale(1.06); } }

.fusion-ring {
  position: absolute; top: 50%; left: 50%; width: 180px; height: 180px; margin: -90px;
  border-radius: 50%; border: 2px solid rgba(192,132,252,0.5); opacity: 0;
}
.phase-fuse .fusion-ring { opacity: 1; animation: ring-spin 1.2s linear infinite, ring-grow 1.2s ease-out forwards; }
@keyframes ring-spin { to { transform: rotate(360deg); } }
@keyframes ring-grow { from { transform: scale(0.4); opacity: .8; } to { transform: scale(1.4); opacity: 0; } }

/* ── Kartu input (3 identik) ── */
.fusion-inputs { position: absolute; inset: 0; }
.fusion-input-card {
  position: absolute; top: 50%; left: 50%; width: 132px; margin-left: -66px; margin-top: -92px;
  filter: drop-shadow(0 10px 30px rgba(0,0,0,0.6));
  transition: transform 1.25s cubic-bezier(0.6, 0, 0.35, 1), opacity 1.1s ease;
}
.fi-1 { transform: translate(-180px, 14px) rotate(-15deg); }
.fi-2 { transform: translate(180px, 14px) rotate(15deg); }
.fi-3 { transform: translate(0, -160px) rotate(0deg); }
.phase-gather .fusion-input-card { animation: fi-appear .5s ease both; }
@keyframes fi-appear { from { opacity: 0; filter: blur(6px); } to { opacity: 1; } }
/* Konvergen ke inti */
.phase-fuse .fi-1, .phase-fuse .fi-2, .phase-fuse .fi-3 {
  transform: translate(0, 0) scale(0.12) rotate(400deg); opacity: 0;
}

/* ── Percikan ── */
.fusion-spark {
  position: absolute; top: 50%; left: 50%; width: 7px; height: 7px; margin: -3.5px; border-radius: 50%;
  opacity: 0; box-shadow: 0 0 8px currentColor;
}
.phase-fuse .fusion-spark, .phase-reveal .fusion-spark {
  animation: spark-out .9s ease-out forwards;
}
@keyframes spark-out {
  0% { opacity: 0; transform: translate(0,0) scale(0.4); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(1); }
}

/* ── Kilatan ── */
.fusion-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
.phase-reveal .fusion-flash { animation: fusion-flash .55s ease-out; }
@keyframes fusion-flash { 0% { opacity: 0; } 12% { opacity: .92; } 100% { opacity: 0; } }

/* ── Status ── */
.fusion-status {
  position: absolute; bottom: 12%; left: 50%; transform: translateX(-50%);
  font-family: 'Outfit', sans-serif; font-size: .82rem; color: rgba(226,232,240,0.85);
  display: flex; align-items: center; gap: 8px; letter-spacing: .02em;
}
.fusion-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #C084FC; box-shadow: 0 0 10px #C084FC; animation: dot-blink 1s ease-in-out infinite; }
@keyframes dot-blink { 0%,100%{opacity:1} 50%{opacity:.3} }

/* ── Reveal ── */
.fusion-reveal { position: relative; z-index: 2; text-align: center; display: flex; flex-direction: column; align-items: center; padding: 0 20px; animation: reveal-in .5s cubic-bezier(0.22,1,0.36,1) both; }
@keyframes reveal-in { from { opacity: 0; transform: translateY(14px); } }
.fusion-title { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.15rem; color: #FCD34D; margin-bottom: 14px; text-shadow: 0 0 20px rgba(245,158,11,0.4); }
.fusion-result-card {
  width: 210px; max-width: 62vw; border-radius: 16px;
  animation: result-pop .6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes result-pop { 0% { opacity: 0; transform: scale(0.3) rotate(-8deg); } 100% { opacity: 1; transform: scale(1); } }
.glow-common    { filter: drop-shadow(0 0 26px rgba(148,163,184,0.5)); }
.glow-rare      { filter: drop-shadow(0 0 30px rgba(56,189,248,0.55)); }
.glow-epic      { filter: drop-shadow(0 0 34px rgba(168,85,247,0.6)); }
.glow-legendary { filter: drop-shadow(0 0 40px rgba(245,158,11,0.7)); }
.fusion-flow { font-family: 'Outfit', sans-serif; font-size: .82rem; color: rgba(226,232,240,0.8); margin-top: 16px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; }
.fusion-arrow { color: #C084FC; }
.fusion-rarity { margin-top: 10px; }
.fusion-new { font-family: 'Outfit', sans-serif; font-size: .78rem; font-weight: 700; color: #FCD34D; margin-top: 8px; animation: dot-blink 1.1s ease-in-out infinite; }
.fusion-bonus { font-family: 'Outfit', sans-serif; font-size: .9rem; font-weight: 700; color: #34D399; margin-top: 8px; }
.fusion-close {
  margin-top: 20px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: .9rem; color: #fff;
  background: linear-gradient(135deg, #7C3AED, #A855F7); border: none; padding: .7rem 2rem; border-radius: 14px;
  cursor: pointer; box-shadow: 0 8px 24px rgba(124,58,237,0.4); transition: filter .2s, transform .1s;
}
.fusion-close:hover { filter: brightness(1.1); }
.fusion-close:active { transform: scale(0.97); }
</style>
