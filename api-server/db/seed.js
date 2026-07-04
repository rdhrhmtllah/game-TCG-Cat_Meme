// Script idempotent seed data — jalankan dengan: node api/db/seed.js
// Gunakan ON CONFLICT (name) DO NOTHING supaya aman dijalankan berkali-kali.

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const placeholderBase = '/placeholders/';

const seedCards = [
  // ======== COMMON (8 kartu) ========
  { name: 'Crying Cat', description: 'Kucing yang selalu menangis melihat harga crypto turun. Ekspresi sedihnya bikin semua orang gemas.', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8, imageUrl: placeholderBase + 'common-placeholder.svg' },
  { name: 'Vibing Cat', description: 'Kucing santai yang selalu vibing dengan headphone. Musiknya bikin tetangga ikut goyang.', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8, imageUrl: placeholderBase + 'common-placeholder.svg' },
  { name: 'Sleepy Cat', description: 'Tidur 18 jam sehari dan tetap viral. Netizen iri dengan work-life balance-nya.', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8, imageUrl: placeholderBase + 'common-placeholder.svg' },
  { name: 'Keyboard Cat', description: 'Suka tidur di atas keyboard laptop主人 pas lagi nugas. Typo yang dihasilkan kadang jadi meme legendaris.', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8, imageUrl: placeholderBase + 'common-placeholder.svg' },
  { name: 'Box Cat', description: 'Kalau ada kardus kosong, di situ dia bersemayam. Motto: "If I fits, I sits."', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8, imageUrl: placeholderBase + 'common-placeholder.svg' },
  { name: 'Zoomies Cat', description: 'Tiba-tiba lari keliling rumah jam 3 pagi tanpa alasan jelas. Energi tidak terduga.', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8, imageUrl: placeholderBase + 'common-placeholder.svg' },
  { name: 'Judgy Cat', description: 'Menatapmu dengan ekspresi menghakimi setiap kali kamu buka aplikasi kencan. Kamu tidak bisa bohong padanya.', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8, imageUrl: placeholderBase + 'common-placeholder.svg' },
  { name: 'Loaf Cat', description: 'Posisi duduk seperti roti tawar. Bulat, empuk, dan sangat fotogenik dari angle manapun.', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8, imageUrl: placeholderBase + 'common-placeholder.svg' },

  // ======== RARE (6 kartu) ========
  { name: 'CEO Cat', description: 'Memakai dasi dan duduk di kursi CEO. Setiap keputusannya menghasilkan profit 300% untuk perusahaan.', rarity: 'Rare', hypeScore: 200, likesPerSec: 2.5, imageUrl: placeholderBase + 'rare-placeholder.svg' },
  { name: 'Hacker Cat', description: 'Bisa mengetik 500 WPM dengan keempat kakinya sekaligus. Berhasil hack sistem hanya dengan tatapan mata.', rarity: 'Rare', hypeScore: 200, likesPerSec: 2.5, imageUrl: placeholderBase + 'rare-placeholder.svg' },
  { name: 'Ninja Cat', description: 'Menghilang dalam bayangan, muncul di tempat yang tidak terduga. Ahli stealth dan sangat protektif pada tuannya.', rarity: 'Rare', hypeScore: 200, likesPerSec: 2.5, imageUrl: placeholderBase + 'rare-placeholder.svg' },
  { name: 'Chef Cat', description: 'Bisa masak ramen dengan cakarnya sendiri. Restorannya selalu fully booked 6 bulan ke depan.', rarity: 'Rare', hypeScore: 200, likesPerSec: 2.5, imageUrl: placeholderBase + 'rare-placeholder.svg' },
  { name: 'Surfer Cat', description: 'Menaklukkan ombak 10 meter dengan papan selancar mini. Tidak takut air — ini yang bikin dia spesial.', rarity: 'Rare', hypeScore: 200, likesPerSec: 2.5, imageUrl: placeholderBase + 'rare-placeholder.svg' },
  { name: 'Detective Cat', description: 'Memecahkan kasus hanya dengan mengendus TKP. Sherlock Holmes tidak ada apa-apanya.', rarity: 'Rare', hypeScore: 200, likesPerSec: 2.5, imageUrl: placeholderBase + 'rare-placeholder.svg' },

  // ======== EPIC (4 kartu) ========
  { name: 'Galaxy Brain Cat', description: 'Otaknya berisi seluruh pengetahuan alam semesta. Setiap pemikiran menghasilkan big bang baru.', rarity: 'Epic', hypeScore: 400, likesPerSec: 6.5, imageUrl: placeholderBase + 'epic-placeholder.svg' },
  { name: 'Time Traveler Cat', description: 'Muncul di berbagai era sejarah. Foto-fotonya ada di piramida Mesir, lukisan Renaissance, sampai foto pendaratan di bulan.', rarity: 'Epic', hypeScore: 400, likesPerSec: 6.5, imageUrl: placeholderBase + 'epic-placeholder.svg' },
  { name: 'Phoenix Cat', description: 'Bangkit dari abu setiap kali tidur siangnya diganggu. Bulunya berubah warna sesuai mood.', rarity: 'Epic', hypeScore: 400, likesPerSec: 6.5, imageUrl: placeholderBase + 'epic-placeholder.svg' },
  { name: 'Storm Cat', description: 'Mengendalikan petir dan hujan dengan kibasan ekornya. BMKG selalu konsultasi dengannya sebelum bikin prakiraan cuaca.', rarity: 'Epic', hypeScore: 400, likesPerSec: 6.5, imageUrl: placeholderBase + 'epic-placeholder.svg' },

  // ======== LEGENDARY (2 kartu) ========
  { name: 'Sigma Cat', description: 'Alpha of alphas. Tidak butuh validasi siapapun. Satu tatapan bisa bikin seluruh internet tunduk.', rarity: 'Legendary', hypeScore: 800, likesPerSec: 15.0, imageUrl: placeholderBase + 'legendary-placeholder.svg' },
  { name: 'Nyan Cat Prime', description: 'Versi ultimate dari legenda internet. Meninggalkan jejak pelangi yang bisa dilihat dari luar angkasa. Kecepatan: tak terhingga.', rarity: 'Legendary', hypeScore: 800, likesPerSec: 15.0, imageUrl: placeholderBase + 'legendary-placeholder.svg' },
];

