// Migrasi: tambah kolom email (unik) ke users.
// Jalankan: node api-server/db/migrate-email.js
// Idempotent — aman dijalankan ulang. Email nullable → akun lama tetap valid.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('📧 Menambahkan kolom email ke users...\n');

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email varchar(255)`;
    console.log('  ✅ kolom email (nullable)');
  } catch (err) {
    console.error(`  ❌ kolom email: ${err.message}`);
    process.exit(1);
  }

  try {
    // Unique index — banyak NULL diizinkan Postgres (akun lama tak bentrok)
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`;
    console.log('  ✅ unique index users_email_unique');
  } catch (err) {
    console.error(`  ❌ unique index: ${err.message}`);
    process.exit(1);
  }

  const rows = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  `;
  console.log('\n📋 Verifikasi:');
  rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} nullable=${r.is_nullable}`));

  console.log('\n✅ Migrasi email selesai! Akun lama email=NULL (grandfathered), pendaftar baru wajib email unik.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
