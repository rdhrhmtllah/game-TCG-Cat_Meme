// Migrasi: tabel redeem_codes + redeem_code_uses (fitur kode promo).
// Jalankan: node api-server/db/migrate-redeem.js
// Idempotent — aman dijalankan ulang.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🎁 Membuat tabel redeem code...\n');

  await sql`
    CREATE TABLE IF NOT EXISTS redeem_codes (
      id serial PRIMARY KEY,
      code varchar(40) NOT NULL UNIQUE,
      coin_reward integer NOT NULL,
      max_uses integer,
      used_count integer NOT NULL DEFAULT 0,
      starts_at timestamp NOT NULL,
      ends_at timestamp NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;
  console.log('  ✅ redeem_codes');

  await sql`
    CREATE TABLE IF NOT EXISTS redeem_code_uses (
      id serial PRIMARY KEY,
      code_id integer NOT NULL REFERENCES redeem_codes(id) ON DELETE CASCADE,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      redeemed_at timestamp NOT NULL DEFAULT now()
    )
  `;
  console.log('  ✅ redeem_code_uses');

  // UNIQUE: satu code hanya bisa dipakai sekali per user (race-safe backstop)
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS redeem_use_unique ON redeem_code_uses (code_id, user_id)`;
  console.log('  ✅ unique index redeem_use_unique (code_id, user_id)');

  await sql`CREATE INDEX IF NOT EXISTS redeem_code_idx ON redeem_codes (code)`;
  console.log('  ✅ index redeem_code_idx');

  console.log('\n✅ Migrasi redeem selesai!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
