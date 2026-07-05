// Migrasi: tambah kolom drop_weight ke master_cards (bobot gacha per kartu).
// Jalankan dengan: node api-server/db/migrate-drop-weight.js
// Idempotent — aman dijalankan ulang.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🎲 Menambahkan kolom drop_weight ke master_cards...\n');

  try {
    await sql`
      ALTER TABLE master_cards
      ADD COLUMN IF NOT EXISTS drop_weight double precision NOT NULL DEFAULT 1.0
    `;
    console.log('  ✅ kolom drop_weight (default 1.0)');
  } catch (err) {
    console.error(`  ❌ gagal: ${err.message}`);
    process.exit(1);
  }

  // Verifikasi
  const rows = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'master_cards' AND column_name = 'drop_weight'
  `;
  console.log('\n📋 Verifikasi:');
  rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} default ${r.column_default}`));

  console.log('\n✅ Migrasi drop_weight selesai! Semua kartu lama otomatis dropWeight = 1.0 (peluang merata dalam rarity, sama seperti sebelumnya).');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
