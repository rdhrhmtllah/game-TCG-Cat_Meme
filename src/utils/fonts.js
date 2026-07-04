// Jaminan webfont ter-load SEBELUM canvas kartu digambar.
// Tanpa ini, drawCardCanvas bisa ter-render pakai font sistem (fallback)
// dan hasilnya tersimpan permanen di CanvasTexture.

let fontsPromise = null;

// Spec mewakili semua family+weight yang dipakai cardRenderer
const FONT_SPECS = [
  '800 24px "Outfit"',
  '700 20px "Outfit"',
  '500 13px "Inter"',
  '700 13px "Inter"',
  '700 24px "Cinzel"',
  '900 24px "Cinzel"',
];

export function ensureFontsLoaded() {
  if (fontsPromise) return fontsPromise;
  if (!document.fonts?.load) {
    fontsPromise = Promise.resolve();
    return fontsPromise;
  }
  const loadAll = Promise.all(
    FONT_SPECS.map((spec) => document.fonts.load(spec).catch(() => {}))
  );
  // Jangan pernah blokir render selamanya (mis. offline) — cap 3 detik
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  fontsPromise = Promise.race([loadAll, timeout]).then(() => {});
  return fontsPromise;
}
