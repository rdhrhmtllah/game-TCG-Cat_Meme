// ═══════════════════════════════════════════════════════════════
// Sound engine PROSEDURAL PREMIUM (Web Audio API) — tanpa file aset.
// Teknik "mewah": reverb (convolver), FM bell (nada logam), sub-bass
// (bobot), kompresor (glue), layering kontekstual. Mute + volume + musik
// dipersist. AudioContext di-resume saat gesture pertama.
// ═══════════════════════════════════════════════════════════════
import { ref } from 'vue';

const SOUND_KEY = 'memecats_sound';
const VOL_KEY = 'memecats_volume';
// Key BARU khusus era OST — sengaja beda dari 'memecats_music' lama (era
// musik prosedural) supaya setelan lama tidak ikut mematikan OST baru.
const MUSIC_KEY = 'memecats_ost';

const enabled = ref(localStorage.getItem(SOUND_KEY) !== '0');
const volume = ref(parseFloat(localStorage.getItem(VOL_KEY) ?? '0.7'));
// Musik OST default MENYALA (kecuali user matikan) — mengiringi seluruh menu.
const musicOn = ref(localStorage.getItem(MUSIC_KEY) !== '0');

let ctx = null;
let master = null;   // gain akhir (volume)
let bus = null;      // kompresor (input semua suara)
let reverb = null;   // convolver
let reverbGain = null;

function makeImpulse(duration = 2.2, decay = 3.2) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // pre-delay kecil + ekor decay eksponensial → ruang yang halus
      const env = Math.pow(1 - i / len, decay);
      d[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return buf;
}

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();

  // Master (volume akhir)
  master = ctx.createGain();
  master.gain.value = volume.value;
  master.connect(ctx.destination);

  // Kompresor sebagai bus utama → glue & keras tanpa clip
  bus = ctx.createDynamicsCompressor();
  bus.threshold.value = -16;
  bus.knee.value = 22;
  bus.ratio.value = 3;
  bus.attack.value = 0.003;
  bus.release.value = 0.22;
  bus.connect(master);

  // Reverb bus (ruang premium)
  reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse();
  reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.9;
  reverb.connect(reverbGain);
  reverbGain.connect(bus);

  return ctx;
}

function attachResume() {
  const resume = () => {
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume();
    if (musicOn.value) startMusic();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, resume, { passive: true })
  );
}
if (typeof window !== 'undefined') attachResume();

// ═══════════════════════════════════════════════════════════════
// Layer audio berbasis FILE (.mp3) — OST loop, tunggu-gacha loop,
// dan reveal per rarity. Volume mengikuti master `volume` + level mix
// tiap klip; ikut mute lewat `enabled`. Autoplay-block diabaikan
// (akan jalan begitu ada gesture user).
// ═══════════════════════════════════════════════════════════════
const FILES = {
  ost:             '/sfx/ost.mp3',
  gachaWait:       '/sfx/wating-gacha.mp3',
  revealCommon:    '/sfx/rare-basic-card.mp3',
  revealRare:      '/sfx/rare-basic-card.mp3',
  revealEpic:      '/sfx/epic-card.mp3',
  revealLegendary: '/sfx/legendary-card.mp3',
};
// Level mix relatif per klip (dikali `volume` master)
const FILE_MIX = {
  ost: 0.40, gachaWait: 0.60,
  revealCommon: 0.80, revealRare: 0.85, revealEpic: 0.95, revealLegendary: 1.0,
};

let ostEl = null;   // loop musik latar
let waitEl = null;  // loop saat pack berputar

function makeEl(url, loop = false) {
  const a = new Audio(url);
  a.loop = loop;
  a.preload = 'auto';
  return a;
}
function fileVol(key) {
  return Math.max(0, Math.min(1, volume.value * (FILE_MIX[key] ?? 1)));
}
function playLoopFile(kind) {
  if (!enabled.value) return;
  let el = kind === 'ost' ? ostEl : waitEl;
  if (!el) { el = makeEl(FILES[kind], true); if (kind === 'ost') ostEl = el; else waitEl = el; }
  el.volume = fileVol(kind);
  const p = el.play();
  if (p && p.catch) p.catch(() => {}); // autoplay diblokir → diabaikan
}
function stopLoopFile(kind) {
  const el = kind === 'ost' ? ostEl : waitEl;
  if (el) { try { el.pause(); el.currentTime = 0; } catch {} }
}
function playRevealFile(name) {
  const url = FILES[name];
  if (!url) return;
  // instance baru tiap reveal → boleh tumpang-tindih tanpa terpotong
  const el = makeEl(url, false);
  el.volume = fileVol(name);
  const p = el.play();
  if (p && p.catch) p.catch(() => {});
}
function updateFileVolumes() {
  if (ostEl) ostEl.volume = fileVol('ost');
  if (waitEl) waitEl.volume = fileVol('gachaWait');
}

