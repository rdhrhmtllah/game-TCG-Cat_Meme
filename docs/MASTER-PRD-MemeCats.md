# MASTER PRD — MemeCats: The Viral Collection
## Versi Final Konsolidasi (v3) — Single Source of Truth untuk Autonomous Coding Agent

---

## 0. Tentang Dokumen Ini

Dokumen ini adalah **gabungan final** dari seluruh spesifikasi (PRD awal + addendum hardening + game design completion) menjadi satu dokumen runtut. Dokumen ini adalah **satu-satunya rujukan** yang harus dibaca agentic AI sebelum mulai coding — tidak ada dokumen lain yang berlaku.

**Prinsip kerja untuk agentic AI:**
- Baca seluruh dokumen ini dari awal sampai akhir SEBELUM menulis baris kode pertama.
- Kerjakan sesuai urutan **Fase Eksekusi** di Bagian 17. Jangan lompat fase — setiap fase punya dependency ke fase sebelumnya.
- Jika ada konflik antara bagian spesifikasi dengan bagian Fase Eksekusi, **Fase Eksekusi yang menang** (karena itu sudah mempertimbangkan urutan dependency).
- Semua hal yang ditandai **"Fase 2 — JANGAN DIKERJAKAN SEKARANG"** hanya untuk referensi struktur skema masa depan. Tidak ada kode untuk fitur tersebut yang perlu ditulis di iterasi ini.

**Ruang lingkup Fase 1 (sekarang):**
- Game inti: gacha, idle economy, showcase, marketplace P2P, card collection.
- Autentikasi mandiri: username + password (TANPA Telegram/Google).
- Admin panel untuk menambah/mengelola kartu.
- Cron job AI untuk generate konsep kartu baru.

**Ruang lingkup Fase 2 (nanti, tidak dikerjakan sekarang):**
- Integrasi login Google/Telegram (account linking).
- Premium currency, leaderboard, daily login bonus terpisah.

---

## 1. Executive Summary

**MemeCats: The Viral Collection** adalah game web 3D Card Collector & Idle Economy bertema kucing meme viral. Tanpa mekanik battle — fokus penuh pada koleksi kartu, gacha imersif berbasis gesture kamera, generasi koin pasif (idle), dan bursa pasar P2P antar pemain. Seluruh infrastruktur 100% serverless di atas Vercel, zero-maintenance, dengan konten kartu yang terus berkembang secara otomatis via AI (Gemini) maupun input manual admin.

**Game loop inti:**
```
Login → Klaim koin idle (showcase) → Buka gacha pack (100 coin) →
  → Kartu bagus → masuk Showcase (maks 5, generate likes/sec pasif)
  → Kartu duplikat → Jual ke Marketplace (P2P) atau Sell-to-Vault (instan ke sistem)
→ Koin hasil jual → buka pack lagi → ulang
```

---

## 2. Tech Stack (Final)

| Layer | Teknologi | Catatan |
|---|---|---|
| Frontend Framework | Vue 3 (Composition API) + Vite + Tailwind CSS | SPA, mobile-first |
| 3D Rendering | Three.js (vanilla, bukan TresJS) | Procedural geometry, TIDAK ada file model 3D (.glb) — lihat Bagian 9 |
| Computer Vision | Google MediaPipe Hands | Client-side, lazy-load, dengan fallback tap (Bagian 10) |
| State Management | Pinia | Auth state (token di memori), player state |
| Backend Runtime | Node.js 20+ via Vercel Serverless Functions (`/api`) | Stateless |
| Database | PostgreSQL via Neon.tech (HTTP driver) | Serverless connection pool |
| ORM | Drizzle ORM | Type-safe, low cold-start |
| Image Storage | Vercel Blob | Untuk upload gambar kartu via admin (Bagian 11) |
| Image Processing | `sharp` | Resize/convert gambar upload admin |
| Auth | Username/password (`bcryptjs`) + JWT (`jsonwebtoken`) | Fase 1 — lihat Bagian 6 |
| Validasi Input | Zod | Semua endpoint |
| Edge Security | Cloudflare WAF | Rate-limiting & filter trafik |
| AI Content Generation | `@google/generative-ai` (Gemini) via Vercel Cron | Bagian 12 |

---

## 3. Struktur Monorepo (Final)

```text
memecats-monorepo/
├── api/
│   ├── _lib/
│   │   ├── requireAuth.js        # Middleware verifikasi JWT user
│   │   ├── requireAdmin.js       # Middleware verifikasi ADMIN_SECRET
│   │   ├── jwt.js                # Helper sign/verify JWT
│   │   ├── schemas.js            # Semua skema Zod
│   │   ├── errors.js             # Helper format error response standar
│   │   └── rateLimit.js          # In-memory token bucket sederhana
│   ├── db/
│   │   ├── client.js             # Koneksi Neon + Drizzle
│   │   ├── schema.js             # Skema relasional final
│   │   └── seed.js               # Seed data master_cards awal
│   ├── auth/
│   │   ├── register.js           # POST /api/auth/register
│   │   └── login.js              # POST /api/auth/login
│   ├── me.js                     # GET /api/me
│   ├── inventory.js               # GET /api/inventory, POST /api/inventory/sell (lihat 5.6)
│   ├── showcase.js               # POST /api/showcase
│   ├── master-cards.js           # GET /api/master-cards
│   ├── gacha.js                  # POST /api/gacha
│   ├── claim-idle.js             # POST /api/claim-idle
│   ├── cron-trends.js            # GET /api/cron-trends (Vercel Cron target)
│   ├── market/
│   │   ├── list.js               # POST /api/market/list
│   │   ├── buy.js                # POST /api/market/buy
│   │   ├── cancel.js             # POST /api/market/cancel
│   │   └── listings.js           # GET /api/market/listings
│   └── admin/
│       ├── login.js              # POST /api/admin/login
│       └── cards.js              # GET/POST /api/admin/cards, PATCH/DELETE /api/admin/cards/:id
├── src/
│   ├── assets/
│   │   └── cards/placeholders/
│   │       ├── common-placeholder.webp
│   │       ├── rare-placeholder.webp
│   │       ├── epic-placeholder.webp
│   │       └── legendary-placeholder.webp
│   ├── components/
│   │   ├── Card3D.vue            # Render kartu 3D + shader foil (Bagian 9)
│   │   ├── HandTracker.vue       # Gesture kamera + fallback (Bagian 10)
│   │   ├── CoinDisplay.vue       # Format angka besar (Bagian 5.7)
│   │   ├── EmptyState.vue        # Komponen state kosong reusable
│   │   └── NavBar.vue            # Navigasi bawah (mobile) / atas (desktop)
│   ├── views/
│   │   ├── Login.vue
│   │   ├── Register.vue
│   │   ├── Dashboard.vue
│   │   ├── Binder.vue
│   │   ├── GachaShop.vue
│   │   ├── Marketplace.vue
│   │   └── AdminCards.vue
│   ├── stores/
│   │   ├── auth.js                # Pinia: token, user info
│   │   └── player.js              # Pinia: coins, inventory cache, showcase
│   ├── router/
│   │   └── index.js               # Vue Router + auth guard
│   ├── App.vue
│   └── main.js
├── vercel.json
├── package.json
├── vite.config.js
└── .env.example
```

---

## 4. Skema Database Final (`api/db/schema.js`)

Ini adalah skema FINAL yang menggantikan seluruh versi sebelumnya. Tulis file ini persis seperti berikut (boleh tambah komentar, jangan kurangi field):

```javascript
import { pgTable, serial, varchar, integer, timestamp, boolean, doublePrecision, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// 1. USERS — Autentikasi mandiri (username/password, Fase 1)
// ============================================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 20 }).notNull().unique(), // disimpan lowercase
  passwordHash: varchar('password_hash', { length: 255 }).notNull(), // bcrypt hash
  platformId: varchar('platform_id', { length: 255 }).unique(), // NULLABLE — reserved untuk Fase 2 (account linking Google/Telegram)
  coins: integer('coins').default(500).notNull(),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastClaimedAt: timestamp('last_claimed_at').defaultNow().notNull(),
}, (table) => ({
  usernameIdx: index('username_idx').on(table.username),
}));

// ============================================================
// 2. MASTER CARDS — Katalog seluruh kartu di game
// ============================================================
export const masterCards = pgTable('master_cards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(), // unique untuk idempotent seed & cron
  description: varchar('description', { length: 255 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(), // Common, Rare, Epic, Legendary
  hypeScore: integer('hype_score').notNull(),
  likesPerSec: doublePrecision('likes_per_sec').notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
  isPlaceholderImage: boolean('is_placeholder_image').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(), // soft-delete oleh admin
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  rarityIdx: index('rarity_idx').on(table.rarity),
  activeRarityIdx: index('active_rarity_idx').on(table.isActive, table.rarity),
}));

// ============================================================
// 3. USER INVENTORY — Kepemilikan kartu per pemain
// ============================================================
export const userInventory = pgTable('user_inventory', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cardId: integer('card_id').references(() => masterCards.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  inShowcase: boolean('in_showcase').default(false).notNull(),
  isAccountBound: boolean('is_account_bound').default(false).notNull(),
  tradeLockedUntil: timestamp('trade_locked_until'), // NULLABLE
}, (table) => ({
  userCardIdx: index('user_card_idx').on(table.userId, table.cardId),
  showcaseIdx: index('showcase_idx').on(table.userId, table.inShowcase),
}));

// ============================================================
// 4. MARKETPLACE LISTINGS — Orderbook P2P
// ============================================================
export const marketplaceListings = pgTable('marketplace_listings', {
  id: serial('id').primaryKey(),
  sellerId: integer('seller_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cardId: integer('card_id').references(() => masterCards.id, { onDelete: 'cascade' }).notNull(),
  price: integer('price').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, sold, canceled
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('status_idx').on(table.status),
  listingSearchIdx: index('listing_search_idx').on(table.cardId, table.status),
}));

// ============================================================
// 5. CRON RUNS — Idempotency tracking untuk cron-trends
// ============================================================
export const cronRuns = pgTable('cron_runs', {
  id: serial('id').primaryKey(),
  jobName: varchar('job_name', { length: 50 }).notNull(),
  ranAt: timestamp('ran_at').defaultNow().notNull(),
});

// ============================================================
// RELASI
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  inventory: many(userInventory),
  listings: many(marketplaceListings),
}));

export const masterCardsRelations = relations(masterCards, ({ many }) => ({
  ownedInstances: many(userInventory),
  marketListings: many(marketplaceListings),
}));

export const userInventoryRelations = relations(userInventory, ({ one }) => ({
  user: one(users, { fields: [userInventory.userId], references: [users.id] }),
  card: one(masterCards, { fields: [userInventory.cardId], references: [masterCards.id] }),
}));

export const marketplaceListingsRelations = relations(marketplaceListings, ({ one }) => ({
  seller: one(users, { fields: [marketplaceListings.sellerId], references: [users.id] }),
  card: one(masterCards, { fields: [marketplaceListings.cardId], references: [masterCards.id] }),
}));
```

