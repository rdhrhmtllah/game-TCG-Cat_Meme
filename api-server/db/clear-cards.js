import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    console.log('🧹 Menghapus semua kartu dari master_cards...');
    await sql`DELETE FROM master_cards`;
    console.log('✅ Semua kartu berhasil dihapus.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal menghapus kartu:', err);
    process.exit(1);
  }
}

run();