function now() { return ctx.currentTime; }

// Kirim node ke bus kering + (opsional) reverb basah
function out(node, reverbAmt = 0) {
  node.connect(bus);
  if (reverbAmt > 0) {
    const s = ctx.createGain();
    s.gain.value = reverbAmt;
    node.connect(s);
    s.connect(reverb);
  }
}

// ── Primitif sintesis premium ─────────────────────────────────

// Nada murni/detune dengan ADSR eksponensial + optional glide
function tone(freq, { type = 'sine', dur = 0.2, attack = 0.006, gain = 0.25, freqEnd = null, detune = 0, reverbAmt = 0.12, delay = 0 } = {}) {
  const t0 = now() + delay;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const voices = detune ? [-detune, detune] : [0];
  for (const dt of voices) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    o.detune.value = dt;
    o.connect(g);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  out(g, reverbAmt);
}

// FM bell — nada logam "mahal" (koin, chime, reveal)
function bell(freq, { dur = 0.7, gain = 0.22, ratio = 2.0, index = 4, reverbAmt = 0.4, delay = 0 } = {}) {
  const t0 = now() + delay;
  const carrier = ctx.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = freq;
  const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = freq * ratio;
  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(freq * index, t0);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.15 + 0.001, t0 + dur * 0.5); // metallic → murni (bell)
  mod.connect(modGain); modGain.connect(carrier.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  carrier.connect(g);
  out(g, reverbAmt);
  carrier.start(t0); mod.start(t0);
  carrier.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
}

// Sub-bass dengan pitch-drop → "boom/mantap"
function sub(freq = 90, { dur = 0.5, gain = 0.5, drop = 0.55, delay = 0 } = {}) {
  const t0 = now() + delay;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(freq * drop, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); out(g, 0.08);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

// Noise berfilter (rip, whoosh, sparkle) dengan gerak filter
function noiseHit(dur = 0.3, { type = 'bandpass', freq = 1200, q = 0.8, freqEnd = null, gain = 0.25, reverbAmt = 0.15, delay = 0 } = {}) {
  const t0 = now() + delay;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type; filter.frequency.setValueAtTime(freq, t0); filter.Q.value = q;
  if (freqEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.15));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter); filter.connect(g); out(g, reverbAmt);
  src.start(t0); src.stop(t0 + dur + 0.03);
}

// Sekuens memakai synth apa pun
function seq(notes, step, fn, opts = {}) {
  notes.forEach((f, i) => fn(f, { ...opts, delay: (opts.delay || 0) + i * step }));
}

// Awan sparkle (butir bell tinggi acak) → shimmer mewah
function sparkleCloud(count = 8, { base = 1400, spread = 1400, dur = 0.35, gain = 0.06, span = 0.5, reverbAmt = 0.5, delay = 0 } = {}) {
  for (let i = 0; i < count; i++) {
    const f = base + Math.random() * spread;
    bell(f, { dur, gain, ratio: 3.0, index: 2, reverbAmt, delay: delay + Math.random() * span });
  }
}

// Skala mayor (untuk fanfare)
const MAJ = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5 };