### 4.1 Database-Level Constraints Tambahan
Setelah `drizzle-kit push`, tambahkan CHECK constraint via SQL manual (atau via `db:push` jika Drizzle versi yang dipakai mendukung):
```sql
ALTER TABLE users ADD CONSTRAINT coins_non_negative CHECK (coins >= 0);
ALTER TABLE marketplace_listings ADD CONSTRAINT price_positive CHECK (price > 0);
ALTER TABLE user_inventory ADD CONSTRAINT quantity_non_negative CHECK (quantity >= 0);
```
Ini adalah pengaman lapis terakhir (defense-in-depth) jika ada bug logika di endpoint yang lolos validasi aplikasi.

---

## 5. Game Design & Economy Rules (Final)

### 5.1 Parameter Ekonomi Inti

| Parameter | Nilai | Lokasi Implementasi |
|---|---|---|
| Koin awal pemain baru | 500 | `users.coins` default |
| Harga 1x gacha pull | 100 coin | `/api/gacha` |
| Maks slot showcase | 5 | `/api/showcase` validasi |
| Cap idle accumulation | 43.200 detik (12 jam) | `/api/claim-idle` |
| Cooldown claim idle | 10 detik | `/api/claim-idle` |
| Pajak transaksi marketplace | 5% dari harga | `/api/market/buy` |
| Cooldown trade per kartu | 24 jam | `userInventory.tradeLockedUntil` |
| Sybil lock (akun < 72 jam + kartu bound) | 72 jam | `/api/market/buy` |
| Harga jual minimum di market | hypeScore × 0.5 | `/api/market/list` |
| Harga jual maksimum di market | hypeScore × 5.0 | `/api/market/list` |

### 5.2 Tabel Rarity & Drop Rate (Gacha)

| Rarity | Roll Range (`Math.random()*100`) | Probabilitas | hypeScore | likesPerSec |
|---|---|---|---|---|
| Legendary | `<= 2.0` | 2% | 800 | 15.0 |
| Epic | `2.01 – 10.0` | ~8% | 400 | 6.5 |
| Rare | `10.01 – 30.0` | ~20% | 200 | 2.5 |
| Common | `30.01 – 100.0` | 70% | 50 | 0.8 |

### 5.3 Logika Gacha Lengkap (`/api/gacha`)

1. Verifikasi JWT → dapatkan `userId`.
2. Buka `db.transaction`, lock baris `users` (`SELECT ... FOR UPDATE`).
3. Jika `user.coins < 100` → rollback, `400 { code: "INSUFFICIENT_FUNDS" }`.
4. Kurangi `coins -= 100`.
5. `roll = Math.random() * 100`, tentukan rarity sesuai tabel 5.2.
6. **Guard pool kosong**: `SELECT COUNT(*) FROM master_cards WHERE rarity = :rarity AND isActive = true`. Jika 0 → turunkan rarity satu tingkat (Legendary→Epic→Rare→Common). Jika seluruh pool kosong → rollback total (kembalikan 100 coin), `503 { code: "CARD_POOL_EMPTY" }`.
7. Pilih 1 kartu acak dari pool yang valid (`ORDER BY random() LIMIT 1` di Postgres, atau ambil semua ID lalu pilih acak di JS — keduanya boleh).
8. Tentukan `isAccountBound`: `true` jika `user.coins` SEBELUM transaksi ini berasal dari starter (heuristik sederhana untuk Fase 1: set `isAccountBound = true` jika `user.createdAt` lebih baru dari 72 jam DAN user belum pernah melakukan transaksi marketplace sebagai pembeli — untuk MVP, cukup gunakan: `isAccountBound = (Date.now() - user.createdAt < 72h)`).
9. Upsert ke `user_inventory`: jika baris `(userId, cardId)` sudah ada, `quantity += 1`; jika belum, insert baru dengan `quantity = 1, inShowcase = false`.
10. Commit transaksi.
11. Return `200` dengan payload kartu (Bagian 7).

### 5.4 Logika Claim Idle Lengkap (`/api/claim-idle`)

1. Verifikasi JWT → `userId`.
2. Ambil `user.lastClaimedAt`.
3. `secondsElapsed = Math.max(0, Math.floor((Date.now() - new Date(user.lastClaimedAt).getTime()) / 1000))`. (`Math.max(0, ...)` mengatasi clock skew/edge case waktu mundur.)
4. Jika `secondsElapsed < 10` → `400 { code: "COOLDOWN_ACTIVE", message: "Tunggu minimal 10 detik untuk klaim lagi!" }`.
5. `secondsElapsed = Math.min(secondsElapsed, 43200)`.
6. Query `user_inventory` JOIN `master_cards` WHERE `userId = :userId AND inShowcase = true`.
7. **Edge case showcase kosong**: jika hasil query 0 baris, `totalLikesPerSec = 0` → `coinsEarned = 0`. TETAP lanjutkan proses (update `lastClaimedAt`, return `200` dengan `coinsEarned: 0`) — JANGAN return error. Frontend menampilkan pesan "Isi showcase dengan kartu untuk mulai menghasilkan koin pasif!" jika `coinsEarned === 0` DAN showcase kosong.
8. `totalLikesPerSec = SUM(likesPerSec)` dari hasil query (maks 5 baris — divalidasi juga di endpoint `/api/showcase`).
9. `coinsEarned = Math.floor(secondsElapsed * totalLikesPerSec)`.
10. Update `users`: `coins += coinsEarned`, `lastClaimedAt = NOW()`.
11. Return `200 { coinsEarned, totalCurrentCoins, secondsElapsed }`.

### 5.5 Showcase Management (`/api/showcase`)

- Payload: `{ cardInventoryId: Integer, action: "add" | "remove" }`.
- `action = "add"`: hitung `COUNT(*) WHERE userId = :userId AND inShowcase = true`. Jika `>= 5` → `400 { code: "SHOWCASE_FULL", message: "Showcase sudah penuh (maks 5 kartu)." }`. Jika belum penuh, set `inShowcase = true` pada baris target (validasi `userId` pada baris = `userId` dari token).
- `action = "remove"`: set `inShowcase = false`.
- Return `200` dengan state showcase terbaru (list 5 kartu beserta detail dari `master_cards`).

### 5.6 Sell-to-Vault — Liquiditas Instan untuk Duplikat (BARU)

**Masalah yang diselesaikan**: kartu duplikat yang tidak ada peminat di marketplace P2P jadi aset mati selamanya. Sell-to-vault memberi opsi "jual ke sistem" instan dengan harga lebih rendah dari market, sebagai jaring pengaman likuiditas.

- Endpoint: `POST /api/inventory/sell`.
- Payload: `{ cardInventoryId: Integer, quantity: Integer (default 1) }`.
- Validasi:
  - Baris `user_inventory` harus milik `userId` dari token.
  - `quantity` yang diminta `<= quantity` yang dimiliki.
  - **Kartu yang sedang `inShowcase = true` tidak bisa dijual** — user harus remove dari showcase dulu (`403 { code: "CARD_IN_SHOWCASE" }`).
- Harga vendor per kartu: `vendorPrice = Math.floor(masterCard.hypeScore * 0.3)` (lebih rendah dari `minAllowedPrice` market di 0.5x, supaya market P2P tetap lebih menguntungkan — vendor hanya untuk likuiditas darurat).
- Logika: dalam transaksi, kurangi `quantity` pada `user_inventory` (hapus baris jika `quantity` jadi 0), tambah `users.coins += vendorPrice * quantity`.
- Return `200 { message: "Kartu terjual ke sistem!", coinsEarned: <total>, totalCurrentCoins }`.
- TIDAK ada pajak 5% untuk sell-to-vault (pajak hanya berlaku transaksi P2P).
- TIDAK terkena `isAccountBound`/sybil restriction — sell-to-vault selalu diizinkan (uangnya kembali ke sistem, bukan ke pemain lain, sehingga tidak ada risiko money laundering antar akun).

### 5.7 Format Angka Besar (Frontend — `CoinDisplay.vue`)

Semua tampilan angka koin/likes-per-sec di UI WAJIB melalui formatter berikut (komponen `CoinDisplay.vue` atau utility `formatNumber.js`):

```javascript
export function formatNumber(num) {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
}
// Contoh: 1240 -> "1.2K", 3500000 -> "3.5M", 850 -> "850"
```
Tooltip/title attribute pada elemen tetap menampilkan angka penuh (`title="1,240"`) untuk transparansi.

### 5.8 Card Dex / Progres Koleksi

