<template>
  <div class="landing-root relative overflow-x-hidden" style="background: #050816;">
    <!-- ===== Global background ===== -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute inset-0" style="background:
        radial-gradient(ellipse 60% 45% at 30% 12%, rgba(124,58,237,0.16) 0%, transparent 55%),
        radial-gradient(ellipse 55% 45% at 80% 40%, rgba(245,158,11,0.06) 0%, transparent 50%),
        radial-gradient(ellipse 50% 40% at 15% 75%, rgba(56,189,248,0.07) 0%, transparent 50%);"></div>
      <div class="floating-orb floating-orb-purple" style="width: 420px; height: 420px; top: -5%; left: 5%;"></div>
      <div class="floating-orb floating-orb-blue" style="width: 320px; height: 320px; top: 40%; right: -5%; animation-delay: -5s;"></div>
      <span v-for="p in particles" :key="p.id" class="absolute rounded-full animate-particle-float"
        :style="{ width: p.size+'px', height: p.size+'px', background: p.color, left: p.left+'%', top: p.top+'%', opacity: p.opacity, animationDelay: p.delay+'s', animationDuration: p.duration+'s' }" />
    </div>

    <!-- ===== Top Nav ===== -->
    <header class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      :class="scrolled ? 'landing-nav-scrolled' : ''">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="#top" class="flex items-center gap-2 group">
          <div class="w-9 h-9 rounded-xl glass-panel flex items-center justify-center brand-logo-glow">
            <span class="text-lg">🐱</span>
          </div>
          <span class="font-display font-bold text-lg brand-title-gradient">MemeCats</span>
        </a>
        <div class="flex items-center gap-2 sm:gap-3">
          <router-link to="/login" class="btn-secondary text-sm px-4 py-2 font-display">Login</router-link>
          <router-link to="/register" class="btn-primary text-sm px-4 sm:px-5 py-2 font-display font-bold">Daftar Gratis</router-link>
        </div>
      </div>
    </header>

    <!-- ===== HERO ===== -->
    <section id="top" class="relative z-10 min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <!-- Kiri: headline -->
        <div class="text-center lg:text-left order-2 lg:order-1 animate-slide-up">
          <span class="inline-flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full text-xs font-display text-legendary mb-5">
            <span class="w-1.5 h-1.5 rounded-full bg-legendary animate-pulse"></span>
            Web 3D TCG · Gratis Dimainkan
          </span>
          <h1 class="font-display font-black leading-[1.05] mb-5" style="font-size: clamp(2.4rem, 6vw, 4.2rem);">
            <span class="brand-title-gradient">Koleksi Kucing Meme</span><br />
            <span class="text-white">Paling Legendaris</span>
          </h1>
          <p class="text-secondary text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-6 font-dm-sans">
            Buka booster pack sinematik, kumpulkan kartu foil holografik premium, naikkan level, tuntaskan quest harian, dan panjat leaderboard. Pamerkan koleksi di showcase untuk panen koin pasif & trading di marketplace — semua langsung di browser.
          </p>
          <div class="flex flex-wrap gap-2 justify-center lg:justify-start mb-8">
            <span v-for="pill in heroPills" :key="pill"
              class="glass-panel px-3 py-1.5 rounded-full text-xs font-display text-secondary">{{ pill }}</span>
          </div>
          <div class="flex flex-wrap gap-3 justify-center lg:justify-start mb-10">
            <router-link to="/register" class="btn-primary px-7 py-3.5 font-display font-bold text-base">🎴 Mulai Koleksi</router-link>
            <a href="#cara-main" class="btn-secondary px-7 py-3.5 font-display text-base">Lihat Cara Main</a>
          </div>
          <div class="flex items-center gap-6 justify-center lg:justify-start">
            <div v-for="s in heroStats" :key="s.label">
              <p class="font-display font-black text-2xl" :style="{ color: s.color }">{{ s.value }}</p>
              <p class="text-muted text-xs font-dm-sans">{{ s.label }}</p>
            </div>
          </div>
        </div>

        <!-- Kanan: pack 3D -->
        <div class="order-1 lg:order-2 relative">
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-80 h-80 rounded-full blur-3xl animate-energy-pulse"
              style="background: radial-gradient(circle, rgba(245,158,11,0.2), transparent 66%);"></div>
          </div>
          <div class="relative mx-auto" style="height: 440px; max-width: 380px;">
            <GachaPack />
          </div>
          <p class="text-center text-muted text-xs mt-2 font-dm-sans">👆 Seret untuk memutar pack</p>
        </div>
      </div>

      <!-- Scroll cue -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted animate-bounce-gentle hidden sm:block">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </section>

    <!-- ===== FITUR ===== -->
    <section class="relative z-10 py-20 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <span class="section-eyebrow">Gameplay Inti</span>
          <h2 class="font-display font-black text-3xl sm:text-4xl mb-3"><span class="brand-title-gradient">Semua yang Bikin Nagih</span></h2>
          <p class="text-secondary max-w-xl mx-auto font-dm-sans">Empat pilar gameplay yang saling terhubung jadi satu loop koleksi tanpa akhir.</p>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="(f, i) in features" :key="f.title"
            class="glass-card p-6 text-center animate-fade-in" :style="{ animationDelay: (i*0.08)+'s' }">
            <div class="w-14 h-14 mx-auto rounded-2xl glass-panel flex items-center justify-center text-2xl mb-4"
              :style="{ boxShadow: '0 0 24px ' + f.glow }">{{ f.icon }}</div>
            <h3 class="font-display font-bold text-lg mb-2">{{ f.title }}</h3>
            <p class="text-secondary text-sm font-dm-sans leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== PROGRESSION & REWARDS ===== -->
    <section class="relative z-10 py-20 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <span class="section-eyebrow">Loop Retensi</span>
          <h2 class="font-display font-black text-3xl sm:text-4xl mb-3">Naik Level, <span class="brand-title-gradient">Panen Hadiah</span></h2>
          <p class="text-secondary max-w-xl mx-auto font-dm-sans">Bukan sekadar buka pack. Ada progres, tantangan harian, dan persaingan yang bikin kamu balik tiap hari.</p>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="(p, i) in progression" :key="p.title"
            class="glass-card p-6 animate-fade-in flex items-start gap-4 transition-transform duration-300 hover:-translate-y-1"
            :style="{ animationDelay: (i*0.06)+'s' }">
            <div class="w-12 h-12 flex-shrink-0 rounded-2xl glass-panel flex items-center justify-center text-xl"
              :style="{ boxShadow: '0 0 22px ' + p.glow }">{{ p.icon }}</div>
            <div>
              <h3 class="font-display font-bold text-base mb-1.5">{{ p.title }}</h3>
              <p class="text-secondary text-sm font-dm-sans leading-relaxed">{{ p.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== INTIP DALAMNYA (mockup leaderboard + progres) ===== -->
    <section class="relative z-10 py-20 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <span class="section-eyebrow">Sneak Peek</span>
          <h2 class="font-display font-black text-3xl sm:text-4xl mb-3">Intip Dunia <span class="brand-title-gradient">MemeCats</span></h2>
          <p class="text-secondary max-w-xl mx-auto font-dm-sans">Beginilah rasanya naik peringkat dan level — momen yang bikin tiap tarikan pack terasa berarti.</p>
        </div>

        <div class="grid lg:grid-cols-2 gap-5 max-w-4xl mx-auto">
          <!-- Mock: Leaderboard -->
          <div class="glass-card p-6 sm:p-7">
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-display font-bold text-lg flex items-center gap-2">🏆 Leaderboard</h3>
              <span class="text-xs text-muted font-dm-sans">Top Kolektor Global</span>
            </div>
            <div class="space-y-2.5">
              <div v-for="p in leaderboardMock" :key="p.rank"
                class="flex items-center gap-3 p-2.5 rounded-xl" :class="p.rank === 1 ? 'lb-row-top' : 'glass-panel'">
                <span class="w-7 text-center font-display font-black text-base" :style="{ color: p.color }">{{ p.medal }}</span>
                <div class="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-lg flex-shrink-0">{{ p.avatar }}</div>
                <div class="flex-1 min-w-0">
                  <p class="font-display font-semibold text-sm truncate">{{ p.name }}</p>
                  <p class="text-muted text-[11px] font-dm-sans">Lv {{ p.level }} · {{ p.cards }} kartu</p>
                </div>
                <span class="font-display font-bold text-sm" :style="{ color: p.color }">{{ p.score }}</span>
              </div>
            </div>
          </div>

          <!-- Mock: Progres / Level Up -->
          <div class="glass-card p-6 sm:p-7 flex flex-col">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-display font-bold text-lg flex items-center gap-2">📈 Progres Kamu</h3>
              <span class="rarity-badge text-[9px] rarity-epic animate-pulse">LEVEL UP!</span>
            </div>

            <div class="flex items-center gap-4 mb-6">
              <div class="level-ring flex-shrink-0">
                <span class="text-[10px] text-muted font-display leading-none">LV</span>
                <span class="font-display font-black text-2xl leading-none brand-title-gradient">12</span>
              </div>
              <div class="flex-1">
                <div class="flex justify-between items-baseline text-xs mb-1.5 font-dm-sans">
                  <span class="text-secondary font-semibold">Experience</span>
                  <span class="text-muted">820 / 1000 XP</span>
                </div>
                <div class="xp-track"><div class="xp-fill" style="width: 82%;"></div></div>
                <p class="text-muted text-[11px] mt-2 font-dm-sans">180 XP lagi menuju Level 13</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2.5 mt-auto">
              <div v-for="r in progressRewards" :key="r.label" class="glass-panel p-3 rounded-xl text-center">
                <p class="text-xl leading-none mb-1.5">{{ r.icon }}</p>
                <p class="font-display font-bold text-sm leading-none">{{ r.value }}</p>
                <p class="text-muted text-[10px] font-dm-sans mt-1">{{ r.label }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== RARITY SHOWCASE ===== -->
    <section class="relative z-10 py-20 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <span class="section-eyebrow">Koleksi</span>
          <h2 class="font-display font-black text-3xl sm:text-4xl mb-3">Empat Tingkat <span class="brand-title-gradient">Kelangkaan</span></h2>
          <p class="text-secondary max-w-xl mx-auto font-dm-sans">Dari Common yang playful sampai Legendary bergaya artefak suci — makin langka, makin memukau.</p>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div v-for="card in rarityCards" :key="card.rarity" class="text-center group">
            <div class="rounded-xl overflow-hidden mb-3 transition-transform duration-300 group-hover:-translate-y-2"
              :class="'rarity-glow-' + card.rarity.toLowerCase()">
              <Card2D v-bind="card" :owned="true" />
            </div>
            <span class="rarity-badge text-[10px]" :class="'rarity-' + card.rarity.toLowerCase()">{{ card.rarity }}</span>
            <p class="text-muted text-xs mt-2 font-dm-sans">{{ card.drop }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CARA MAIN ===== -->
    <section id="cara-main" class="relative z-10 py-20 px-4 sm:px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <span class="section-eyebrow">Panduan</span>
          <h2 class="font-display font-black text-3xl sm:text-4xl mb-3">Mulai dalam <span class="brand-title-gradient">3 Langkah</span></h2>
        </div>
        <div class="grid md:grid-cols-3 gap-6 relative">
          <div v-for="(step, i) in steps" :key="step.title" class="relative text-center">
            <div class="w-16 h-16 mx-auto rounded-2xl glass-panel-strong flex items-center justify-center mb-4 relative z-10">
              <span class="font-display font-black text-2xl brand-title-gradient">{{ i + 1 }}</span>
            </div>
            <h3 class="font-display font-bold text-lg mb-2">{{ step.title }}</h3>
            <p class="text-secondary text-sm font-dm-sans leading-relaxed max-w-xs mx-auto">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== STATISTIK ===== -->
    <section class="relative z-10 py-16 px-4 sm:px-6">
      <div class="max-w-4xl mx-auto section-glass p-8 sm:p-10 rounded-2xl">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div v-for="stat in bigStats" :key="stat.label">
            <p class="font-display font-black text-3xl sm:text-4xl mb-1" :style="{ color: stat.color }">{{ stat.value }}</p>
            <p class="text-muted text-xs sm:text-sm font-dm-sans">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== TESTIMONI ===== -->
    <section class="relative z-10 py-20 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <span class="section-eyebrow">Komunitas</span>
          <h2 class="font-display font-black text-3xl sm:text-4xl mb-3">Kata Para <span class="brand-title-gradient">Kolektor</span></h2>
        </div>
        <div class="grid md:grid-cols-3 gap-4">
          <div v-for="t in testimonials" :key="t.name" class="glass-panel p-6 rounded-xl">
            <div class="flex gap-0.5 mb-3 text-legendary">★★★★★</div>
            <p class="text-secondary text-sm leading-relaxed mb-4 font-dm-sans">"{{ t.quote }}"</p>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-lg">{{ t.avatar }}</div>
              <div>
                <p class="font-display font-semibold text-sm">{{ t.name }}</p>
                <p class="text-muted text-xs font-dm-sans">{{ t.tag }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== FAQ ===== -->
    <section class="relative z-10 py-20 px-4 sm:px-6">
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-10">
          <span class="section-eyebrow">Bantuan</span>
          <h2 class="font-display font-black text-3xl sm:text-4xl mb-3">Pertanyaan <span class="brand-title-gradient">Umum</span></h2>
        </div>
        <div class="space-y-3">
          <FaqItem question="Apakah gratis dimainkan?">Ya, 100% gratis. Kamu langsung dapat koin awal saat daftar untuk membuka pack pertamamu, plus bonus login harian dan mini-game.</FaqItem>
          <FaqItem question="Perlu install aplikasi?">Tidak. MemeCats berjalan penuh di browser (desktop & mobile) dengan grafis 3D real-time. Tinggal buka dan main.</FaqItem>
          <FaqItem question="Gimana cara dapat kartu langka?">Buka booster pack lewat Gacha — makin sering, makin besar peluang Epic & Legendary. Kamu juga bisa fusion kartu duplikat atau beli di marketplace.</FaqItem>
          <FaqItem question="Bisa trading dengan pemain lain?">Bisa. Marketplace memungkinkan jual-beli kartu antar pemain dengan koin. Jual duplikatmu atau buru kartu incaran.</FaqItem>
          <FaqItem question="Apa itu yield pasif?">Kartu di showcase menghasilkan "likes" tiap detik yang dikonversi jadi koin. Makin langka & sinergis koleksimu, makin besar panennya saat diklaim.</FaqItem>
          <FaqItem question="Ada sistem level & hadiah harian?">Ada. Tiap aksi memberi XP untuk naik level (dengan bonus koin), plus hadiah login harian, quest harian, dan mini-game seperti spin wheel & coin flip yang bikin kamu balik tiap hari.</FaqItem>
          <FaqItem question="Bisa naik peringkat?">Bisa. Ada leaderboard global tempat kamu bersaing memperebutkan posisi kolektor paling legendaris berdasarkan progres dan koleksimu.</FaqItem>
          <FaqItem question="Apa itu sistem pity?">Jaminan anti-sial: setiap 25 kartu tanpa Epic ke atas, pack berikutnya dijamin memberi minimal kartu Epic. Jadi kerja kerasmu selalu terbayar.</FaqItem>
          <FaqItem question="Daftar pakai email? Perlu verifikasi?">Cukup username, email aktif, dan password. Email tidak perlu verifikasi kode — tapi keaslian domainnya dicek otomatis. Login bisa pakai username atau email.</FaqItem>
        </div>
      </div>
    </section>

    <!-- ===== CTA PENUTUP ===== -->
    <section class="relative z-10 py-20 px-4 sm:px-6">
      <div class="max-w-3xl mx-auto text-center relative">
        <div class="section-glass p-10 sm:p-14 rounded-3xl relative overflow-hidden">
          <div class="brand-card-glow"></div>
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
            <div class="w-72 h-72 rounded-full blur-3xl animate-energy-pulse" style="background: radial-gradient(circle, rgba(124,58,237,0.25), transparent 68%);"></div>
          </div>
          <div class="relative z-10">
            <h2 class="font-display font-black text-3xl sm:text-5xl mb-4"><span class="brand-title-gradient">Siap Jadi Kolektor?</span></h2>
            <p class="text-secondary text-base sm:text-lg mb-8 max-w-lg mx-auto font-dm-sans">Ribuan kucing meme langka menunggu. Pull pertamamu bisa jadi Legendary.</p>
            <router-link to="/register" class="btn-primary px-9 py-4 font-display font-bold text-lg inline-block">🚀 Daftar Sekarang — Gratis</router-link>
            <p class="text-muted text-sm mt-5">Sudah punya akun? <router-link to="/login" class="text-accent hover:text-accent-soft font-display font-semibold">Login di sini</router-link></p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== FOOTER ===== -->
    <footer class="relative z-10 border-t border-white/5 py-10 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg glass-panel flex items-center justify-center"><span>🐱</span></div>
          <div>
            <p class="font-display font-bold brand-title-gradient leading-none">MemeCats</p>
            <p class="text-muted text-[11px] font-dm-sans">The Viral Collection</p>
          </div>
        </div>
        <p class="text-muted text-xs font-dm-sans">© 2026 MemeCats. Web 3D TCG.</p>
        <div class="flex gap-4 text-sm font-display">
          <router-link to="/login" class="text-secondary hover:text-accent transition-colors">Login</router-link>
          <router-link to="/register" class="text-secondary hover:text-accent transition-colors">Daftar</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import GachaPack from '@/components/GachaPack.vue';
import Card2D from '@/components/Card2D.vue';
import FaqItem from '@/components/landing/FaqItem.vue';

// ── Header transparan → frosted saat scroll ──
const scrolled = ref(false);
function onScroll() { scrolled.value = window.scrollY > 24; }

// ── Statistik: coba ambil jumlah kartu nyata (fallback statis) ──
const cardCount = ref(20);
const heroStats = ref([
  { value: '20+', label: 'Kartu Unik', color: '#C084FC' },
  { value: '4', label: 'Tingkat Rarity', color: '#FCD34D' },
  { value: '7', label: 'Elemen', color: '#7DD3FC' },
]);
const bigStats = ref([
  { value: '20+', label: 'Kartu untuk dikoleksi', color: '#C084FC' },
  { value: '4', label: 'Tingkat kelangkaan', color: '#FCD34D' },
  { value: '2', label: 'Mini-game harian', color: '#F472B6' },
  { value: '∞', label: 'Level & progres', color: '#7DD3FC' },
]);

// Pil fitur ringkas di hero
const heroPills = ['🏆 Leaderboard', '📈 Level & XP', '📅 Login Harian', '🎯 Quest', '🎡 Mini-Games', '🔮 Fusion'];

// Section progression & reward (loop retensi)
const progression = [
  { icon: '📈', title: 'Level & XP', desc: 'Tiap aksi memberi XP. Naik level untuk bonus koin dan status kolektor sejati.', glow: 'rgba(124,58,237,0.3)' },
  { icon: '📅', title: 'Login Harian', desc: 'Klaim hadiah tiap hari — makin panjang streak, makin besar koin yang kamu terima.', glow: 'rgba(56,189,248,0.3)' },
  { icon: '🎯', title: 'Quest Harian', desc: 'Selesaikan misi harian untuk koin ekstra dan progres koleksi yang lebih cepat.', glow: 'rgba(16,185,129,0.3)' },
  { icon: '🏆', title: 'Leaderboard Global', desc: 'Bersaing di papan peringkat — buktikan koleksimu paling legendaris di antara semua pemain.', glow: 'rgba(245,158,11,0.3)' },
  { icon: '🎡', title: 'Mini-Games', desc: 'Spin wheel & coin flip untuk peluang koin dan kejutan seru setiap hari.', glow: 'rgba(236,72,153,0.3)' },
  { icon: '🔮', title: 'Fusion & Pity', desc: 'Gabungkan kartu duplikat jadi rarity lebih tinggi. Sistem pity menjamin Epic+ tiap 25 tarikan.', glow: 'rgba(168,85,247,0.3)' },
];

// Mockup preview (data statis untuk showcase, bukan data live)
const leaderboardMock = [
  { rank: 1, medal: '🥇', avatar: '😻', name: 'catlord_92',  level: 24, cards: 118, score: '48.2K', color: '#FCD34D' },
  { rank: 2, medal: '🥈', avatar: '😼', name: 'meowster',    level: 21, cards: 103, score: '41.7K', color: '#CBD5E1' },
  { rank: 3, medal: '🥉', avatar: '🐈', name: 'jiji_trades', level: 19, cards: 91,  score: '37.0K', color: '#D8A47F' },
  { rank: 4, medal: '#4', avatar: '🐱', name: 'nyan_king',   level: 18, cards: 84,  score: '33.5K', color: '#94A3B8' },
];
const progressRewards = [
  { icon: '🪙', value: '+250', label: 'Bonus koin' },
  { icon: '🔥', value: '7 hari', label: 'Streak login' },
  { icon: '🎯', value: '3/3', label: 'Quest hari ini' },
];

const features = [
  { icon: '🎴', title: 'Gacha Sinematik', desc: 'Buka booster pack foil 3D — sobek, kilau, dan reveal kartu dengan efek dramatis.', glow: 'rgba(245,158,11,0.3)' },
  { icon: '💎', title: 'Kartu Foil Premium', desc: 'Setiap kartu punya frame holografik, shader iridescent, dan tilt 3D yang bereaksi ke gerakanmu.', glow: 'rgba(168,85,247,0.3)' },
  { icon: '🛒', title: 'Marketplace', desc: 'Jual kartu duplikat & buru kartu incaran lewat trading antar pemain.', glow: 'rgba(56,189,248,0.3)' },
  { icon: '⚡', title: 'Idle Economy', desc: 'Showcase kartumu menghasilkan koin pasif tiap detik — makin langka, makin cuan.', glow: 'rgba(16,185,129,0.3)' },
];

const rarityCards = [
  { rarity: 'Common', name: 'Grumpy Bapak', description: 'Kucing meme sehari-hari.', hypeScore: 50, likesPerSec: 0.8, element: 'Normal', foilStyle: 'Standard', drop: '≈70% peluang' },
  { rarity: 'Rare', name: 'Thumbs Up Cat', description: 'Jempol untuk semua.', hypeScore: 200, likesPerSec: 2.5, element: 'Water', foilStyle: 'Holo', drop: '≈20% peluang' },
  { rarity: 'Epic', name: 'Cosmic Whiskers', description: 'Kumis dari galaksi.', hypeScore: 400, likesPerSec: 6.5, element: 'Cosmic', foilStyle: 'Full Art ex', drop: '≈8% peluang' },
  { rarity: 'Legendary', name: 'Nyan Dragon Rex', description: 'Penguasa timeline.', hypeScore: 800, likesPerSec: 15, element: 'Fire', foilStyle: 'Secret Gold', drop: '≈2% peluang' },
];

const steps = [
  { title: 'Daftar & Dapat Koin', desc: 'Buat akun gratis dalam hitungan detik dan langsung terima koin awal untuk pack pertamamu.' },
  { title: 'Buka Pack & Koleksi', desc: 'Sobek booster pack, reveal kartu, dan lengkapi Card Dex-mu dari Common sampai Legendary.' },
  { title: 'Showcase & Trading', desc: 'Pajang kartu terbaik untuk panen koin pasif, lalu trading di marketplace untuk melengkapi koleksi.' },
];

const testimonials = [
  { avatar: '😼', name: 'catlord_92', tag: 'Pull pertama Legendary!', quote: 'Baru daftar langsung dapat Nyan Dragon dari pack pertama. Efek reveal-nya bikin merinding, seriusan.' },
  { avatar: '🐈', name: 'meowster', tag: '5 Legendary di showcase', quote: 'Idle economy-nya bikin nagih. Tiap bangun tidur klaim koin, buka pack lagi. Loop-nya jahat banget.' },
  { avatar: '😻', name: 'jiji_trades', tag: 'Marketplace addict', quote: 'Trading di market seru — jual duplikat, kumpulin koin, buru kartu Epic incaran. Grafik kartunya premium abis.' },
];

// Ambil jumlah kartu nyata bila API tersedia (opsional, tidak blocking)
async function fetchStats() {
  try {
    const res = await fetch('/api/master-cards');
    if (!res.ok) return;
    const data = await res.json();
    const n = data.cards?.length;
    if (n && n > 0) {
      cardCount.value = n;
      const label = `${n}+`;
      heroStats.value[0].value = label;
      bigStats.value[0].value = label;
    }
  } catch { /* fallback statis */ }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  fetchStats();
});
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));

// Partikel deterministik
function seeded(n) { const x = Math.sin(n * 999.7) * 43758.5453; return x - Math.floor(x); }
const palette = ['#7C3AED', '#38BDF8', '#F88CD4', '#FCD34D'];
const particles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  size: +(1 + seeded(i + 1) * 2.5).toFixed(2),
  color: palette[i % palette.length],
  left: +(seeded(i + 11) * 100).toFixed(2),
  top: +(seeded(i + 23) * 100).toFixed(2),
  opacity: +(0.15 + seeded(i + 37) * 0.2).toFixed(2),
  delay: +(i * 0.5).toFixed(2),
  duration: +(6 + seeded(i + 51) * 5).toFixed(2),
}));
</script>

