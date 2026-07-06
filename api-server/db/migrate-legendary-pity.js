// Migrasi: tambah kolom legendary_pity ke users (pity Legendary/5★ ala Genshin).
// Jalankan: node api-server/db/migrate-legendary-pity.js
// Idempotent — aman dijalankan ulang.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🎰 Menambahkan kolom legendary_pity ke users...\n');
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS legendary_pity integer DEFAULT 0 NOT NULL`;
    console.log('  ✅ kolom legendary_pity (default 0)');
  } catch (err) {
    console.error(`  ❌ legendary_pity: ${err.message}`);
    process.exit(1);
  }
  const rows = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'legendary_pity'
  `;
  console.log('\n📋 Verifikasi:');
  rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} default=${r.column_default}`));
  console.log('\n✅ Migrasi legendary_pity selesai!');
  process.exit(0);
}

migrate().catch(err => { console.error('❌ Migrasi gagal:', err); process.exit(1); });
