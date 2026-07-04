// Script untuk menambahkan CHECK constraints di level database
// Jalankan dengan: node api/db/migrate-checks.js
// Defense-in-depth — validasi aplikasi + constraint DB.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🔒 Menambahkan CHECK constraints...\n');

  // Cek existing constraints
  const existing = await sql`
    SELECT conname FROM pg_constraint
    WHERE conname IN ('coins_non_negative', 'price_positive', 'quantity_non_negative')
  `;
  const existingNames = new Set(existing.map(r => r.conname));

  // 1. coins_non_negative
  if (existingNames.has('coins_non_negative')) {
    console.log('  ⏭️  coins_non_negative (sudah ada)');
  } else {
    try {
      await sql`ALTER TABLE users ADD CONSTRAINT coins_non_negative CHECK (coins >= 0)`;
      console.log('  ✅ coins_non_negative');
    } catch (err) {
      console.error(`  ❌ coins_non_negative: ${err.message}`);
    }
  }

  // 2. price_positive
  if (existingNames.has('price_positive')) {
    console.log('  ⏭️  price_positive (sudah ada)');
  } else {
    try {
      await sql`ALTER TABLE marketplace_listings ADD CONSTRAINT price_positive CHECK (price > 0)`;
      console.log('  ✅ price_positive');
    } catch (err) {
      console.error(`  ❌ price_positive: ${err.message}`);
    }
  }

  // 3. quantity_non_negative
  if (existingNames.has('quantity_non_negative')) {
    console.log('  ⏭️  quantity_non_negative (sudah ada)');
  } else {
    try {
      await sql`ALTER TABLE user_inventory ADD CONSTRAINT quantity_non_negative CHECK (quantity >= 0)`;
      console.log('  ✅ quantity_non_negative');
    } catch (err) {
      console.error(`  ❌ quantity_non_negative: ${err.message}`);
    }
  }

  console.log('\n✅ Migrasi CHECK constraints selesai!');

  // Verifikasi
  console.log('\n📋 Verifikasi constraints:');
  const result = await sql`
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conname IN ('coins_non_negative', 'price_positive', 'quantity_non_negative')
  `;
  if (result.length === 0) {
    console.log('  (tidak ada — mungkin constraint belum dibuat karena error di atas)');
  } else {
    result.forEach(row => console.log(`  ${row.conname}: ${row.definition}`));
  }

  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