<style scoped>
.landing-nav-scrolled {
  background: rgba(10, 15, 36, 0.8);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* Eyebrow konsisten di tiap section header */
.section-eyebrow {
  display: inline-block;
  margin-bottom: 0.85rem;
  padding: 0.3rem 0.85rem;
  border-radius: 9999px;
  font-family: 'Outfit', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(196, 132, 252, 0.95);
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.22);
}

/* Baris leaderboard peringkat 1 — highlight emas */
.lb-row-top {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.14), rgba(245, 158, 11, 0.04));
  border: 1px solid rgba(245, 158, 11, 0.3);
  box-shadow: 0 0 22px rgba(245, 158, 11, 0.12);
}

/* Cincin level pada kartu progres */
.level-ring {
  width: 72px;
  height: 72px;
  border-radius: 9999px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: radial-gradient(circle at 50% 40%, rgba(124, 58, 237, 0.22), rgba(10, 15, 36, 0.6));
  border: 2px solid rgba(168, 85, 247, 0.45);
  box-shadow: 0 0 24px rgba(124, 58, 237, 0.28), inset 0 0 12px rgba(124, 58, 237, 0.15);
}

/* XP progress bar */
.xp-track {
  height: 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}
.xp-fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #7C3AED, #C084FC, #F88CD4);
  box-shadow: 0 0 12px rgba(192, 132, 252, 0.5);
}
</style>