// ── Definisi SFX (premium, kontekstual) ───────────────────────
const SFX = {
  // UI halus
  click:  () => tone(1000, { type: 'triangle', dur: 0.05, gain: 0.09, reverbAmt: 0.05, freqEnd: 1300 }),
  hover:  () => tone(1500, { type: 'sine', dur: 0.03, gain: 0.03, reverbAmt: 0 }),
  toggle: () => { bell(700, { dur: 0.18, gain: 0.1, ratio: 1.5, index: 2, reverbAmt: 0.2 }); },
  open:   () => { bell(523, { dur: 0.4, gain: 0.12, reverbAmt: 0.4 }); bell(784, { dur: 0.5, gain: 0.1, reverbAmt: 0.4, delay: 0.06 }); },

  // Koin — "cha-ching" logam mewah
  coin:   () => { bell(1050, { dur: 0.35, gain: 0.16, ratio: 2.4, index: 5, reverbAmt: 0.35 }); bell(1570, { dur: 0.5, gain: 0.14, ratio: 2.4, index: 4, reverbAmt: 0.4, delay: 0.07 }); },
  coinBurst: () => {
    sub(70, { dur: 0.25, gain: 0.18 });
    const notes = [1046, 1245, 1568, 1760, 2093, 1568];
    seq(notes, 0.055, (f, o) => bell(f, { dur: 0.4, gain: 0.11, ratio: 2.5, index: 4, reverbAmt: 0.45, ...o }));
    sparkleCloud(5, { base: 1800, spread: 1600, gain: 0.04, span: 0.35, delay: 0.1 });
  },
  claim:  () => { sub(80, { dur: 0.3, gain: 0.2 }); seq([523, 659, 784, 1047], 0.075, (f, o) => bell(f, { dur: 0.45, gain: 0.13, reverbAmt: 0.4, ...o })); },

  // Kartu & pack
  cardFlip: () => { noiseHit(0.16, { type: 'highpass', freq: 900, freqEnd: 3200, gain: 0.1, reverbAmt: 0.1 }); tone(1200, { type: 'sine', dur: 0.08, gain: 0.04, reverbAmt: 0.1, freqEnd: 1800 }); },
  whoosh: () => noiseHit(0.32, { type: 'bandpass', freq: 300, freqEnd: 2200, q: 0.6, gain: 0.14, reverbAmt: 0.25 }),
  packShake: () => noiseHit(0.1, { type: 'bandpass', freq: 500, gain: 0.06, reverbAmt: 0.1 }),
  packTear: () => {
    // Layer: foil rip cerah → tekstur kertas → thump berbobot + ekor reverb
    noiseHit(0.5, { type: 'highpass', freq: 2600, freqEnd: 600, q: 0.5, gain: 0.2, reverbAmt: 0.2 });
    noiseHit(0.3, { type: 'bandpass', freq: 1100, q: 1.2, gain: 0.12, reverbAmt: 0.15, delay: 0.03 });
    sub(120, { dur: 0.4, gain: 0.28, drop: 0.4, delay: 0.28 });
    sparkleCloud(4, { base: 2200, spread: 1500, gain: 0.03, span: 0.3, delay: 0.3 });
  },
  select: () => { sub(90, { dur: 0.35, gain: 0.22 }); bell(659, { dur: 0.45, gain: 0.15, reverbAmt: 0.45 }); bell(988, { dur: 0.55, gain: 0.12, reverbAmt: 0.5, delay: 0.08 }); },

  // Reveal per rarity — mood naik bertingkat
  revealCommon: () => { bell(MAJ.C4, { dur: 0.5, gain: 0.16, reverbAmt: 0.45 }); bell(MAJ.G4, { dur: 0.6, gain: 0.1, reverbAmt: 0.5, delay: 0.05 }); },
  revealRare: () => { sub(90, { dur: 0.3, gain: 0.14 }); seq([MAJ.C4, MAJ.E4, MAJ.G4], 0.08, (f, o) => bell(f, { dur: 0.55, gain: 0.15, reverbAmt: 0.5, ...o })); sparkleCloud(4, { gain: 0.03, delay: 0.15 }); },
  revealEpic: () => {
    sub(75, { dur: 0.45, gain: 0.22, drop: 0.5 });
    seq([MAJ.C4, MAJ.E4, MAJ.G4, MAJ.C5], 0.09, (f, o) => bell(f, { dur: 0.7, gain: 0.15, ratio: 2.0, index: 5, reverbAmt: 0.55, ...o }));
    tone(MAJ.C4, { type: 'sawtooth', dur: 1.0, gain: 0.05, detune: 8, reverbAmt: 0.5, delay: 0.1 }); // pad swell
    sparkleCloud(7, { base: 1600, gain: 0.04, span: 0.6, delay: 0.2 });
  },
  revealLegendary: () => {
    // Cinematic: impact sub → arpeggio bell megah → pad choir swell → shimmer
    sub(55, { dur: 0.9, gain: 0.4, drop: 0.6 });
    noiseHit(0.6, { type: 'lowpass', freq: 400, gain: 0.12, reverbAmt: 0.4 }); // impact body
    seq([MAJ.C4, MAJ.E4, MAJ.G4, MAJ.C5, MAJ.E5, MAJ.G5, MAJ.C6], 0.1,
      (f, o) => bell(f, { dur: 0.9, gain: 0.14, ratio: 2.0, index: 6, reverbAmt: 0.6, ...o }));
    // Pad "choir" tumpuk (mayor) menahan
    [MAJ.C4, MAJ.E4, MAJ.G4].forEach((f, i) => tone(f, { type: 'sawtooth', dur: 1.8, gain: 0.05, detune: 10, reverbAmt: 0.6, delay: 0.15 + i * 0.02 }));
    sparkleCloud(12, { base: 2000, spread: 2200, gain: 0.05, span: 1.0, delay: 0.25 });
  },

  levelUp: () => { sub(80, { dur: 0.4, gain: 0.22 }); seq([MAJ.G4, MAJ.C5, MAJ.E5, MAJ.G5], 0.09, (f, o) => bell(f, { dur: 0.7, gain: 0.16, reverbAmt: 0.55, ...o })); sparkleCloud(8, { base: 1800, gain: 0.05, span: 0.6, delay: 0.15 }); },
  success: () => { bell(MAJ.G4, { dur: 0.4, gain: 0.14, reverbAmt: 0.4 }); bell(MAJ.C5, { dur: 0.55, gain: 0.14, reverbAmt: 0.45, delay: 0.09 }); },
  error:  () => { sub(70, { dur: 0.25, gain: 0.22, drop: 0.7 }); noiseHit(0.18, { type: 'lowpass', freq: 320, gain: 0.1, reverbAmt: 0.1 }); }, // thud halus, bukan buzz kasar
};

