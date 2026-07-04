# AGENT HANDOFF — MemeCats: The Viral Collection

> **File ini WAJIB dibaca PERTAMA KALI oleh agent AI sebelum mulai kerja di setiap sesi.**

---

## Status Saat Ini

**Semua fase SELESAI** (Fase 0–13). Project siap production deployment.

**Visual Overhaul SELESAI** — Pokémon TCG Premium Style diterapkan ke seluruh UI/UX.

**Update terakhir**: 2026-06-15 — Antigravity session: Gacha polish, activities integration, and database schema migration complete.

### Polish & Activities Integration — Files Modified
- `src/components/IconBase.vue` — Added gamepad icon SVG for Activities.
- `src/components/NavBar.vue` — Changed Activities menu item to use the custom gamepad icon.
- `src/components/GachaPack.vue` — Separated drag completion from animation completion events; exposed tear progress.
- `src/views/GachaShop.vue` — Implemented persistent GachaPack instance, drag/animation synchronization, and auto-tear button.
- `src/views/Dashboard.vue` — Replaced redundant Showcase quick action card with Activities card.
- `api/db/schema.js` — Configured user tables with coin mechanics fields.
- `api/me.js` — Returned user fields to frontend.
- `api/daily-login.js` — Added mission tracking support.

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
- [x] Fase 12 — Polish, Hardening & QA Akhir
- [x] Fase 13 — Deployment (code ready, butuh user action)

---

## Status Kredensial

| Variable | Status | Catatan |
|---|---|---|
| `JWT_SECRET` | ✅ | Di `.env` |
| `ADMIN_SECRET` | ✅ | Di `.env` |
| `CRON_SECRET` | ✅ | Di `.env` |
| `DATABASE_URL` | ✅ | Neon Pooled — production-ready |
| `GEMINI_API_KEY` | ✅ | Di `.env` |
| `BLOB_READ_WRITE_TOKEN` | ⬜ | `CHANGE_ME` — butuh setup Vercel Blob |

---

## Deployment Steps (User Action Required)

### 1. Deploy ke Vercel
```bash
# Deploy (akan prompt login + project setup saat pertama kali)
vercel

# Atau deploy langsung ke production:
vercel --prod
```

### 2. Set Environment Variables di Vercel Dashboard
Buka dashboard project di vercel.com → Settings → Environment Variables.
Nilai asli HANYA boleh ada di `.env` lokal (di-gitignore) dan Vercel env vars — JANGAN PERNAH tulis nilai asli di file yang di-commit:
```
JWT_SECRET=<set-in-vercel-env>
ADMIN_SECRET=<set-in-vercel-env>
CRON_SECRET=<set-in-vercel-env>
DATABASE_URL=<set-in-vercel-env>
GEMINI_API_KEY=<set-in-vercel-env>
NODE_ENV=production
```

### ⚠️ 2b. WAJIB: Rotasi Kredensial (secrets pernah ter-commit di file ini)

Versi lama file ini berisi nilai secret asli dan sudah masuk git history — anggap SEMUA kredensial di bawah bocor dan rotasi segera:

- [ ] **Neon DATABASE_URL** — dashboard [console.neon.tech](https://console.neon.tech) → project → Roles → reset password `neondb_owner` → update `DATABASE_URL` di `.env` lokal + Vercel env.
- [ ] **JWT_SECRET** — generate baru: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` → update `.env` + Vercel. (Konsekuensi: semua sesi login user invalid, user harus login ulang.)
- [ ] **ADMIN_SECRET** — generate baru dengan cara yang sama → update `.env` + Vercel.
- [ ] **CRON_SECRET** — generate baru → update `.env` + Vercel (cron Vercel memakai header dari env, tidak perlu ubah kode).
- [ ] **GEMINI_API_KEY** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → hapus key lama → buat key baru → update `.env` + Vercel.
- [ ] Redeploy Vercel setelah semua env var diganti.

### 3. Setup Vercel Blob (untuk upload gambar admin)
1. Dashboard Vercel → tab "Storage" → "Create Database" → "Blob"
2. Beri nama "memecats-cards" → Create
3. Copy `BLOB_READ_WRITE_TOKEN` → tambahkan ke env vars di atas

### 4. Run DB migration di production
```bash
# Seed data (idempotent — aman dijalankan ulang)
node api/db/seed.js

# CHECK constraints (idempotent)
node api/db/migrate-checks.js
```

### 5. Verifikasi Cron Job
Di Vercel dashboard → tab "Cron Jobs" → pastikan `cron-trends` terjadwal `0 */12 * * *`

### 6. Smoke Test Production
1. Buka domain Vercel → Register → Gacha → Showcase → Claim Idle → Market
2. Buka `/admin` → Login dengan `ADMIN_SECRET` → CRUD cards
3. Trigger cron manual: `GET https://<domain>/api/cron-trends` dengan header `Authorization: Bearer <CRON_SECRET>`

---

## Deviasi dari PRD

- `api/inventory.js` → `api/inventory/index.js` + `api/inventory/sell.js` (Windows filesystem)
- `api/db/client.js` pakai WebSocket Pool (bukan HTTP driver) — butuh transactions
- `api/admin/cards.js` pakai routing manual, bukan Vercel `[id].js`
- Placeholder images `.svg` di `public/placeholders/` (bukan `.webp`)

---

## Catatan Teknis

- **Dev server**: `node api/dev-server.js` → port 3000
- **Frontend**: `npm run dev` → port 5173 (proxy `/api` → 3000)
- **DB**: Neon Postgres, region Singapore, pooled connection
- **Three.js**: Card3D chunk ~693KB (expect warning di build — normal untuk Three.js)
- **Semua endpoint API**: test via Node fetch, semua passing
