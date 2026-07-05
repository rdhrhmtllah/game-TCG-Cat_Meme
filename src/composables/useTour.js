// ═══════════════════════════════════════════════════════════════
// Onboarding Tour — hybrid spotlight + hands-on untuk user baru.
// State global (singleton). Langkah bisa Info (tombol Lanjut) atau
// Action (menunggu aksi nyata: event custom / perubahan route).
// Persist via authStore.markTourSeen() (backend) + guard localStorage.
// ═══════════════════════════════════════════════════════════════
import { ref, computed } from 'vue';
import router from '@/router/index.js';
import { useAuthStore } from '@/stores/auth.js';
import { useSound } from '@/composables/useSound.js';

const DONE_KEY = 'memecats_tour_done';

// ── Definisi langkah ───────────────────────────────────────────
// target: selector elemen yang disorot (null = modal tengah tanpa spotlight)
// route: navigasi ke sini saat memasuki langkah (opsional)
// action: langkah hands-on. { event } menunggu window CustomEvent;
//         { route } menunggu user berpindah ke route tsb (mis. klik menu).
const STEPS = [
  {
    id: 'welcome', route: '/app', center: true,
    title: '👋 Selamat datang di MemeCats!',
    body: 'Yuk kenalan sebentar (±1 menit). Aku antar kamu keliling fitur utama, langkah demi langkah. Bisa dilewati kapan saja.',
  },
  {
    id: 'stats', target: '[data-tour="stats"]',
    title: '🪙 Koin, Level & XP',
    body: 'Koin dipakai untuk membuka booster pack. Setiap aksi memberi XP — kumpulkan untuk naik level dan dapat bonus koin.',
  },
  {
    id: 'showcase', target: '[data-tour="showcase"]',
    title: '🏆 Showcase = Koin Pasif',
    body: 'Pajang kartu di Showcase, dan koleksimu menghasilkan koin otomatis tiap detik. Tinggal klik Klaim untuk memanennya.',
  },
  {
    id: 'go-gacha', target: '[data-tour="nav-gacha"]',
    action: { route: '/gacha' },
    title: '🎴 Buka Menu Gacha',
    body: 'Di sinilah kamu membuka booster pack untuk dapat kartu baru.',
    actionHint: 'Klik menu Gacha untuk lanjut',
  },
  {
    id: 'open-pack', target: '[data-tour="open-pack"]',
    action: { event: 'tour:pack-opened' },
    title: '✨ Buka Pack Pertamamu!',
    body: 'Pilih pack, sobek, dan lihat kartu yang kamu dapat. Selesaikan seluruh proses lalu tutup ringkasannya untuk lanjut.',
    actionHint: 'Buka satu pack sampai selesai',
    minimizeOnAction: true,
  },
  {
    id: 'go-binder', target: '[data-tour="nav-binder"]',
    action: { route: '/binder' },
    title: '📒 Buka Binder',
    body: 'Semua kartu koleksimu tersimpan rapi di Binder.',
    actionHint: 'Klik menu Binder untuk lanjut',
  },
  {
    id: 'open-card', target: '[data-tour="card-item"]',
    action: { event: 'tour:card-detail' },
    title: '🔍 Lihat Detail Kartu',
    body: 'Tap sebuah kartu untuk melihat detail HD-nya — kamu juga bisa mengunduhnya jadi JPG.',
    actionHint: 'Tap satu kartu untuk lanjut',
    minimizeOnAction: true,
  },
  {
    id: 'showcase-card', target: '[data-tour="showcase-btn"]',
    action: { event: 'tour:card-showcased' },
    title: '🌟 Pajang di Showcase',
    body: 'Pajang kartu ini di Showcase supaya mulai menghasilkan koin pasif.',
    actionHint: 'Tekan "Pajang di Showcase" untuk lanjut',
    minimizeOnAction: true,
  },
  {
    id: 'market', route: '/market', target: '[data-tour="nav-market"]',
    title: '🛒 Marketplace',
    body: 'Jual kartu duplikatmu untuk koin, atau buru kartu incaran dari pemain lain.',
  },
  {
    id: 'activities', route: '/activities', target: '[data-tour="nav-activities"]',
    title: '🎡 Activities',
    body: 'Klaim hadiah login harian, tuntaskan quest, dan main mini-game (spin wheel & coin flip) untuk koin ekstra.',
  },
  {
    id: 'leaderboard', route: '/leaderboard', target: '[data-tour="nav-leaderboard"]',
    title: '🏅 Leaderboard',
    body: 'Bersaing di papan peringkat global. Buktikan koleksimu paling legendaris!',
  },
  {
    id: 'finish', route: '/app', center: true,
    title: '🚀 Kamu Siap!',
    body: 'Itu dia loop-nya: buka pack → koleksi → pajang di showcase → panen koin → buka lagi. Selamat berkoleksi, dan naik ke puncak leaderboard!',
    finishLabel: 'Mulai Main',
  },
];

