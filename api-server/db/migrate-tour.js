// Migrasi: tambah kolom has_seen_tour ke users (flag onboarding tour).
// Jalankan: node api-server/db/migrate-tour.js
// Idempotent — aman dijalankan ulang.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🎓 Menambahkan kolom has_seen_tour ke users...\n');

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_tour boolean DEFAULT false NOT NULL`;
    console.log('  ✅ kolom has_seen_tour (default false)');
  } catch (err) {
    console.error(`  ❌ kolom has_seen_tour: ${err.message}`);
    process.exit(1);
  }

  const rows = await sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'has_seen_tour'
  `;
  console.log('\n📋 Verifikasi:');
  rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} default=${r.column_default} nullable=${r.is_nullable}`));

  console.log('\n✅ Migrasi tour selesai! User (baru & lama) default has_seen_tour=false → akan melihat tour sekali.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