- Dashboard menampilkan progress bar: `(jumlah cardId unik di user_inventory milik user) / (COUNT master_cards WHERE isActive = true) * 100%`.
- Data ini dihitung di frontend dari hasil `/api/inventory` (Set unik `cardId`) dan `/api/master-cards` (total aktif) — tidak perlu endpoint baru.
- Tampilkan sebagai teks, misal: `"42 / 60 kartu ditemukan (70%)"`.

### 5.9 Onboarding — Pengalaman Pertama Kali

- Setelah `/api/auth/register` sukses (dan auto-login), redirect langsung ke **GachaShop** (BUKAN Dashboard), karena Dashboard saat showcase kosong tidak banyak yang bisa dilakukan.
- Tampilkan banner one-time di GachaShop: *"Selamat datang! Kamu punya 500 coin — cukup untuk 5x buka pack. Yuk buka pack pertamamu!"* — banner ini disimpan statusnya di Pinia store (`hasSeenWelcome`), cukup tampil sekali per sesi (tidak perlu persist ke DB untuk Fase 1).
- Setelah pull pertama berhasil dan dapat kartu, tampilkan tooltip singkat: *"Kartu bagus! Masukkan ke Showcase di Binder supaya kamu mulai dapat koin pasif."* — mengarahkan user ke Binder.

---

## 6. Autentikasi & Sesi (Fase 1 — Username/Password)

### 6.1 Endpoint Registrasi (`POST /api/auth/register`)
- Payload: `{ username: String, password: String }`.
- Validasi (Zod, lihat 8.x skema): `username` 3–20 karakter, regex `^[a-zA-Z0-9_]+$`, simpan lowercase, unik. `password` minimal 8 karakter, maksimal 72.
- Jika username sudah ada → `409 { code: "USERNAME_TAKEN" }`.
- Hash password dengan `bcryptjs` cost 10.
- Insert user: `coins=500`, `lastClaimedAt=NOW()`, `createdAt=NOW()`.
- Response `201`: `{ message, user: {id, username, coins, avatarUrl, createdAt}, token }` — auto-login, JWT langsung diterbitkan.

### 6.2 Endpoint Login (`POST /api/auth/login`)
- Payload: `{ username: String, password: String }`.
- Cari user (lowercase match), `bcrypt.compare`.
- Gagal (user tidak ada ATAU password salah) → `401 { code: "INVALID_CREDENTIALS", message: "Username atau password salah." }` — pesan SAMA untuk kedua kasus (anti-enumeration).
- Sukses → `200 { message, user, token }`.

### 6.3 JWT Session
- Payload token: `{ userId, username, iat, exp }`. Sign dengan `JWT_SECRET`, expiry 7 hari.
- Header request: `Authorization: Bearer <token>`.
- Middleware `requireAuth.js` (di `api/_lib/`): verifikasi signature & expiry → inject `req.userId`. Jika gagal → `401 { code: "UNAUTHORIZED" }`.
- Endpoint yang WAJIB pakai `requireAuth`: `/api/gacha`, `/api/claim-idle`, `/api/inventory*`, `/api/showcase`, `/api/market/list`, `/api/market/buy`, `/api/market/cancel`, `/api/me`.
- Endpoint publik (TANPA `requireAuth`): `/api/auth/register`, `/api/auth/login`, `/api/master-cards`, `/api/market/listings`, `/api/cron-trends` (pakai `CRON_SECRET`, bukan JWT).
- Frontend: simpan token di Pinia store (memori), BUKAN `localStorage`. Refresh halaman = perlu login ulang (acceptable Fase 1).

### 6.4 Rate Limiting Level Aplikasi

| Endpoint | Limit |
|---|---|
| `/api/auth/login` | 5x/menit per IP DAN per `username` |
| `/api/auth/register` | 5x/menit per IP |
| `/api/gacha` | 30x/menit per user |
| `/api/claim-idle` | 10x/menit per user (selain cooldown 10 detik) |
| `/api/market/buy` | 20x/menit per user |

Implementasi: in-memory token bucket sederhana di `api/_lib/rateLimit.js` (cukup untuk MVP single-region; jika traffic tinggi, upgrade ke Upstash Redis — tidak wajib Fase 1).

### 6.5 Keamanan Password
- `bcryptjs`, cost factor 10.
- Password tidak pernah di-log atau muncul di response apa pun.

### 6.6 Fase 2 — Catatan Integrasi Eksternal (JANGAN DIKERJAKAN SEKARANG)
Kolom `users.platformId` (nullable, unique) sudah disiapkan. Saat dibutuhkan nanti: `POST /api/auth/link/:provider` (link akun existing ke Google/Telegram) dan `POST /api/auth/login/:provider` (login langsung via provider, isi `platformId`). Tidak ada perubahan pada endpoint gacha/marketplace/idle.

---

## 7. Referensi API Lengkap

Format response error standar (semua endpoint):
```javascript
{ "message": "Pesan ramah untuk user", "code": "ERROR_CODE_CONSTANT" }
```

| Endpoint | Method | Auth | Payload / Query | Response Sukses |
|---|---|---|---|---|
| `/api/auth/register` | POST | - | `{ username, password }` | `201 { message, user, token }` |
| `/api/auth/login` | POST | - | `{ username, password }` | `200 { message, user, token }` |
| `/api/me` | GET | JWT | - | `200 { user: {id, username, coins, avatarUrl, createdAt, lastClaimedAt} }` |
| `/api/gacha` | POST | JWT | - (body kosong) | `200 { message, cardDrawn: {...masterCard, isNew, quantityOwned} }` |
| `/api/claim-idle` | POST | JWT | - (body kosong) | `200 { message, coinsEarned, totalCurrentCoins, secondsElapsed }` |
| `/api/inventory` | GET | JWT | - | `200 { inventory: [{id, cardId, quantity, inShowcase, isAccountBound, tradeLockedUntil, card: {...masterCard}}] }` |
| `/api/inventory/sell` | POST | JWT | `{ cardInventoryId, quantity }` | `200 { message, coinsEarned, totalCurrentCoins }` |
| `/api/showcase` | POST | JWT | `{ cardInventoryId, action: "add"\|"remove" }` | `200 { showcase: [...max 5 cards] }` |
| `/api/master-cards` | GET | - | `?rarity=` (opsional) | `200 { cards: [...] }` (cache 1 jam) |
| `/api/market/listings` | GET | - | `?page=&limit=&rarity=` | `200 { listings: [...], pagination: {page, limit, total} }` |
| `/api/market/list` | POST | JWT | `{ cardInventoryId, price }` | `200 { message: "Kartu berhasil dipajang di pasar!" }` |
| `/api/market/buy` | POST | JWT | `{ listingId }` | `200 { message, cardIdPurchased, pricePaid }` |
| `/api/market/cancel` | POST | JWT | `{ listingId }` | `200 { message: "Listing dibatalkan." }` |
| `/api/admin/login` | POST | - | `{ secret }` | `200` + cookie `admin_session` |
| `/api/admin/cards` | GET | Admin | `?page=&limit=` | `200 { cards: [...] }` |
| `/api/admin/cards` | POST | Admin | `multipart/form-data` (image + metadata) | `201 { message, card }` |
| `/api/admin/cards/:id` | PATCH | Admin | `multipart/form-data` (partial) | `200 { message, card }` |
| `/api/admin/cards/:id` | DELETE | Admin | - | `200 { message: "Kartu dinonaktifkan." }` |
| `/api/cron-trends` | GET | `CRON_SECRET` | - (header `Authorization: Bearer <CRON_SECRET>`) | `200 { message }` |

### 7.1 Daftar Lengkap Error Codes

| Code | HTTP Status | Skenario |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input tidak lolos Zod |
| `INSUFFICIENT_FUNDS` | 400 | Koin tidak cukup untuk gacha/beli |
| `COOLDOWN_ACTIVE` | 400 | Claim idle < 10 detik |
| `SHOWCASE_FULL` | 400 | Showcase sudah 5 kartu |
| `CARD_IN_SHOWCASE` | 403 | Coba jual/list kartu yang sedang showcase |
| `USERNAME_TAKEN` | 409 | Register dengan username yang sudah ada |
| `INVALID_CREDENTIALS` | 401 | Login gagal |
| `UNAUTHORIZED` | 401 | JWT tidak ada/invalid/expired |
| `FORBIDDEN` | 403 | Admin secret salah |
| `FORBIDDEN_SYBIL_LOCK` | 403 | Beli kartu bound dari akun < 72 jam |
| `TRADE_LOCKED` | 403 | Kartu masih dalam cooldown 24 jam |
| `PRICE_OUT_OF_RANGE` | 400 | Harga listing di luar 0.5x–5.0x hypeScore |
| `NOT_FOUND` | 404 | Resource (listing/kartu/user) tidak ditemukan |
| `MARKET_CONFLICT` | 409 | Race condition — listing sudah terjual |
| `CARD_POOL_EMPTY` | 503 | Tidak ada kartu aktif untuk rarity manapun |
| `INTERNAL_ERROR` | 500 | Error tak terduga (log detail di server, jangan expose ke client) |

---

## 8. Skema Validasi Zod (`api/_lib/schemas.js`)

```javascript
import { z } from 'zod';

// --- AUTH ---
export const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore"),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// --- GAME CORE ---
export const gachaSchema = z.object({}); // userId dari token

export const claimIdleSchema = z.object({}); // userId dari token

export const showcaseSchema = z.object({
  cardInventoryId: z.number().int().positive(),
  action: z.enum(['add', 'remove']),
});

export const sellToVaultSchema = z.object({
  cardInventoryId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

// --- MARKETPLACE ---
export const marketListSchema = z.object({
  cardInventoryId: z.number().int().positive(),
  price: z.number().int().positive().max(1_000_000),
});

export const marketBuySchema = z.object({
  listingId: z.number().int().positive(),
});

export const marketCancelSchema = z.object({
  listingId: z.number().int().positive(),
});

export const marketListingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  rarity: z.enum(['Common', 'Rare', 'Epic', 'Legendary']).optional(),
});

// --- ADMIN ---
export const adminLoginSchema = z.object({
  secret: z.string().min(1),
});

export const adminCardSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(255),
  rarity: z.enum(['Common', 'Rare', 'Epic', 'Legendary']),
  hypeScore: z.number().int().positive().max(5000),
  likesPerSec: z.number().positive().max(100),
});

export const adminCardUpdateSchema = adminCardSchema.partial();
```

