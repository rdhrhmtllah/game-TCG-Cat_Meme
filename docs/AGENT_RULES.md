# AGENT RULES — MemeCats: The Viral Collection

> File ini berisi aturan kerja yang berlaku SELAMA SELURUH PROYEK,
> di SETIAP sesi (baik sesi pertama maupun lanjutan/handoff).
> Dibuat agar prompt untuk sesi handoff bisa singkat tanpa kehilangan aturan.

## Dokumen Rujukan

- `docs\MASTER-PRD-MemeCats.md` — single source of truth teknis. Baca penuh
  (Bagian 0–18) sebelum menulis kode apa pun jika belum pernah dibaca
  di sesi ini.
- `docs\AGENT_HANDOFF.md` — status progres lintas-sesi. WAJIB dibaca pertama
  setiap sesi untuk tahu fase aktif, kredensial yang tersedia, dan
  catatan dari agent sebelumnya.

## Cara Kerja

1. Kerjakan "Bagian 17 — Fase Eksekusi" PRD secara BERURUTAN, mulai dari
   fase yang tercatat sebagai aktif di `docs\AGENT_HANDOFF.md`. Jangan lompat
   fase, jangan kerjakan beberapa fase paralel.
2. Setiap fase punya Tujuan, Dependency, Task List, dan Definition of
   Done (DoD). Setelah satu fase selesai:
   - Tunjukkan ringkasan pekerjaan.
   - Cek SATU PER SATU kriteria DoD, laporkan status tiap kriteria.
   - UPDATE `docs\AGENT_HANDOFF.md` (checklist fase, status kredensial, file
     yang sudah dibuat, catatan untuk agent selanjutnya) SEBELUM lanjut
     atau sebelum git commit.
   - Jika SEMUA DoD terpenuhi: lanjut ke fase berikutnya TANPA menunggu
     konfirmasi, KECUALI fase tersebut butuh kredensial/akun dari user
     (Neon, Vercel, Gemini, Vercel Blob) — untuk itu STOP dan minta dulu.
   - Jika ADA DoD gagal: JANGAN lanjut fase berikutnya. Perbaiki dulu.
3. Jika context/token mulai mendekati limit di tengah fase: UPDATE
   `docs\AGENT_HANDOFF.md` dulu (bagian "Blocker/Pending Issue" dan "Catatan
   untuk Agent Selanjutnya" dengan progres detail) SEBELUM berhenti.
4. Jika ada bagian PRD yang ambigu/konflik: STOP, tanyakan ke user —
   jangan isi gap dengan asumsi sendiri, terutama untuk hal yang
   menyangkut keamanan (auth, transaksi koin, marketplace).
5. JANGAN implementasikan apa pun dari "Bagian 16 — Fase 2" PRD (login
   eksternal, premium currency, leaderboard, daily bonus, pity system,
   generative image API). Murni catatan masa depan.
6. Ikuti persis: struktur folder (Bagian 3), skema database (Bagian 4),
   daftar endpoint & error codes (Bagian 7), skema Zod (Bagian 8), dan
   konfigurasi deployment (Bagian 15) — jangan diubah tanpa konfirmasi
   user, KECUALI sudah tercatat sebagai penyesuaian yang disetujui di
   bagian "Keputusan & Penyesuaian" `docs\AGENT_HANDOFF.md`.

## Output yang Diharapkan Setiap Fase

- File-file kode yang relevan untuk fase tersebut.
- Ringkasan singkat + checklist DoD (centang/tidak + alasan jika tidak).
- Command/instruksi yang perlu dijalankan user (misal `npm install`,
  `drizzle-kit push`, setup env var di Vercel/Neon dashboard) ditulis
  jelas dan terpisah.