// ── Musik latar (OST loop dari file) ───────────────────────────
// Saat true, OST ditahan diam (mis. selama sesi gacha) meski ada gesture.
let musicSuspended = false;
function startMusic() {
  if (!musicOn.value || !enabled.value || musicSuspended) return;
  playLoopFile('ost'); // jika elemen sudah ada, lanjut dari posisi terakhir
}
function stopMusic() {
  stopLoopFile('ost');
}
// Jeda sementara (mis. selama gacha) tanpa mengubah preferensi musicOn,
// dan tanpa reset posisi supaya bisa lanjut mulus setelahnya. Flag suspend
// mencegah OST hidup lagi karena gesture (klik sobek/reveal) selama gacha.
function pauseMusic() {
  musicSuspended = true;
  if (ostEl) { try { ostEl.pause(); } catch {} }
}
function resumeMusic() {
  musicSuspended = false;
  if (musicOn.value && enabled.value) startMusic();
}

// ── API publik (tak berubah) ──────────────────────────────────
function play(name) {
  if (!enabled.value) return;
  // Loop file: tunggu pack berputar
  if (name === 'gachaWait') { playLoopFile('gachaWait'); return; }
  // One-shot file: reveal per rarity (revealCommon/Rare/Epic/Legendary)
  if (FILES[name] && name.indexOf('reveal') === 0) { playRevealFile(name); return; }
  // Sisanya: sintesis prosedural (Web Audio)
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const fn = SFX[name];
  if (fn) try { fn(); } catch (e) { /* abaikan */ }
}

// Menghentikan suara loop (mis. 'gachaWait')
function stop(name) {
  if (name === 'gachaWait') stopLoopFile('gachaWait');
}

function setEnabled(v) {
  enabled.value = v;
  localStorage.setItem(SOUND_KEY, v ? '1' : '0');
  if (!v) { stopMusic(); stopLoopFile('gachaWait'); }
  else if (musicOn.value) startMusic();
}
function toggleMute() { setEnabled(!enabled.value); if (enabled.value) play('toggle'); }

function setVolume(v) {
  volume.value = Math.max(0, Math.min(1, v));
  localStorage.setItem(VOL_KEY, String(volume.value));
  if (master) master.gain.value = volume.value;
  updateFileVolumes();
}

function toggleMusic() {
  musicOn.value = !musicOn.value;
  localStorage.setItem(MUSIC_KEY, musicOn.value ? '1' : '0');
  if (musicOn.value && enabled.value) { ensureCtx(); startMusic(); }
  else stopMusic();
  play('toggle');
}

function haptic(pattern = 20) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch {} }
}

export function useSound() {
  return { play, stop, pauseMusic, resumeMusic, enabled, volume, musicOn, toggleMute, setEnabled, setVolume, toggleMusic, haptic };
}