---

## 9. Spesifikasi Frontend per Halaman (View Specs)

> **Prinsip umum**: TIDAK ADA file model 3D (.glb/.gltf) di proyek ini. "Kartu 3D" = `BoxGeometry(2.5, 3.5, 0.05)` + tekstur gambar 2D (`imageUrl`) + shader GLSL untuk Epic/Legendary. Ini memungkinkan admin menambah kartu baru hanya dengan upload 1 gambar 2D (lihat Bagian 11).

### 9.1 `Login.vue` & `Register.vue`
- Form sederhana: input `username`, `password` (+ `confirmPassword` di Register, validasi cocok di client sebelum submit).
- Tampilkan pesan error dari API persis seperti `message` yang dikembalikan backend.
- Setelah sukses: simpan `token` + `user` ke Pinia `auth` store, redirect ke `/gacha` (lihat 5.9 — onboarding).
- Link silang "Belum punya akun? Daftar" / "Sudah punya akun? Login".

### 9.2 `Dashboard.vue`
Elemen yang HARUS ada:
- **Header**: `username`, total coin (via `CoinDisplay`), progress Card Dex (5.8).
- **Tombol Klaim Idle**: menampilkan estimasi `coinsEarned` jika diklaim sekarang (hitung di frontend berdasarkan `lastClaimedAt` + `totalLikesPerSec` dari showcase, di-refresh tiap detik). Tombol disabled selama `secondsElapsed < 10` dengan countdown visual.
- **Jika showcase kosong**: tampilkan `EmptyState` dengan pesan dari 5.4 poin 7 dan tombol CTA "Buka Binder untuk isi Showcase".
- **5 Slot Showcase**: render `Card3D.vue` untuk tiap kartu terisi; slot kosong = placeholder kotak putus-putus dengan ikon "+", klik → navigasi ke Binder dengan filter "belum di showcase".
- **Total likes/sec** ditampilkan sebagai ringkasan ("Yield saat ini: X coin/detik").

### 9.3 `Binder.vue`
- Grid kartu dari `/api/inventory`, render tiap kartu via `Card3D.vue` (versi mini/statis, tanpa shader real-time penuh untuk performa — boleh gunakan tekstur foil pre-baked atau shader sederhana).
- Badge jumlah duplikat (`x{quantity}`) di pojok kartu jika `quantity > 1`.
- Filter by rarity (dropdown/tab: Semua/Common/Rare/Epic/Legendary).
- Klik kartu → buka modal/drawer **Card Detail** menampilkan: nama, deskripsi, rarity, hypeScore, likesPerSec, quantity dimiliki, dan tombol aksi kontekstual:
  - Jika belum di showcase & showcase belum penuh → "Tambah ke Showcase".
  - Jika sedang di showcase → "Keluarkan dari Showcase".
  - Jika `quantity > 1` & tidak di showcase → "Jual ke Marketplace" (buka form harga, validasi range 0.5x–5x hypeScore di frontend sebelum submit) dan "Jual ke Sistem (Sell-to-Vault)" dengan harga vendor ditampilkan (`hypeScore * 0.3`).
- Jika inventory kosong (user belum pernah gacha) → `EmptyState` dengan CTA ke GachaShop.

### 9.4 `GachaShop.vue`
- Area kamera (`HandTracker.vue`) di satu sisi, area kartu/pack di sisi lain (stack secara vertikal di mobile).
- Banner onboarding (5.9) — tampil sekali per sesi.
- **Tombol fallback "Buka Pack (Tap)"** SELALU terlihat berdampingan dengan area kamera (Bagian 10) — bukan disembunyikan.
- Saat `/api/gacha` dipanggil (baik via gesture maupun tap): tampilkan loading state singkat → animasi buka pack (Three.js) → reveal kartu dengan shader sesuai rarity → tombol "Buka Lagi" / "Lihat di Binder".
- Tampilkan saldo coin saat ini & harga pack (100 coin) secara jelas — disable tombol jika `coins < 100` dengan pesan dari `INSUFFICIENT_FUNDS`.

### 9.5 `Marketplace.vue`
- Dua tab: **"Jelajahi"** (listing aktif dari semua pemain via `/api/market/listings`) dan **"Listing Saya"** (filter listing milik user sendiri, termasuk yang status `canceled`/`sold` untuk histori — atau cukup `active` saja untuk MVP, dengan tombol "Batalkan").
- Tab Jelajahi: filter by rarity, sort by harga (opsional Fase 1, boleh hardcode sort by `createdAt DESC`), pagination.
- Kartu listing menampilkan: gambar/render mini kartu, nama, rarity, harga, tombol "Beli" (disable jika `coins < price`, dengan tooltip alasan).
- Setelah beli sukses → toast konfirmasi + refresh saldo & listing.
- Error `MARKET_CONFLICT` (409) → toast "Kartu baru saja dibeli pemain lain!" + refresh listing otomatis.
- Error `FORBIDDEN_SYBIL_LOCK` → toast menjelaskan akun perlu berusia > 72 jam untuk membeli kartu jenis ini.
- Jika listing kosong → `EmptyState`.

### 9.6 `AdminCards.vue`
Lihat Bagian 11.3 untuk detail lengkap.

### 9.7 Navigasi (`NavBar.vue`)
- 4 menu utama: Dashboard, Binder, Gacha, Marketplace. Mobile: bottom nav bar dengan ikon. Desktop: top nav bar.
- Halaman `/admin` TIDAK muncul di nav utama — diakses via URL langsung.
- Logout: hapus token dari Pinia store, redirect ke `/login`.

---

## 9A. UI/UX Design System — Pokémon TCG Premium Standard (Amendment v4)

> **Ditambahkan setelah visual pivot ke estetika Pokémon TCG Pocket/Live.**
> Semua komponen UI yang dibangun/di-refactor HARUS mengikuti standar ini.

### 9A.1 Palet Warna

| Token | Hex | Fungsi |
|---|---|---|
| `surface-base` | `#070B1A` | Background utama (paling gelap) |
| `surface-card` | `#0C1428` | Panel/card background |
| `surface-elevated` | `#121E3D` | Navbar, elevated elements |
| `surface-overlay` | `rgba(7, 11, 26, 0.92)` | Modal overlay |
| `accent` | `#7C3AED` | Primary accent |
| `accent-glow` | `#8B5CF6` | Glow variant |
| `text-primary` | `#F1F5F9` | Heading text |
| `text-secondary` | `#94A3B8` | Body text |
| `text-muted` | `#475569` | Disabled/hint text |

**Rarity Colors (harus saturated & vibrant):**

| Rarity | Primary | Light | Glow |
|---|---|---|---|
| Common | `#94A3B8` | `#CBD5E1` | `rgba(148, 163, 184, 0.3)` |
| Rare | `#38BDF8` | `#7DD3FC` | `rgba(56, 189, 248, 0.4)` |
| Epic | `#A855F7` | `#C084FC` | `rgba(168, 85, 247, 0.5)` |
| Legendary | `#F59E0B` | `#FCD34D` | `rgba(245, 158, 11, 0.6)` |

### 9A.2 Tipografi

- **Display / Headings**: `Outfit` (Google Fonts), weight 600–800. Untuk judul, harga, nama kartu.
- **Body / UI**: `Inter` (Google Fonts), weight 400–600. Untuk body text, label, caption.
- Loaded via `<link>` di `index.html`.

### 9A.3 Glassmorphism Specification

| Elemen | `backdrop-filter` | `background` | `border` |
|---|---|---|---|
| Nav bar | `blur(16px)` | `rgba(12, 20, 40, 0.85)` | `1px solid rgba(255,255,255,0.06)` |
| Card panel | `blur(12px)` | `rgba(12, 20, 40, 0.7)` | `1px solid rgba(255,255,255,0.05)` |
| Modal | `blur(20px)` | `rgba(7, 11, 26, 0.9)` | `1px solid rgba(255,255,255,0.08)` |
| Toast | `blur(16px)` | rarity-specific alpha | `1px solid rarity-color/30` |

Semua glass panel WAJIB memiliki pseudo-element `::before` untuk inner light reflection line (gradient putih tipis di border atas, opacity 0.05–0.1).

### 9A.4 Card Visual Fidelity per Rarity

| Rarity | Shader | Tilt | Glow | Particles | Border |
|---|---|---|---|---|---|
| Common | `MeshStandardMaterial` (no shader) | ✅ basic | Subtle outer | ❌ | Silver solid |
| Rare | `MeshStandardMaterial` + shimmer | ✅ enhanced | Blue outer | ❌ | Blue gradient |
| Epic | `ShaderMaterial` holographic v2 | ✅ full 3D | Purple inner+outer | ✅ sparkles | Animated purple gradient |
| Legendary | `ShaderMaterial` holographic v2 + energy | ✅ full 3D + spring | Gold multi-layer | ✅ sparkles + wisps | Animated gold `conic-gradient` |

### 9A.5 Animasi System

| Animasi | Durasi | Easing | Konteks |
|---|---|---|---|
| Page transition | 300ms | `ease-out` | Route change |
| Card hover tilt | 200ms | spring (`0.08 damping`) | Pointer move |
| Button hover glow | 150ms | `ease` | Button hover |
| Card reveal (Common/Rare) | 1.5s | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Gacha reveal |
| Card reveal (Epic) | 2.5s | custom staged | Gacha reveal + light rays |
| Card reveal (Legendary) | 3.5s | custom staged + shake | Gacha reveal + explosion + confetti |
| Holographic sweep | 3s | `linear infinite` | Card idle |
| Glow breathe | 2.5s | `ease-in-out infinite` | Legendary ambient |