// ── State singleton ────────────────────────────────────────────
const active = ref(false);
const stepIndex = ref(0);
const steps = STEPS;

const current = computed(() => steps[stepIndex.value] || null);
const total = steps.length;
const progress = computed(() => stepIndex.value + 1);

// ── Util: ambil elemen yang BENAR-BENAR terlihat (nav dirender ganda
// untuk mobile & desktop; pilih yang visible) ──────────────────
function getTargetEl(selector) {
  if (!selector) return null;
  const els = document.querySelectorAll(selector);
  for (const el of els) {
    if (el.offsetParent !== null && el.getBoundingClientRect().width > 0) return el;
  }
  return els[0] || null;
}

function waitForEl(selector, timeout = 3500) {
  return new Promise((resolve) => {
    if (!selector) return resolve(null);
    const found = getTargetEl(selector);
    if (found) return resolve(found);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const el = getTargetEl(selector);
      if (el) { clearInterval(iv); resolve(el); }
      else if (Date.now() - t0 > timeout) { clearInterval(iv); resolve(null); }
    }, 60);
  });
}

// ── Langkah action: pasang / lepas listener ────────────────────
let actionCleanup = null;
function cleanupAction() {
  if (actionCleanup) { try { actionCleanup(); } catch {} actionCleanup = null; }
}
function setupAction(step) {
  const done = () => { if (active.value && current.value?.id === step.id) next(); };
  if (step.action?.event) {
    const h = () => done();
    window.addEventListener(step.action.event, h);
    actionCleanup = () => window.removeEventListener(step.action.event, h);
  } else if (step.action?.route) {
    // router.afterEach mengembalikan fungsi untuk melepas guard
    actionCleanup = router.afterEach((to) => { if (to.path === step.action.route) done(); });
    // Safety: bila user SUDAH di route tujuan (mis. keluar summary via link Binder),
    // langsung lanjut agar tour tidak mentok.
    if (router.currentRoute.value.path === step.action.route) setTimeout(done, 60);
  }
}

// ── Terapkan langkah (navigasi + tunggu target + pasang action) ─
async function applyStep(i) {
  cleanupAction();
  const step = steps[i];
  if (!step) return;
  if (step.route && router.currentRoute.value.path !== step.route) {
    try { await router.push(step.route); } catch {}
  }
  if (step.target) await waitForEl(step.target);
  if (!active.value) return; // bisa saja di-skip saat menunggu
  if (step.action) setupAction(step);
}

// ── Kontrol publik ─────────────────────────────────────────────
function goTo(i) { stepIndex.value = i; applyStep(i); }

function next() {
  if (!active.value) return;
  try { useSound().play('click'); } catch {}
  if (stepIndex.value >= steps.length - 1) return finish();
  goTo(stepIndex.value + 1);
}
function prev() { if (active.value && stepIndex.value > 0) goTo(stepIndex.value - 1); }

function start() {
  active.value = true;
  stepIndex.value = 0;
  applyStep(0);
  try { useSound().play('open'); } catch {}
}

function skip() { finish(); }

async function finish() {
  cleanupAction();
  active.value = false;
  localStorage.setItem(DONE_KEY, '1');
  try { await useAuthStore().markTourSeen(); } catch {}
  try { useSound().play('success'); } catch {}
}

// Auto-start untuk user baru (dipanggil setelah fetchMe di App.vue)
function maybeAutoStart() {
  if (active.value) return;
  if (localStorage.getItem(DONE_KEY) === '1') return;
  const u = useAuthStore().user;
  if (u && u.hasSeenTour === false) {
    // beri jeda kecil agar Dashboard sempat render targetnya
    setTimeout(() => { if (!active.value) start(); }, 600);
  }
}

export function useTour() {
  return {
    active, current, stepIndex, progress, total,
    start, next, prev, skip, finish, maybeAutoStart,
    getTargetEl,
  };
}
