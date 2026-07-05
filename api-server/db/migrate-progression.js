// Migrasi: tambah kolom progression (xp, level, pity_counter) ke users.
// Jalankan: node api-server/db/migrate-progression.js
// Idempotent — aman dijalankan ulang.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('📈 Menambahkan kolom progression ke users...\n');

  const cols = [
    ['xp', 'integer NOT NULL DEFAULT 0'],
    ['level', 'integer NOT NULL DEFAULT 1'],
    ['pity_counter', 'integer NOT NULL DEFAULT 0'],
  ];

  for (const [name, def] of cols) {
    try {
      // nama kolom & definisi dari daftar statis di atas (bukan input user)
      await sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${name} ${def}`);
      console.log(`  ✅ ${name} (${def})`);
    } catch (err) {
      console.error(`  ❌ ${name}: ${err.message}`);
      process.exit(1);
    }
  }

  const rows = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN ('xp', 'level', 'pity_counter')
    ORDER BY column_name
  `;
  console.log('\n📋 Verifikasi:');
  rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} default ${r.column_default}`));

  console.log('\n✅ Migrasi progression selesai! Semua user existing: xp=0, level=1, pity=0.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