### 9A.6 STRICT FORBIDDEN

- ❌ Low-poly / flat design / UI generik kaku
- ❌ Warna polos tanpa gradient (tombol, panel, badge)
- ❌ Kartu tanpa interaksi tilt/parallax
- ❌ Gacha reveal tanpa animasi dramatis
- ❌ Text tanpa hierarki visual (semua ukuran/berat sama)

---

## 10. Spesifikasi Render 3D & Shader (`Card3D.vue`)

### 10.1 Geometri & Material
- Geometri: `new THREE.BoxGeometry(2.5, 3.5, 0.05)` — DIBUAT VIA KODE, bukan diimpor dari file. Sisi depan (`materials[4]` pada BoxGeometry) menampilkan tekstur dari `imageUrl` kartu.
- Common/Rare: material unlit (`MeshBasicMaterial`) dengan `map: texture` — hemat komputasi.
- Epic/Legendary: `ShaderMaterial` custom dengan fragment shader holografik berikut (Fresnel-based iridescence):

```glsl
uniform sampler2D baseTexture;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec4 baseColor = texture2D(baseTexture, vUv);
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);

  vec3 rainbowGlow = vec3(
    sin(fresnel * 6.28 + 0.0) * 0.5 + 0.5,
    sin(fresnel * 6.28 + 2.1) * 0.5 + 0.5,
    sin(fresnel * 6.28 + 4.2) * 0.5 + 0.5
  );

  gl_FragColor = vec4(mix(baseColor.rgb, rainbowGlow, fresnel * 0.5), baseColor.a);
}
```

### 10.2 Interaksi & Rotasi
- Kartu merespons pointer move (mouse/touch) untuk rotasi ringan (`rotation.x/y` mengikuti posisi kursor relatif ke center kartu, clamp ke range kecil misal ±0.3 rad) — efek "tilt" kartu fisik.

### 10.3 Pembersihan Memori (WAJIB)
```javascript
onBeforeUnmount(() => {
  scene.remove(cardMesh);
  cardGeometry.dispose();
  baseTexture.dispose();
  if (customShaderMaterial) customShaderMaterial.dispose();
  renderer.dispose();
});
```
Wajib diterapkan di SETIAP instance `Card3D.vue` (Binder bisa render puluhan kartu sekaligus — leak di sini fatal untuk mobile).

### 10.4 Mode Render Berbeda untuk Binder vs GachaShop
- **GachaShop** (1 kartu fokus): render full quality, animasi reveal lengkap, shader real-time.
- **Binder** (grid puluhan kartu): untuk performa, render shader Epic/Legendary HANYA pada kartu yang sedang di-hover/tap, atau gunakan static pre-rendered texture untuk thumbnail grid dan baru aktifkan shader penuh saat modal detail dibuka.

---

## 11. Hand Tracking, Fallback & Admin Panel

### 11.1 `HandTracker.vue` — Gesture Detection
- Lazy-load MediaPipe Hands HANYA saat `GachaShop.vue` di-mount (`onMounted`), unload saat `onBeforeUnmount`.
- Baca 21 landmark tangan @ ~30fps. Hitung jarak Euclidean antara landmark 4 (thumb tip) dan landmark 8 (index tip).
- Jarak `< threshold` → status "mencubit" (pinch). Lacak kecepatan vertikal (sumbu Y) — penurunan tajam saat pinch aktif → emit event `gacha-trigger`.
- Jika `getUserMedia()` gagal (permission denied / no camera / unsupported browser) → emit event `camera-unavailable`, JANGAN tampilkan error blocking — biarkan tombol tap (11.2) jadi satu-satunya cara.

### 11.2 Fallback Tap-to-Open (WAJIB)
- `GachaShop.vue` SELALU menampilkan tombol **"Buka Pack"** terlepas dari status kamera. Baik gesture maupun tap memanggil `POST /api/gacha` yang sama, lalu animasi reveal yang identik.
- Kamera = enhancement opsional, bukan gate wajib untuk gameplay inti.

### 11.3 Admin Card Management

**Prinsip**: tambah kartu = upload 1 gambar 2D + isi metadata. Tidak ada proses 3D modeling.

**Storage**: Vercel Blob (`@vercel/blob`), path `cards/{slug-nama}-{timestamp}.webp`. Env var `BLOB_READ_WRITE_TOKEN`.

**Auth Admin**: `ADMIN_SECRET` (env var, bukan di DB). Middleware `requireAdmin.js` cek header `Authorization: Bearer <ADMIN_SECRET>` exact-match → `403 FORBIDDEN` jika gagal. Login admin (`/api/admin/login`) set cookie httpOnly `admin_session` (signed, expiry 12 jam) untuk persistensi sesi di `AdminCards.vue`.

**Endpoint** (detail di Bagian 7 tabel):
- `POST /api/admin/cards`: terima `multipart/form-data` (field `image` + metadata). Validasi file: `image/webp` atau `image/png`, maks 2MB. Resize via `sharp` ke rasio ~2.5:3.5. Upload ke Blob → `imageUrl`. Insert `master_cards` dengan `isPlaceholderImage = false`.
- `PATCH /api/admin/cards/:id`: partial update. Jika ada file baru, replace `imageUrl` & hapus blob lama.
- `DELETE /api/admin/cards/:id`: soft-delete (`isActive = false`). Kartu yang sudah dimiliki pemain TETAP valid (foreign key tidak rusak), hanya tidak muncul lagi di pool gacha baru (lihat guard 5.3 poin 6 — query gacha WAJIB filter `isActive = true`).

**`AdminCards.vue`** (route `/admin`, TIDAK di nav utama):
1. Form login → `/api/admin/login`.
2. Tabel kartu (`/api/admin/cards` GET): thumbnail, nama, rarity, hypeScore, likesPerSec, status aktif, badge "Placeholder" jika `isPlaceholderImage = true`.
3. Form tambah/edit: upload gambar (drag-drop) + field metadata + **live preview** menggunakan `Card3D.vue` yang sama (WYSIWYG shader foil).
4. Tombol nonaktifkan per baris.
5. **Highlight kartu hasil AI yang masih placeholder** (dari `cron-trends.js`) supaya admin tahu mana yang perlu dilengkapi gambarnya.

---

## 12. Cron Job AI Content Generation (`cron-trends.js`)

### 12.1 Trigger & Auth
- Vercel Cron, schedule `0 */12 * * *` (setiap 12 jam).
- Validasi header `Authorization: Bearer <CRON_SECRET>` — jika tidak cocok, `401`.

### 12.2 Idempotency (WAJIB)
- Sebelum generate: cek tabel `cron_runs` — `SELECT * FROM cron_runs WHERE jobName = 'cron-trends' AND ranAt > NOW() - INTERVAL '11 hours'`. Jika ada hasil → skip, return `200 { message: "Skipped, already ran recently" }`.
- Jika lanjut: insert row baru ke `cron_runs` di AWAL eksekusi (sebelum panggil Gemini) untuk mencegah duplikasi jika terjadi timeout & retry.

### 12.3 Generasi Konten via Gemini
- System prompt eksplisit: hasilkan SATU konsep "kucing meme fiksi" aman untuk segala umur, Bahasa Indonesia santai, TIDAK menyebut merek/brand/figur publik nyata. Format output WAJIB JSON murni: `{ name, description, rarity }`.
- Mapping otomatis berdasarkan `rarity` hasil generate → `hypeScore`/`likesPerSec` sesuai tabel 5.2.
- `imageUrl` = placeholder sesuai rarity (Bagian 13), `isPlaceholderImage = true`, `isActive = true`.

### 12.4 Validasi & Moderasi Pasca-Generate
- `name`: 3–50 karakter, hanya huruf/angka/spasi/tanda baca dasar, DAN harus unik (kolom `name` punya UNIQUE constraint — gunakan `ON CONFLICT (name) DO NOTHING` saat insert, atau cek dulu).
- `description`: 10–255 karakter.
- `rarity`: harus salah satu dari 4 enum valid; jika tidak, default `Common`.
- Blocklist kata sederhana (array kata terlarang) — jika `name`/`description` mengandung kata terlarang, SKIP insert & log error, jangan retry dalam run yang sama.
- Jika parsing JSON dari Gemini gagal → log error, return `200` tanpa insert (tidak retry otomatis).

---

## 13. Asset Pipeline — Gambar Kartu

- **TIDAK ADA 3D modeling/export** dalam proyek ini. Semua "kartu 3D" dibentuk dari geometri kotak (kode) + tekstur 2D (gambar).
- **Seed awal**: 4 file placeholder di `/src/assets/cards/placeholders/` — satu per rarity, dengan border warna berbeda (abu-abu/biru/ungu/emas) sebagai indikator visual rarity sebelum admin upload gambar asli.
- **Kartu AI (`cron-trends`)**: pakai placeholder sesuai rarity, `isPlaceholderImage = true`, sampai admin lengkapi via `/admin`.
- **Kartu admin manual**: selalu `isPlaceholderImage = false`, gambar di Vercel Blob.

---

## 14. Hardening & Standar Operasional (Ringkasan Konsolidasi)

