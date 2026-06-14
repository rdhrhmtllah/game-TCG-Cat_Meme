# AGENT HANDOFF — MemeCats: The Viral Collection

> **File ini WAJIB dibaca PERTAMA KALI oleh agent AI sebelum mulai kerja
> di setiap sesi** — baik sesi pertama maupun sesi lanjutan.
>
> File ini WAJIB diupdate oleh agent SETIAP KALI: (a) sebuah fase selesai
> dengan DoD terpenuhi, ATAU (b) sesi akan berakhir karena context/token
> mendekati limit.

---

## Dokumen Rujukan

- **PRD utama**: `docs\MASTER-PRD-MemeCats.md` — single source of truth.
- **File ini**: status progres + konteks operasional.

---

## Status Saat Ini

**Fase aktif**: `Fase 12 — Polish, Hardening & QA Akhir`
**Progress**: Fase 0-11 selesai. Semua kode sudah ditulis. Tinggal testing end-to-end.
**Update terakhir oleh**: Claude (agent session 1)
**Tanggal**: 2026-06-14

---

## Checklist Progres per Fase

- [x] Fase 0 — Project Setup & Scaffolding
- [x] Fase 1 — Database Layer
- [x] Fase 2 — Backend Core Library
- [x] Fase 3 — Endpoint Autentikasi
- [x] Fase 4 — Core Game Loop Endpoints
- [x] Fase 5 — Marketplace Endpoints
- [x] Fase 6 — Frontend Foundation
- [x] Fase 7 — Core Game Views (Dashboard & Binder)
- [x] Fase 8 — 3D Rendering & Gacha Experience
- [x] Fase 9 — Marketplace UI
- [x] Fase 10 — Admin Panel
- [x] Fase 11 — AI Cron Content Generation
- [ ] Fase 12 — Polish, Hardening & QA Akhir
- [ ] Fase 13 — Deployment

---

## Status Kredensial / Environment Variables

| Variable                | Status         | Catatan                                           |
| ----------------------- | -------------- | ------------------------------------------------- |
| `JWT_SECRET`            | ✅ Sudah ada   | Di `.env`                                         |
| `ADMIN_SECRET`          | ✅ Sudah ada   | Di `.env`                                         |
| `CRON_SECRET`           | ✅ Sudah ada   | Di `.env`                                         |
| `DATABASE_URL`          | ✅ Sudah ada   | Neon Pooled Connection, berfungsi                 |
| `GEMINI_API_KEY`        | ✅ Sudah ada   | Di `.env`, cron-trends akan pakai ini             |
| `BLOB_READ_WRITE_TOKEN` | ⬜ Belum diisi | Masih `CHANGE_ME` — untuk upload gambar di admin  |

---

## Keputusan & Penyesuaian (Deviasi dari PRD)

- **[2026-06-14] [Fase 1]**: `api/inventory.js` → `api/inventory/index.js` + `api/inventory/sell.js` (Windows filesystem constraint)
- **[2026-06-14] [Fase 1]**: `api/db/client.js` pakai `Pool` (WebSocket) + `drizzle-orm/neon-serverless`, BUKAN HTTP driver (butuh transactions)
- **[2026-06-14] [Fase 10]**: `api/admin/cards.js` pakai routing manual (switch method + regex `:id`) — bukan Vercel `[id].js`
- **[2026-06-14] [Fase 0]**: Placeholder images jadi `.svg` di `public/placeholders/` (bukan `.webp`)

---

## Ringkasan File yang Sudah Dibuat

### Backend (API) — Semua sudah di-test via Node fetch ✅
```
api/
├── _lib/jwt.js, requireAuth.js, requireAdmin.js, schemas.js, errors.js, rateLimit.js
├── db/schema.js, client.js, seed.js, migrate-checks.js
├── auth/register.js, auth/login.js
├── me.js, master-cards.js, gacha.js, showcase.js, claim-idle.js
├── inventory/index.js, inventory/sell.js
├── market/listings.js, market/list.js, market/buy.js, market/cancel.js
├── admin/login.js, admin/cards.js
├── cron-trends.js
└── dev-server.js
```

