// Migrasi: tambah kolom banned ke users (moderasi/ban).
// Jalankan: node api-server/db/migrate-banned.js
// Idempotent — aman dijalankan ulang.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🔨 Menambahkan kolom banned ke users...\n');

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false NOT NULL`;
    console.log('  ✅ kolom banned (default false)');
  } catch (err) {
    console.error(`  ❌ kolom banned: ${err.message}`);
    process.exit(1);
  }

  const rows = await sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'banned'
  `;
  console.log('\n📋 Verifikasi:');
  rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} default=${r.column_default} nullable=${r.is_nullable}`));

  console.log('\n✅ Migrasi banned selesai! Semua user existing default banned=false.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