async function seed() {
  console.log('🌱 Seeding database...\n');

  let inserted = 0;
  let skipped = 0;

  for (const card of seedCards) {
    try {
      const result = await sql`
        INSERT INTO master_cards (name, description, rarity, hype_score, likes_per_sec, image_url, is_placeholder_image, is_active)
        VALUES (${card.name}, ${card.description}, ${card.rarity}, ${card.hypeScore}, ${card.likesPerSec}, ${card.imageUrl}, true, true)
        ON CONFLICT (name) DO NOTHING
        RETURNING id
      `;
      if (result.length > 0) {
        console.log(`  ✅ ${card.rarity.padEnd(10)} ${card.name}`);
        inserted++;
      } else {
        console.log(`  ⏭️  ${card.rarity.padEnd(10)} ${card.name} (sudah ada)`);
        skipped++;
      }
    } catch (err) {
      console.error(`  ❌ ${card.rarity.padEnd(10)} ${card.name}: ${err.message}`);
    }
  }

  console.log(`\n📊 Ringkasan: ${inserted} kartu baru, ${skipped} kartu sudah ada (skip)`);

  // Verifikasi distribusi
  const dist = await sql`
    SELECT rarity, COUNT(*) as count
    FROM master_cards
    WHERE is_active = true
    GROUP BY rarity
    ORDER BY
      CASE rarity
        WHEN 'Common' THEN 1
        WHEN 'Rare' THEN 2
        WHEN 'Epic' THEN 3
        WHEN 'Legendary' THEN 4
      END
  `;
  console.log('\n📋 Distribusi kartu aktif saat ini:');
  dist.forEach(row => console.log(`  ${row.rarity.padEnd(12)} ${row.count}`));

  console.log('\n✅ Seed selesai!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed gagal:', err);
  process.exit(1);
});