| Area | Aturan |
|---|---|
| Transaction isolation | `READ COMMITTED` + `SELECT ... FOR UPDATE` pada baris `users`/`marketplace_listings` untuk SEMUA endpoint yang mengubah `coins` atau `status` listing. |
| Error response | Format `{ message, code }` konsisten (Bagian 7.1). Error 500: log detail server-side, response generic ke client. |
| `isAccountBound` lifecycle | Saat kartu bound berhasil dibeli oleh user lain yang memenuhi syarat (>72 jam), `isAccountBound` pada baris inventory PEMBELI menjadi `false`. Baris penjual dikurangi quantity (hapus jika 0). |
| `tradeLockedUntil` | Diset `NOW() + 24h` pada baris inventory PEMBELI setiap kali `/api/market/buy` sukses. `/api/market/list` menolak (`TRADE_LOCKED`) jika `tradeLockedUntil > NOW()`. |
| CORS | `vercel.json` — `Access-Control-Allow-Origin` harus domain spesifik produksi, BUKAN string `"self"` (invalid). |
| Caching | `/api/master-cards`: header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`. |
| Camera fallback | Tombol tap SELALU tersedia (Bagian 11.2) — kamera tidak boleh jadi hard requirement. |

---

## 15. Konfigurasi Deployment

### 15.1 `vercel.json`
```json
{
  "version": 2,
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://memecats.example.com" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PATCH, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/" }
  ],
  "crons": [
    { "path": "/api/cron-trends", "schedule": "0 */12 * * *" }
  ]
}
```
> Ganti `https://memecats.example.com` dengan domain produksi final sebelum deploy.

### 15.2 Environment Variables (`.env.example`)

| Variable | Deskripsi |
|---|---|
| `DATABASE_URL` | Connection string Neon Postgres |
| `JWT_SECRET` | Secret signing JWT (min. 32 karakter random) |
| `CRON_SECRET` | Bearer token untuk `/api/cron-trends` |
| `GEMINI_API_KEY` | API key `@google/generative-ai` |
| `ADMIN_SECRET` | Bearer token endpoint admin |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob |
| `NODE_ENV` | `development` / `production` |

> Fase 2 (belum dipakai): `TELEGRAM_BOT_TOKEN`, `GOOGLE_CLIENT_ID` — JANGAN ditambahkan sekarang.