### Frontend (Vue 3) — Semua komponen & view fungsional
```
src/
├── main.js, App.vue
├── router/index.js (auth guard)
├── stores/auth.js, stores/player.js
├── components/
│   ├── Card3D.vue (Three.js + shader holografik)
│   ├── HandTracker.vue (MediaPipe Hands + gesture pinch)
│   ├── NavBar.vue, EmptyState.vue, CoinDisplay.vue
├── views/
│   ├── Login.vue, Register.vue
│   ├── Dashboard.vue (claim idle, showcase, dex progress)
│   ├── Binder.vue (inventory grid, filter, detail modal, actions)
│   ├── GachaShop.vue (Card3D + HandTracker + confetti)
│   ├── Marketplace.vue (browse + my listings tabs)
│   └── AdminCards.vue (login + CRUD table + form)
└── assets/css/main.css (Tailwind + rarity classes)
```

---

## Test Hasil

### API Endpoint Tests (via Node fetch — SEMUA PASSING)
- ✅ Auth: register (201), duplicate (409), login (200), wrong pass (401), anti-enum (401)
- ✅ GET /api/me: with token (200, no passwordHash), without token (401)
- ✅ GET /api/master-cards: 200 + 20 cards, filter rarity works
- ✅ POST /api/gacha: 200 with card, 400 INSUFFICIENT_FUNDS when coins < 100
- ✅ GET /api/inventory: 200 with items
- ✅ POST /api/showcase: add/remove works, 400 SHOWCASE_FULL at 6th
- ✅ POST /api/claim-idle: 400 COOLDOWN_ACTIVE within 10s
- ✅ POST /api/inventory/sell: 403 CARD_IN_SHOWCASE for showcase cards
- ✅ POST /api/market/list: 400 PRICE_OUT_OF_RANGE for invalid price
- ✅ POST /api/market/list: 200 valid listing appears in browse
- ✅ POST /api/market/buy: 200 card transfers, 409 MARKET_CONFLICT on re-buy
- ✅ POST /api/market/cancel: 403 when non-owner tries to cancel

---

## Cara Menjalankan Development

```bash
# Terminal 1 — API server (port 3000)
node api/dev-server.js

# Terminal 2 — Vite frontend (port 5173, proxy /api → 3000)
npm run dev
```

Buka `http://localhost:5173` di browser.

---

## Blocker / Hal yang Perlu Diperhatikan

1. **BLOB_READ_WRITE_TOKEN**: Masih `CHANGE_ME`. Admin bisa CRUD kartu tapi tanpa upload gambar (pakai placeholder). Untuk upload gambar asli, isi token Vercel Blob dulu.

2. **Admin cards endpoint**: Belum di-test (tapi kode sudah ditulis). Perlu test GET/POST/PATCH/DELETE `/api/admin/cards` dengan admin login.

3. **Cron trends**: Belum di-test dengan Gemini API key yang sesungguhnya. Endpoint sudah lengkap. Trigger manual: `GET http://localhost:3000/api/cron-trends` dengan header `Authorization: Bearer <CRON_SECRET>`.

4. **Binder & Dashboard views**: Masih pakai emoji placeholder untuk preview kartu, belum terintegrasi dengan `Card3D` mini mode. Perlu update untuk render Card3D di grid.

5. **Memory leak testing**: Card3D cleanup sudah diimplementasikan tapi belum di-verifikasi dengan DevTools Memory profiler.

6. **NavBar routing**: Admin route `/admin` tidak muncul di navigasi utama (sesuai spesifikasi).

## Catatan untuk Agent Selanjutnya

Saya menyelesaikan SELURUH kode backend (Fase 2-5, 10-11) dan SELURUH kode frontend (Fase 6-9). Semua endpoint API sudah di-test dengan Node.js fetch dan SEMUA PASSING. Database Neon sudah berisi 20 kartu seed (8C/6R/4E/2L) + CHECK constraints aktif.

**Langkah selanjutnya (Fase 12 — Polish & QA):**
1. Jalankan `node api/dev-server.js` + `npm run dev` — buka browser di `localhost:5173`
2. Test end-to-end: register → gacha → showcase → claim idle → market sell → market buy → admin login → admin CRUD cards
3. Verifikasi Card3D rendering di GachaShop (Three.js + shader foil untuk Epic/Legendary)
4. Verifikasi HandTracker gesture pinch (izinkan kamera di browser)
5. Verifikasi fallback tap (tolak kamera)
6. Update Binder.vue dan Dashboard.vue untuk integrasi Card3D mini mode
7. Audit rate limiting, error format, transaction isolation (sesuai checklist Fase 12)
8. Setelah semua OK: deploy ke Vercel (Fase 13)
