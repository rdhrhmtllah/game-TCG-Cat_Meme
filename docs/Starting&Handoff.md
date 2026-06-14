<!-- STARTING CHAT -->
<!-- Kamu adalah autonomous coding agent yang akan membangun project bernama
"MemeCats: The Viral Collection" — sebuah Web 3D Card Collector & Idle
Economy Game berbasis Vue 3 + Three.js + Vercel Serverless + Neon Postgres.

LANGKAH PERTAMA — CEK STATUS SESI: [BARU]
Cek apakah file "docs\AGENT_HANDOFF.md" sudah ada di root project.
- Jika BELUM ada: ini sesi pertama. Buat file tersebut menggunakan
  template yang sudah saya lampirkan, lalu lanjut ke langkah berikutnya.
- Jika SUDAH ada: ini sesi lanjutan dari agent sebelumnya. Baca
  docs\AGENT_HANDOFF.md TERLEBIH DAHULU untuk tahu fase mana yang sedang
  berjalan, file apa yang sudah dibuat, kredensial apa yang sudah
  tersedia, dan catatan dari agent sebelumnya — lalu LANJUTKAN DARI SANA,
  JANGAN mulai dari Fase 0 lagi kecuali docs\AGENT_HANDOFF.md memang
  menyatakan belum ada fase yang selesai.

DOKUMEN RUJUKAN:
File "docs\MASTER-PRD-MemeCats.md" yang saya lampirkan adalah SATU-SATUNYA
sumber kebenaran untuk project ini. Baca dokumen ini SECARA PENUH dari
awal sampai akhir (Bagian 0 sampai 18) SEBELUM menulis baris kode apa pun.
Jangan asumsikan, jangan menebak — semua keputusan teknis, skema database,
endpoint, dan UI sudah didefinisikan eksplisit di dalamnya.

CARA KERJA:
1. Kerjakan project mengikuti "Bagian 17 — Fase Eksekusi" SECARA BERURUTAN,
   mulai dari fase yang sesuai status di docs\AGENT_HANDOFF.md, sampai Fase 13.
   Jangan lompat fase, dan jangan mengerjakan beberapa fase sekaligus
   secara paralel.
2. Setiap fase punya Tujuan, Dependency, Task List, dan Definition of Done
   (DoD). Setelah menyelesaikan satu fase:
   - Tunjukkan ringkasan apa yang sudah dikerjakan.
   - Cek satu per satu kriteria DoD fase tersebut, dan laporkan statusnya.
   - UPDATE docs\AGENT_HANDOFF.md (checklist, status kredensial, file yang
     sudah dibuat, catatan untuk agent selanjutnya) SEBELUM lanjut. [BARU]
   - Jika SEMUA DoD terpenuhi, lanjut ke fase berikutnya tanpa perlu
     menunggu konfirmasi saya, KECUALI fase tersebut menyentuh hal yang
     butuh kredensial/akun dari saya (misal setup Neon, Vercel, Gemini
     API key, Vercel Blob) — untuk hal-hal itu, STOP dan minta saya
     menyediakan kredensialnya dulu.
   - Jika ADA DoD yang gagal, JANGAN lanjut ke fase berikutnya. Perbaiki
     dulu sampai DoD fase itu terpenuhi.
3. Jika context/token kamu mulai mendekati limit di tengah fase: UPDATE
   docs\AGENT_HANDOFF.md dulu (terutama bagian "Blocker/Pending Issue" dan
   "Catatan untuk Agent Selanjutnya" dengan progres detail saat itu)
   SEBELUM berhenti — supaya sesi berikutnya bisa lanjut tanpa kehilangan
   konteks. [BARU]
4. Jika menemukan bagian PRD yang ambigu atau ada konflik antar bagian,
   STOP dan tanyakan ke saya — jangan mengisi gap dengan asumsi sendiri,
   terutama untuk hal yang menyangkut keamanan (auth, transaksi koin,
   marketplace).
5. JANGAN mengimplementasikan apa pun dari "Bagian 16 — Fase 2" (login
   eksternal, premium currency, leaderboard, daily bonus, pity system,
   generative image API). Bagian itu murni catatan masa depan.
6. Ikuti persis: struktur folder (Bagian 3), skema database (Bagian 4),
   daftar endpoint & error codes (Bagian 7), skema Zod (Bagian 8), dan
   konfigurasi deployment (Bagian 15) — jangan diubah tanpa konfirmasi
   ke saya terlebih dahulu. Jika sudah ada penyesuaian yang disetujui
   sebelumnya, cek bagian "Keputusan & Penyesuaian" di docs\AGENT_HANDOFF.md.

OUTPUT YANG SAYA HARAPKAN DI SETIAP FASE:
- File-file kode yang relevan untuk fase tersebut.
- Ringkasan singkat + checklist DoD (centang/tidak centang + alasan jika
  tidak centang).
- Jika fase membutuhkan saya menjalankan command (misal `npm install`,
  `drizzle-kit push`, atau setup env var di dashboard Vercel/Neon),
  tuliskan command/instruksi tersebut dengan jelas.

Mulai sekarang. -->

<!-- MELANJUTKAN/HANDOFF -->
<!-- Lanjutkan project "MemeCats: The Viral Collection".

Sebelum melakukan apa pun:
1. Baca "docs\AGENT_HANDOFF.md" — ini status progres dari sesi sebelumnya
   (fase aktif, kredensial yang tersedia, catatan, blocker).
2. Baca "docs\AGENT_RULES.md" — ini aturan kerja yang berlaku sepanjang
   proyek (cara cek DoD, larangan Fase 2, format output, dll).
3. Jika perlu konteks teknis detail untuk fase yang sedang dikerjakan,
   rujuk "docs\MASTER-PRD-MemeCats.md" Bagian 17 untuk fase tersebut.

Lanjutkan dari fase yang tercatat aktif di docs\AGENT_HANDOFF.md. Ikuti semua
aturan di docs\AGENT_RULES.md. -->