### 15.3 Dependencies Tambahan (`package.json`)
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.23.0",
    "@vercel/blob": "^0.27.0",
    "sharp": "^0.33.0",
    "pinia": "^2.1.7",
    "vue-router": "^4.3.0"
  }
}
```
(Gabungkan dengan dependencies existing dari PRD awal: `vue`, `three`, `@mediapipe/hands`, `@neondatabase/serverless`, `drizzle-orm`, `canvas-confetti`, `@google/generative-ai`, dll.)

### 15.4 Seed Data (`api/db/seed.js`)
Script idempotent (`ON CONFLICT (name) DO NOTHING`) yang menginsert minimal:
- 8 kartu Common (hypeScore 50, likesPerSec 0.8)
- 6 kartu Rare (hypeScore 200, likesPerSec 2.5)
- 4 kartu Epic (hypeScore 400, likesPerSec 6.5)
- 2 kartu Legendary (hypeScore 800, likesPerSec 15.0)

Semua bertema "kucing meme viral" (contoh nama: "Crying Cat", "Vibing Cat", "CEO Cat", "Galaxy Brain Cat", "Sigma Cat", "Sad Hamster Cat"), `imageUrl` = placeholder sesuai rarity, `isPlaceholderImage = true`, `isActive = true`.

---

## 16. Fase 2 — Catatan untuk Nanti (TIDAK DIKERJAKAN SEKARANG)

Daftar ini HANYA untuk konteks jangka panjang. Jangan buat kode/skema untuk poin-poin ini di iterasi sekarang:

- **Login eksternal** (Google/Telegram) — account linking via `users.platformId` (Bagian 6.6).
- **Premium currency** (gems/diamond) untuk gacha premium — akan butuh kolom baru di `users` dan tabel transaksi pembayaran.
- **Leaderboard global** (top likes/sec, top coins, top collector) — endpoint baru `/api/leaderboard`, query agregat.
- **Daily login bonus** terpisah dari idle claim — tabel `daily_claims` baru.
- **Pity system** gacha (guaranteed rare setelah N pull tanpa hasil bagus) — counter tambahan per user.
- **Generative image API** untuk kartu AI (menggantikan placeholder) — pertimbangan biaya per-call.

---

## 17. FASE EKSEKUSI UNTUK AGENTIC AI

> **Aturan utama**: Kerjakan fase secara BERURUTAN (0 → 13). Setiap fase punya **Tujuan**, **Dependency**, **Task List**, dan **Definition of Done (DoD)**. JANGAN memulai fase berikutnya sebelum DoD fase sebelumnya terpenuhi. Tujuan akhir SATU ARAH: produk jalan end-to-end sesuai Bagian 1–16, tanpa fitur Fase 2 (Bagian 16).

---

### FASE 0 — Project Setup & Scaffolding

**Tujuan**: Kerangka proyek siap, semua tooling terkonfigurasi, struktur folder sesuai Bagian 3.

**Dependency**: Tidak ada (titik awal).

**Tasks**:
1. Inisialisasi proyek Vite + Vue 3 (Composition API) + Tailwind CSS.
2. Buat seluruh struktur folder kosong sesuai Bagian 3 (boleh dengan file placeholder `.gitkeep` atau komponen kosong).
3. Tulis `package.json` final (gabungan dependencies PRD awal + Bagian 15.3).
4. Tulis `vite.config.js` (alias `@`, proxy `/api` ke port 3000).
5. Tulis `vercel.json` sesuai Bagian 15.1.
6. Tulis `.env.example` sesuai Bagian 15.2.
7. Setup Tailwind config dasar (warna tema per rarity: abu-abu/biru/ungu/emas untuk Common/Rare/Epic/Legendary — dipakai konsisten di seluruh UI).
8. Install semua dependencies (`npm install`).

**Definition of Done**:
- `npm run dev` berjalan tanpa error, menampilkan halaman Vue default/kosong.
- Struktur folder persis sesuai Bagian 3.
- `.env.example` lengkap sesuai Bagian 15.2.

---

### FASE 1 — Database Layer

**Tujuan**: Skema database final ter-deploy ke Neon, seed data siap.

**Dependency**: Fase 0.

**Tasks**:
1. Tulis `api/db/schema.js` PERSIS sesuai Bagian 4 (5 tabel + relations).
2. Tulis `api/db/client.js` (koneksi Neon HTTP + Drizzle, sesuai pola PRD awal).
3. Jalankan `drizzle-kit push:pg` (atau `db:push`) untuk membuat tabel di Neon.
4. Eksekusi SQL `ALTER TABLE ... CHECK` dari Bagian 4.1 secara manual via Neon console atau migration script.
5. Tulis `api/db/seed.js` sesuai Bagian 15.4 (20 kartu, idempotent via `ON CONFLICT (name) DO NOTHING`).
6. Jalankan seed script, verifikasi data masuk (query `SELECT rarity, COUNT(*) FROM master_cards GROUP BY rarity` harus menunjukkan 8/6/4/2).

**Definition of Done**:
- Tabel `users`, `master_cards`, `user_inventory`, `marketplace_listings`, `cron_runs` ada di Neon dengan kolom sesuai Bagian 4.
- CHECK constraints aktif (coba insert nilai negatif harus gagal).
- `master_cards` berisi 20 baris seed dengan distribusi rarity benar, `isPlaceholderImage=true`, `isActive=true`.

---

### FASE 2 — Backend Core Library (`api/_lib/`)

**Tujuan**: Helper terpusat siap dipakai semua endpoint — auth, validasi, error format, rate limit.

**Dependency**: Fase 1.

**Tasks**:
1. `api/_lib/jwt.js`: fungsi `signToken({userId, username})` (expiry 7 hari) dan `verifyToken(token)`.
2. `api/_lib/requireAuth.js`: middleware yang membaca header `Authorization: Bearer <token>`, verifikasi via `jwt.js`, inject `req.userId` dan `req.username`. Return `401 UNAUTHORIZED` jika gagal.
3. `api/_lib/requireAdmin.js`: middleware cek header `Authorization: Bearer <ADMIN_SECRET>` exact-match terhadap `process.env.ADMIN_SECRET`. Return `403 FORBIDDEN` jika gagal.
4. `api/_lib/schemas.js`: SEMUA skema Zod dari Bagian 8 (copy persis).
5. `api/_lib/errors.js`: helper `sendError(res, status, code, message)` yang mengembalikan format `{ message, code }` konsisten (Bagian 7.1), dan helper logging error 500 (`console.error` dengan timestamp + context, TANPA expose stack trace ke client).
6. `api/_lib/rateLimit.js`: in-memory token bucket sederhana, fungsi `checkRateLimit(key, maxRequests, windowMs)` yang return `true`/`false`. Terapkan sesuai tabel limit di Bagian 6.4 (akan dipanggil dari masing-masing endpoint di fase selanjutnya).

**Definition of Done**:
- Semua 5 file di `api/_lib/` lengkap dan dapat diimpor tanpa error.
- `signToken`/`verifyToken` bisa di-roundtrip-test (sign → verify → dapat payload sama).
- `sendError` menghasilkan JSON `{ message, code }` dengan status HTTP yang benar.

---

### FASE 3 — Endpoint Autentikasi

**Tujuan**: User bisa register, login, dan mengambil profil sendiri via JWT.

**Dependency**: Fase 1, Fase 2.

**Tasks**:
1. `api/auth/register.js` (`POST`): validasi `registerSchema`, cek username unik (lowercase), hash password (`bcryptjs` cost 10), insert user (`coins=500`), sign JWT, return `201` sesuai Bagian 6.1. Terapkan rate limit `5x/menit per IP`.
2. `api/auth/login.js` (`POST`): validasi `loginSchema`, cari user (lowercase), `bcrypt.compare`, error generik `INVALID_CREDENTIALS` jika gagal, sign JWT jika sukses. Terapkan rate limit `5x/menit per IP DAN per username`.
3. `api/me.js` (`GET`, `requireAuth`): return profil user (`id, username, coins, avatarUrl, createdAt, lastClaimedAt`) — JANGAN return `passwordHash`.

**Definition of Done**:
- `curl -X POST /api/auth/register -d '{"username":"testcat","password":"meow1234"}'` → `201` + token valid.
- Login dengan kredensial sama → `200` + token valid.
- Login dengan password salah → `401 INVALID_CREDENTIALS` (pesan sama untuk username tidak ada).
- `GET /api/me` dengan token valid → `200` dengan data user, TANPA field `passwordHash`.
- Register username yang sama dua kali → `409 USERNAME_TAKEN`.

---

### FASE 4 — Core Game Loop Endpoints

**Tujuan**: Loop inti (gacha → showcase → idle claim → inventory → sell-to-vault) berfungsi penuh via API.

**Dependency**: Fase 1–3.

**Tasks**:
1. `api/master-cards.js` (`GET`, publik): return semua `master_cards WHERE isActive=true`, support `?rarity=` filter, set header cache (Bagian 14).
2. `api/gacha.js` (`POST`, `requireAuth`, rate limit 30x/menit): implementasi PERSIS sesuai Bagian 5.3 (transaksi, lock baris, guard pool kosong, isAccountBound, upsert inventory).
3. `api/inventory.js` (`GET`, `requireAuth`): join `user_inventory` + `master_cards`, return sesuai Bagian 7 tabel.
4. `api/inventory.js` tambahan route/handler untuk `POST /api/inventory/sell` (`requireAuth`): implementasi sesuai Bagian 5.6 (sell-to-vault).
5. `api/showcase.js` (`POST`, `requireAuth`): implementasi sesuai Bagian 5.5 (validasi maks 5, ownership check).
6. `api/claim-idle.js` (`POST`, `requireAuth`, rate limit 10x/menit): implementasi PERSIS sesuai Bagian 5.4 (termasuk edge case showcase kosong & `Math.max(0, ...)` clock skew guard).

**Definition of Done** (test manual via curl/Postman dengan 1 user):
- Gacha berkurang 100 coin, dapat 1 kartu, masuk inventory (`quantity=1` jika baru, atau `quantity+=1` jika duplikat).
- Gacha dengan `coins < 100` → `400 INSUFFICIENT_FUNDS`, coin TIDAK berkurang.
- Showcase: tambah kartu ke-6 → `400 SHOWCASE_FULL`.
- Claim idle sebelum 10 detik sejak `lastClaimedAt` → `400 COOLDOWN_ACTIVE`.
- Claim idle dengan showcase kosong → `200`, `coinsEarned: 0`, `lastClaimedAt` terupdate.
- Claim idle dengan 1+ kartu di showcase setelah delay → `coinsEarned > 0` sesuai formula.
- Sell-to-vault kartu yang sedang di showcase → `403 CARD_IN_SHOWCASE`.
- Sell-to-vault kartu duplikat → coin bertambah sesuai `hypeScore * 0.3`, `quantity` berkurang.

---

### FASE 5 — Marketplace Endpoints

**Tujuan**: Transaksi P2P (list, buy, cancel, browse) berfungsi dengan atomic locking & semua aturan anti-cheat.

**Dependency**: Fase 1–4.

**Tasks**:
1. `api/market/listings.js` (`GET`, publik): join `marketplace_listings WHERE status='active'` + `master_cards`, pagination & filter rarity sesuai `marketListingsQuerySchema`.
2. `api/market/list.js` (`POST`, `requireAuth`): validasi `marketListSchema`, cek ownership inventory, cek `tradeLockedUntil` (→ `403 TRADE_LOCKED`), cek harga dalam range `hypeScore*0.5` – `hypeScore*5.0` (→ `400 PRICE_OUT_OF_RANGE`), kurangi 1 quantity dari inventory, insert listing `status='active'`.
3. `api/market/buy.js` (`POST`, `requireAuth`, rate limit 20x/menit): implementasi atomic flow PERSIS sesuai diagram D di PRD awal — termasuk:
   - Cek `buyerId != sellerId` (→ `400`).
   - Cek saldo buyer cukup (→ `400 INSUFFICIENT_FUNDS`).
   - Cek sybil: jika `isAccountBound=true` pada kartu DAN `(NOW() - buyer.createdAt) < 72h` → `403 FORBIDDEN_SYBIL_LOCK`.
   - Atomic update `status='active'→'sold'` dengan rows-affected check → `409 MARKET_CONFLICT` jika gagal (sudah dibeli orang lain).
   - Split 5% pajak, transfer net ke seller, transfer kartu ke `user_inventory` buyer (set `isAccountBound=false` jika sebelumnya `true` & syarat terpenuhi — Bagian 14), set `tradeLockedUntil = NOW()+24h` pada baris buyer.
4. `api/market/cancel.js` (`POST`, `requireAuth`): validasi ownership listing & `status='active'`, set `status='canceled'`, kembalikan kartu ke inventory seller (increment quantity, tetap hormati `tradeLockedUntil` jika ada).

**Definition of Done** (test dengan 2 user A & B):
- A list kartu dengan harga di luar range 0.5x–5x hypeScore → `400 PRICE_OUT_OF_RANGE`.
- A list kartu valid → muncul di `/api/market/listings`.
- B beli listing A → A dapat 95% harga (setelah pajak), B dapat kartu, listing `status='sold'`.
- B coba beli listing yang sama lagi (simulasi race) → `409 MARKET_CONFLICT`.
- A coba list kartu yang baru dibeli B dalam 24 jam (dari sisi B) → `403 TRADE_LOCKED`.
- User baru (<72 jam) coba beli kartu `isAccountBound=true` → `403 FORBIDDEN_SYBIL_LOCK`.
- A cancel listing aktif → kartu kembali ke inventory A, `status='canceled'`.

---

### FASE 6 — Frontend Foundation (Routing, State, Layout)

**Tujuan**: Kerangka SPA siap — routing, auth guard, state management, layout dasar.

**Dependency**: Fase 3 (butuh endpoint auth untuk testing).

**Tasks**:
1. `src/stores/auth.js` (Pinia): state `token`, `user`; actions `register()`, `login()`, `logout()`, `fetchMe()`. Token disimpan di memori (Pinia state), TIDAK `localStorage`.
2. `src/stores/player.js` (Pinia): state `coins`, `inventory`, `showcase`, `masterCards`; actions untuk fetch & sync dari API setelah aksi gacha/claim/showcase/market.
3. `src/router/index.js`: routes `/login`, `/register`, `/` (Dashboard), `/binder`, `/gacha`, `/market`, `/admin`. Auth guard: redirect ke `/login` jika `token` kosong dan route bukan `/login`/`/register`. Route `/admin` TIDAK pakai auth guard user (pakai auth admin sendiri di Fase 10).
4. `src/components/NavBar.vue`: 4 menu (Dashboard, Binder, Gacha, Marketplace) + tombol logout, responsive (bottom bar mobile, top bar desktop).
5. `src/components/EmptyState.vue`: komponen reusable (ikon/ilustrasi + pesan + CTA button opsional).
6. `src/components/CoinDisplay.vue` + utility `formatNumber` (Bagian 5.7).
7. `src/views/Login.vue` & `src/views/Register.vue` sesuai Bagian 9.1.
8. `src/App.vue` & `src/main.js`: setup Pinia, Router, render `NavBar` + `<router-view>`.

**Definition of Done**:
- Buka `/`, jika belum login → redirect `/login`.
- Register via UI → berhasil, redirect ke `/gacha` (sesuai onboarding 5.9), token tersimpan di store.
- Logout → token hilang, redirect `/login`.
- Navigasi antar 4 menu utama berfungsi (boleh masih halaman kosong/placeholder di fase ini).

---

### FASE 7 — Core Game Views (Dashboard & Binder)

**Tujuan**: Dashboard dan Binder berfungsi penuh sesuai Bagian 9.2 & 9.3, terhubung ke Fase 4.

**Dependency**: Fase 4, Fase 6.

**Tasks — Dashboard**:
1. Header: username, `CoinDisplay` total coin, Card Dex progress (Bagian 5.8 — hitung dari `inventory` + `masterCards` di `player` store).
2. Tombol Klaim Idle: hitung estimasi real-time (`totalLikesPerSec * secondsElapsed`, update tiap detik via `setInterval`), countdown 10 detik cooldown, panggil `/api/claim-idle` saat diklik, tampilkan hasil via toast.
3. 5 slot showcase: render kartu terisi (boleh versi sederhana di fase ini, render 3D penuh di Fase 8), slot kosong = placeholder "+" → navigasi ke Binder.
4. Jika showcase kosong: `EmptyState` sesuai Bagian 5.4 poin 7.

**Tasks — Binder**:
1. Grid kartu dari `player.inventory`, badge `x{quantity}` untuk duplikat.
2. Filter rarity (tab/dropdown).
3. Modal/drawer Card Detail (klik kartu): nama, deskripsi, rarity, hypeScore, likesPerSec, quantity, dan tombol aksi kontekstual sesuai Bagian 9.3 (Tambah/Keluarkan Showcase, Jual ke Marketplace — buka form harga dengan validasi range di client, Sell-to-Vault dengan harga vendor ditampilkan).
4. `EmptyState` jika inventory kosong, CTA ke `/gacha`.

**Definition of Done**:
- Dashboard menampilkan data real dari API, tombol claim idle berfungsi dengan cooldown visual.
- Binder menampilkan semua kartu dimiliki, filter rarity berfungsi.
- Toggle showcase dari Binder langsung terefleksi di Dashboard (state sync via `player` store).
- Sell-to-vault & list-to-market dari Binder berfungsi end-to-end (memanggil API Fase 4/5).

---

### FASE 8 — 3D Rendering & Gacha Experience

**Tujuan**: `Card3D.vue` dan `GachaShop.vue` berfungsi penuh — termasuk shader, gesture, dan fallback tap.

**Dependency**: Fase 4, Fase 6, Fase 7 (untuk navigasi pasca-gacha).

**Tasks**:
1. `Card3D.vue`: implementasi geometri, material, shader sesuai Bagian 10.1, interaksi tilt (10.2), cleanup `onBeforeUnmount` (10.3). Buat prop untuk mode render (`full` untuk GachaShop, `mini` untuk Binder grid sesuai 10.4).
2. `HandTracker.vue`: lazy-load MediaPipe (11.1), deteksi gesture pinch+pull, emit `gacha-trigger`, deteksi `camera-unavailable`.
3. `GachaShop.vue`: layout kamera + area pack, banner onboarding (5.9, sekali per sesi via Pinia flag), tombol "Buka Pack" SELALU TAMPIL (11.2), animasi buka pack (Three.js + `canvas-confetti`) → reveal `Card3D.vue` dengan shader sesuai rarity hasil `/api/gacha`, tombol "Buka Lagi"/"Lihat di Binder", disable tombol jika `coins < 100` dengan pesan `INSUFFICIENT_FUNDS`.
4. Setelah pull pertama (cek via flag onboarding) → tampilkan tooltip arahan ke Binder (5.9).

**Definition of Done**:
- Buka `/gacha` dengan kamera diizinkan → gesture pinch+pull memicu `/api/gacha` dan animasi reveal.
- Buka `/gacha` dengan kamera ditolak/tidak ada → tombol tap tetap berfungsi penuh, tidak ada error blocking.
- Kartu Epic/Legendary menampilkan shader foil bergerak; Common/Rare tampilan flat.
- Navigasi cepat masuk-keluar `/gacha` berkali-kali TIDAK menyebabkan memory leak (verifikasi via DevTools Memory profiler — jumlah geometry/texture tidak terus naik).

---

### FASE 9 — Marketplace UI

**Tujuan**: `Marketplace.vue` berfungsi penuh sesuai Bagian 9.5, terhubung ke Fase 5.

**Dependency**: Fase 5, Fase 6, Fase 7 (reuse Card Detail pattern).

**Tasks**:
1. Tab "Jelajahi": list dari `/api/market/listings`, filter rarity, pagination, tombol "Beli" (disable jika saldo kurang).
2. Tab "Listing Saya": listing milik user (`status='active'`), tombol "Batalkan" → `/api/market/cancel`.
3. Handle semua error code dari Bagian 7.1 yang relevan (`MARKET_CONFLICT`, `FORBIDDEN_SYBIL_LOCK`, `INSUFFICIENT_FUNDS`, `TRADE_LOCKED`) dengan toast yang jelas, auto-refresh listing setelah `MARKET_CONFLICT`.
4. `EmptyState` jika listing kosong.

**Definition of Done**:
- Beli kartu dari listing lain → saldo & inventory terupdate, listing hilang dari tab Jelajahi.
- Cancel listing sendiri → kartu kembali ke Binder, listing hilang dari tab Listing Saya.
- Semua skenario error di Fase 5 DoD menampilkan pesan yang sesuai di UI (bukan generic "error").

---

### FASE 10 — Admin Panel

**Tujuan**: Admin bisa login, melihat, menambah, edit, dan menonaktifkan kartu — termasuk upload gambar.

**Dependency**: Fase 1, Fase 2, Fase 4 (skema & query pool gacha harus filter `isActive`).

**Tasks**:
1. Setup Vercel Blob: tambahkan `@vercel/blob`, konfigurasi `BLOB_READ_WRITE_TOKEN`.
2. `api/admin/login.js`: validasi `adminLoginSchema`, bandingkan dengan `ADMIN_SECRET`, set cookie httpOnly `admin_session`.
3. `api/admin/cards.js`: implementasi GET (list + pagination), POST (upload gambar via `sharp` resize → Blob → insert dengan `isPlaceholderImage=false`), PATCH `:id` (partial update + replace gambar jika ada), DELETE `:id` (soft-delete `isActive=false`). Semua dibungkus `requireAdmin`.
4. **PENTING**: Update `api/gacha.js` (Fase 4) — pastikan query pool SELALU filter `WHERE isActive = true` (jika belum).
5. `src/views/AdminCards.vue` (route `/admin`, tidak di NavBar): form login, tabel kartu dengan badge "Placeholder", form tambah/edit dengan upload + live preview `Card3D.vue`, tombol nonaktifkan.

**Definition of Done**:
- Login admin dengan secret salah → `403 FORBIDDEN`.
- Upload kartu baru via form → muncul di tabel, gambar tersimpan di Blob, `isPlaceholderImage=false`.
- Kartu baru muncul sebagai kemungkinan hasil gacha (`/api/gacha` bisa mengembalikannya).
- Nonaktifkan kartu → tidak muncul lagi di hasil gacha baru, TAPI kartu yang sudah dimiliki pemain (dari sebelumnya) tetap utuh di inventory mereka.

---

### FASE 11 — AI Cron Content Generation

**Tujuan**: `cron-trends.js` berjalan otomatis tiap 12 jam, generate kartu baru via Gemini dengan idempotency & moderasi.

**Dependency**: Fase 1, Fase 10 (kartu hasil cron tampil di Admin untuk dilengkapi gambarnya).

**Tasks**:
1. `api/cron-trends.js`: validasi `CRON_SECRET`.
2. Cek `cron_runs` untuk idempotency (Bagian 12.2) — insert row baru di awal sebelum panggil Gemini.
3. Panggil Gemini API dengan system prompt sesuai Bagian 12.3, parse JSON response.
4. Validasi & moderasi sesuai Bagian 12.4 (panjang, blocklist, unique name, rarity enum fallback).
5. Insert ke `master_cards` dengan `isPlaceholderImage=true`, `isActive=true`, `imageUrl` = placeholder sesuai rarity.
6. Daftarkan di `vercel.json` crons (sudah ada di Fase 0, verifikasi schedule benar).

**Definition of Done**:
- Trigger manual `GET /api/cron-trends` dengan `CRON_SECRET` benar → insert 1 kartu baru (placeholder), `cron_runs` bertambah 1 row.
- Trigger lagi dalam 11 jam → `200 { message: "Skipped, already ran recently" }`, TIDAK ada kartu baru.
- Kartu baru hasil cron muncul di `/admin` dengan badge "Placeholder".
- Coba dengan `CRON_SECRET` salah → `401`.

---

### FASE 12 — Polish, Hardening & QA Akhir

**Tujuan**: Audit silang seluruh sistem terhadap spesifikasi Bagian 1–16, pastikan tidak ada gap tersisa.

**Dependency**: Fase 0–11 (semua fase sebelumnya selesai).

**Tasks**:
1. Audit rate limiting (Bagian 6.4) sudah terpasang di SEMUA endpoint yang relevan.
2. Audit format error (`{message, code}`) konsisten di SEMUA endpoint, error 500 tidak expose stack trace.
3. Audit transaction isolation (`SELECT ... FOR UPDATE`) di SEMUA endpoint yang mengubah `coins`/`status` listing.
4. Audit `CoinDisplay`/`formatNumber` dipakai konsisten di semua tampilan angka (Dashboard, Binder, Marketplace, Card Detail).
5. Audit SEMUA `EmptyState` (Binder kosong, Marketplace kosong, hasil filter kosong) sudah ada.
6. Audit memory cleanup `Card3D.vue` — test navigasi berulang Dashboard ↔ Binder ↔ GachaShop, pastikan tidak ada leak.
7. Audit onboarding flow (5.9) — alur user baru dari register sampai kartu pertama masuk showcase mulus tanpa dead-end.
8. Audit CHECK constraints DB (Bagian 4.1) — test insert nilai invalid harus gagal di level DB.
9. Audit semua skenario error code di Bagian 7.1 — pastikan setiap code benar-benar bisa terjadi dan ditangani UI dengan pesan yang sesuai (tidak ada "generic error" untuk skenario yang sudah diketahui).
10. Review responsivitas mobile untuk semua view (terutama `GachaShop` dengan area kamera).

**Definition of Done**:
- Checklist 1–10 di atas semua tercek tanpa temuan kritis.
- Smoke test end-to-end: register → gacha beberapa kali → isi showcase → claim idle → jual duplikat (market & vault) → beli dari user lain → admin tambah kartu baru → kartu baru muncul di gacha — SEMUA berjalan tanpa error tak tertangani.

---

### FASE 13 — Deployment

**Tujuan**: Aplikasi live di Vercel dengan domain produksi, semua env var terkonfigurasi.

**Dependency**: Fase 0–12.

**Tasks**:
1. Buat project Neon Postgres production, jalankan `db:push` + seed (Fase 1) di environment production.
2. Setup Vercel project, hubungkan repo, konfigurasi SEMUA env var dari Bagian 15.2 di Vercel dashboard (Production + Preview).
3. Setup Vercel Blob store, hubungkan `BLOB_READ_WRITE_TOKEN`.
4. Update `vercel.json` — ganti `https://memecats.example.com` dengan domain produksi final.
5. Deploy ke production.
6. Smoke test production: register user baru, lakukan satu siklus gacha → showcase → idle claim → market, verifikasi cron job terdaftar di Vercel dashboard (cek tab Cron Jobs).
7. Test akses `/admin` dengan `ADMIN_SECRET` production.

**Definition of Done**:
- Aplikasi dapat diakses publik di domain produksi.
- Semua env var aktif (tidak ada error "missing environment variable" di log Vercel).
- Cron job `cron-trends` terjadwal dan tampil di Vercel dashboard.
- Smoke test poin 6–7 berhasil tanpa error.

---

## 18. Penutup

Dokumen ini (v3) adalah **satu-satunya sumber kebenaran** untuk pembangunan MemeCats: The Viral Collection Fase 1. Setiap keputusan desain, skema, endpoint, dan urutan kerja sudah didefinisikan secara eksplisit untuk meminimalkan ambiguitas bagi agentic coding AI. Fitur-fitur di Bagian 16 (Fase 2) sengaja TIDAK dimasukkan ke Fase Eksekusi — fokus saat ini adalah menyelesaikan game inti yang stabil, aman, dan dapat diperluas kontennya oleh admin tanpa coding ulang.
