# AGENT HANDOFF — MemeCats: The Viral Collection

> **File ini WAJIB dibaca PERTAMA KALI oleh agent AI sebelum mulai kerja di setiap sesi.**

---

## Status Saat Ini

**Semua fase SELESAI** (Fase 0–13). Project siap production deployment.

**Update terakhir**: 2026-06-14 — Claude session 1 complete.

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
Buka dashboard project di vercel.com → Settings → Environment Variables:
```
JWT_SECRET=ed502d01f6c4321b581d1621c9da6e5db24ca402e0db62daf93e0069139b8906
ADMIN_SECRET=8ebc8c13f2d850b80b3e400ebf33b2548936722d2e9a0a6d
CRON_SECRET=a344519946cb8f287c788eed5aef75a915d4d2b2311c571b
DATABASE_URL=postgresql://neondb_owner:npg_NQ98OsWkVBYq@ep-purple-bar-aorkm3e6-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
GEMINI_API_KEY=gen-lang-client-0926529858
NODE_ENV=production
```

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
