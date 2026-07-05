# Onboarding Tour untuk User Baru — Design Spec

**Tanggal:** 2026-07-05
**Status:** Disetujui

## Tujuan

Mengajari user baru MemeCats secara lengkap, step-per-step, lewat tour **hybrid**:
spotlight pada UI asli **plus** langkah hands-on (user benar-benar melakukan aksi
untuk lanjut). Auto-start sekali untuk user baru, bisa dilewati, bisa diulang, dan
status "sudah lihat tour" **disimpan di backend** agar konsisten lintas perangkat.

## Keputusan yang disepakati

- **Bentuk:** hybrid — spotlight di UI asli + langkah hands-on interaktif.
- **Pemicu:** auto-start saat user baru pertama tiba di `/app`; ada tombol "Lewati"
  kapan saja + tombol "Ulangi Panduan" di Home. Persist agar tak muncul lagi.
- **Persistensi:** flag `hasSeenTour` di record user (backend) — lintas perangkat.
- **Teknologi:** custom Vue (composable `useTour` + komponen `TourOverlay`), tanpa
  library tur eksternal. Alasan: perlu menunggu aksi multi-layar (cinematic gacha),
  berpindah route, membaca state Pinia reaktif, dan styling menyatu dengan design system.

## Arsitektur

- `src/composables/useTour.js` — state global: daftar langkah, indeks aktif,
  `start()`, `next()`, `prev()`, `skip()`, `finish()`, `completeAction(id)`.
  Auto-start dari `user.hasSeenTour`. Persist via `authStore.markTourSeen()` + guard
  `localStorage` (`memecats_tour_done`) untuk cegah flicker.
- `src/components/tour/TourOverlay.vue` — dipasang sekali di `App.vue`. Overlay gelap
  dengan lubang spotlight mengikuti `getBoundingClientRect` target (reaktif thd
  scroll/resize), plus tooltip: judul, penjelasan, progres "Langkah X dari N",
  tombol Kembali/Lanjut/Lewati.
- Target ditandai atribut `data-tour="..."` di komponen yang sudah ada (non-invasif).

**Tipe langkah:**
1. **Info** — spotlight + penjelasan, maju via tombol Lanjut.
2. **Action (hands-on)** — spotlight target; Lanjut disembunyikan; tour menunggu event
   nyata (`tour:*`) lalu maju otomatis. Teks "👉 Lakukan: ...".

**Navigasi antar halaman:** tiap langkah bisa punya `route`; tour `router.push` lalu
polling singkat sampai elemen target muncul sebelum menyorot.

**Gacha (langkah 5) & Showcase (langkah 8):** saat langkah action yang butuh cinematic
penuh, overlay mengecil jadi hint kecil tak menghalangi; lanjut otomatis saat event
`tour:pack-opened` / `tour:card-showcased` terpicu.

## Alur langkah (12)

| # | Halaman | Sorotan | Tipe | Isi |
|---|---------|---------|------|-----|
| 1 | Home | modal tengah | Info | Selamat datang + kenalan singkat |
| 2 | Home | saldo koin & level/XP | Info | Koin untuk pack; aksi memberi XP → naik level |
| 3 | Home | area showcase | Info | Kartu di showcase = koin pasif; ada tombol Klaim |
| 4 | Nav | menu Gacha | Action | Klik menu Gacha → /gacha |
| 5 | Gacha | tombol buka pack | Action | Buka pack pertama (tuntaskan cinematic; maju saat dapat kartu) |
| 6 | Nav | menu Binder | Action | Klik menu Binder → /binder |
| 7 | Binder | satu kartu | Action | Tap kartu untuk detail HD (maju saat modal detail terbuka) |
| 8 | Binder | tombol Pajang Showcase | Action | Pajang 1 kartu → yield aktif |
| 9 | Nav | menu Market | Info | Jual duplikat & beli kartu incaran |
| 10 | Nav | menu Activities | Info | Login harian, quest, mini-game |
| 11 | Nav | menu Peringkat | Info | Leaderboard global |
| 12 | Home | modal tengah | Info | "Kamu siap!" + ringkasan + Mulai Main → finish |

Tombol Lewati tersedia sepanjang tour (menandai `hasSeenTour = true` juga).

## Perubahan Backend

1. `db/schema.js` `users`: tambah `hasSeenTour boolean default false notNull`.
2. `db/migrate-tour.js` idempotent: `ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_tour boolean DEFAULT false NOT NULL`.
3. `POST /api/tour-seen` (requireAuth) → set `hasSeenTour = true`, return `{ ok: true }`.
   Didaftarkan di `api/index.js` (peta route prod); dev-server auto-route.
4. Ekspos `hasSeenTour` di response `me.js`, `auth/login.js`, `auth/register.js`.

## Perubahan Frontend

- `stores/auth.js`: `user.hasSeenTour` tersedia; `markTourSeen()` (POST endpoint +
  set `user.hasSeenTour = true`).
- Anchor `data-tour`: NavBar (`nav-gacha`, `nav-binder`, `nav-market`, `nav-activities`,
  `nav-leaderboard`), Dashboard (`stats-coins`, `stats-level`, `showcase`, `claim-btn`),
  GachaShop (`open-pack`), Binder (`card-item`, `showcase-btn`).
- Event aksi: `tour:pack-opened` (Gacha saat masuk summary), `tour:card-detail`
  (Binder saat modal detail terbuka), `tour:card-showcased` (Binder saat kartu masuk
  showcase). Di-emit lewat `window.dispatchEvent` / bus sederhana; `useTour` mendengarkan.
- Tombol "Ulangi Panduan" di Home memanggil `tour.start()`.

## Dependensi terverifikasi

- User baru dapat **500 koin** (`register.js`), biaya pack **100** → hands-on buka pack aman.
- Auth store sudah punya `user` reaktif + `fetchMe`/`refreshAfterAction`.

## Verifikasi

- Migrasi jalan; kolom `has_seen_tour` ada; user lama default `false` (akan lihat tour
  sekali — dapat diterima) — atau set `true` untuk user lama bila ingin grandfather.
- User baru daftar → tour auto-start di Home; 12 langkah jalan; langkah hands-on maju
  hanya setelah aksi nyata; Lewati & Ulangi berfungsi; `hasSeenTour` tersimpan (cek
  reload & device lain tak memunculkan tour lagi).
- `npm run build` lolos; `node --check` file backend.
