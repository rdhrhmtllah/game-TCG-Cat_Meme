<template>
  <div class="min-h-screen relative overflow-hidden flex" style="background: #050816;">
    <!-- ===== Background bersama (mesh + orbs + partikel deterministik) ===== -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute inset-0" :style="meshStyle"></div>
      <div class="floating-orb floating-orb-purple" style="width: 350px; height: 350px; top: 8%; left: 10%; animation-delay: 0s;"></div>
      <div class="floating-orb floating-orb-blue" style="width: 300px; height: 300px; bottom: 12%; right: 8%; animation-delay: -4s;"></div>
      <div class="floating-orb floating-orb-pink" style="width: 220px; height: 220px; top: 55%; left: 55%; animation-delay: -8s;"></div>
      <span v-for="p in particles" :key="p.id"
        class="absolute rounded-full animate-particle-float"
        :style="{
          width: p.size + 'px', height: p.size + 'px', background: p.color,
          left: p.left + '%', top: p.top + '%', opacity: p.opacity,
          animationDelay: p.delay + 's', animationDuration: p.duration + 's',
        }" />
    </div>

    <!-- ===== Panel branding kiri (desktop) ===== -->
    <div class="hidden md:flex md:w-1/2 lg:w-[55%] relative z-10 flex-col justify-center px-10 lg:px-16 xl:px-24">
      <router-link to="/" class="inline-flex items-center gap-2 mb-10 group w-fit">
        <div class="w-9 h-9 rounded-xl glass-panel flex items-center justify-center brand-logo-glow">
          <span class="text-lg">🐱</span>
        </div>
        <span class="font-display font-bold text-lg brand-title-gradient">MemeCats</span>
      </router-link>

      <!-- Pack 3D mengambang -->
      <div class="relative mb-6" style="height: 300px;">
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-72 h-72 rounded-full blur-3xl animate-energy-pulse"
            style="background: radial-gradient(circle, rgba(245,158,11,0.18), transparent 68%);"></div>
        </div>
        <GachaPack />
      </div>

      <h2 class="font-display font-black text-3xl lg:text-4xl leading-tight mb-3">
        <span class="brand-title-gradient">{{ tagline }}</span>
      </h2>
      <p class="text-secondary text-sm lg:text-base max-w-md mb-6 font-dm-sans">{{ subtagline }}</p>

      <ul class="space-y-2.5">
        <li v-for="f in features" :key="f" class="flex items-center gap-2.5 text-sm text-secondary font-dm-sans">
          <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
            :style="{ background: accentColor + '22', color: accentColor }">✓</span>
          {{ f }}
        </li>
      </ul>

      <!-- Footer panel: rarity + trust, dipisah divider agar rapi & tidak numpuk -->
      <div class="mt-9 pt-6 border-t border-white/[0.07]">
        <div class="flex gap-2 mb-4">
          <span v-for="r in ['common','rare','epic','legendary']" :key="r"
            class="rarity-badge text-[9px]" :class="'rarity-' + r">{{ r }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted font-dm-sans">
          <span class="flex items-center gap-1.5"><span class="text-sm">✨</span> 100% gratis</span>
          <span class="flex items-center gap-1.5"><span class="text-sm">🌐</span> Main di browser</span>
          <span class="flex items-center gap-1.5"><span class="text-sm">🏆</span> Leaderboard global</span>
        </div>
      </div>
    </div>

    <!-- ===== Panel form kanan ===== -->
    <div class="w-full md:w-1/2 lg:w-[45%] relative z-10 flex items-center justify-center px-4 py-10">
      <div class="brand-card w-full max-w-sm animate-scale-in relative">
        <div class="glass-panel-strong p-8 relative overflow-hidden rounded-2xl">
          <div class="brand-card-glow"></div>

          <!-- Header form (emblem + judul; di mobile inilah branding-nya) -->
          <div class="text-center mb-8 relative z-10">
            <div class="w-16 h-16 mx-auto rounded-2xl glass-panel flex items-center justify-center mb-4 animate-float brand-logo-glow">
              <span class="text-3xl">🐱</span>
            </div>
            <h1 class="text-2xl font-display font-bold brand-title-gradient">{{ title }}</h1>
            <p class="text-muted text-sm mt-2 font-dm-sans">{{ subtitle }}</p>
          </div>

          <div class="relative z-10">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import GachaPack from '@/components/GachaPack.vue';

const props = defineProps({
  title: { type: String, default: 'MemeCats' },
  subtitle: { type: String, default: '' },
  tagline: { type: String, default: 'Koleksi Kucing Meme Legendaris' },
  subtagline: { type: String, default: 'Buka pack, kumpulkan kartu foil premium, dan panen koin dari koleksimu.' },
  features: { type: Array, default: () => ['Pack opening sinematik 3D', 'Kartu foil holografik premium', 'Marketplace antar pemain'] },
  accent: { type: String, default: 'purple' }, // 'purple' | 'gold'
});

const accentColor = props.accent === 'gold' ? '#F59E0B' : '#A855F7';

// Mesh gradient sesuai aksen (biru untuk login, amber untuk register)
const meshStyle = {
  background: props.accent === 'gold'
    ? `radial-gradient(ellipse 60% 45% at 40% 20%, rgba(124,58,237,0.13) 0%, transparent 55%),
       radial-gradient(ellipse 50% 40% at 72% 78%, rgba(245,158,11,0.09) 0%, transparent 45%),
       radial-gradient(ellipse 40% 30% at 20% 70%, rgba(248,140,212,0.06) 0%, transparent 50%)`
    : `radial-gradient(ellipse 60% 45% at 40% 20%, rgba(124,58,237,0.14) 0%, transparent 55%),
       radial-gradient(ellipse 50% 40% at 70% 80%, rgba(56,189,248,0.08) 0%, transparent 45%),
       radial-gradient(ellipse 40% 30% at 20% 70%, rgba(248,140,212,0.06) 0%, transparent 50%)`,
};

// Partikel deterministik (dihitung sekali, tidak re-random tiap render)
const palette = props.accent === 'gold'
  ? ['#7C3AED', '#F59E0B', '#A855F7', '#F88CD4']
  : ['#7C3AED', '#38BDF8', '#F88CD4', '#A855F7'];
function seeded(n) { const x = Math.sin(n * 999.7) * 43758.5453; return x - Math.floor(x); }
const particles = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  size: +(1 + seeded(i + 1) * 2).toFixed(2),
  color: palette[i % palette.length],
  left: +(seeded(i + 11) * 100).toFixed(2),
  top: +(seeded(i + 23) * 100).toFixed(2),
  opacity: +(0.2 + seeded(i + 37) * 0.15).toFixed(2),
  delay: +(i * 0.6).toFixed(2),
  duration: +(5 + seeded(i + 51) * 4).toFixed(2),
}));
</script>
