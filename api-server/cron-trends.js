import { db } from './db/client.js';
import { masterCards, cronRuns } from './db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { sendError, logError } from './_lib/errors.js';

// Blocklist kata terlarang untuk moderasi konten AI
const BLOCKED_WORDS = [
  'kekerasan', 'pembunuhan', 'senjata', 'narkoba', 'cabul',
  'porno', 'judi', 'sara', 'rasis', 'seks',
];

// Mapping rarity ke hypeScore/likesPerSec (tabel 5.2)
const RARITY_STATS = {
  Common: { hypeScore: 50, likesPerSec: 0.8 },
  Rare: { hypeScore: 200, likesPerSec: 2.5 },
  Epic: { hypeScore: 400, likesPerSec: 6.5 },
  Legendary: { hypeScore: 800, likesPerSec: 15.0 },
};

const PLACEHOLDER_BASE = '/placeholders/';

/**
 * GET /api/cron-trends
 * Triggered by Vercel Cron (tiap 12 jam).
 * Validasi CRON_SECRET, generate 1 kartu AI via Gemini.
 */
export default async function handler(req, res) {
  // Validasi CRON_SECRET
  const authHeader = req.headers.authorization;
  const CRON_SECRET = process.env.CRON_SECRET;

  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== CRON_SECRET) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Akses ditolak.');
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    // --- Idempotency Check ---
    const recentRun = await db.select()
      .from(cronRuns)
      .where(
        sql`${cronRuns.jobName} = 'cron-trends' AND ${cronRuns.ranAt} > NOW() - INTERVAL '11 hours'`
      )
      .limit(1);

    if (recentRun.length > 0) {
      return res.status(200).json({ message: 'Skipped, already ran recently' });
    }

    // Insert run record SEBELUM panggil Gemini
    await db.insert(cronRuns).values({ jobName: 'cron-trends' });

    // --- Generate via Gemini ---
    const concept = await generateCardConcept();

    if (!concept) {
      return res.status(200).json({ message: 'Tidak ada konsep baru yang valid dari AI.' });
    }

    // --- Validasi & Moderasi ---
    const validationError = validateConcept(concept);
    if (validationError) {
      console.log(`[cron-trends] Skip: ${validationError}`);
      return res.status(200).json({ message: validationError });
    }

    if (containsBlockedWords(concept.name) || containsBlockedWords(concept.description)) {
      console.log(`[cron-trends] Skip: blocked words detected`);
      return res.status(200).json({ message: 'Konsep mengandung kata terlarang, skip.' });
    }

    // --- Mapping stat ---
    const stats = RARITY_STATS[concept.rarity] || RARITY_STATS.Common;
    const imageUrl = PLACEHOLDER_BASE + `${concept.rarity.toLowerCase()}-placeholder.svg`;

    // --- Insert (ON CONFLICT DO NOTHING untuk unique name) ---
    await db.insert(masterCards)
      .values({
        name: concept.name,
        description: concept.description,
        rarity: concept.rarity,
        hypeScore: stats.hypeScore,
        likesPerSec: stats.likesPerSec,
        imageUrl,
        isPlaceholderImage: true,
        isActive: true,
      })
      .onConflictDoNothing();

    console.log(`[cron-trends] Generated: ${concept.name} (${concept.rarity})`);
    return res.status(200).json({ message: `Kartu baru: ${concept.name}` });
  } catch (err) {
    logError('/api/cron-trends', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
}

/**
 * Panggil Gemini API untuk generate 1 konsep kartu.
 * Return { name, description, rarity } atau null jika gagal.
 */
async function generateCardConcept() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'CHANGE_ME') {
    console.log('[cron-trends] GEMINI_API_KEY belum dikonfigurasi. Skip AI generation.');
    return null;
  }

  try {
    // Dynamic import supaya tidak crash jika package belum terinstall
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const prompt = `Hasilkan SATU konsep "kucing meme fiksi" yang aman untuk segala umur, dalam Bahasa Indonesia santai.
TIDAK boleh menyebut merek/brand/figur publik nyata.
Output WAJIB JSON murni tanpa markdown, dengan format:
{"name": "Nama Kucing", "description": "Deskripsi singkat maks 255 karakter", "rarity": "Common|Rare|Epic|Legendary"}

Rarity: Common (biasa), Rare (unik), Epic (luar biasa), Legendary (legendaris).
Pilih rarity secara acak dengan distribusi: 70% Common, 20% Rare, 8% Epic, 2% Legendary.

Contoh output valid:
{"name": "Konser Cat", "description": "Kucing yang suka miaw di atas panggung dengan gaya rockstar. Setiap konsernya sold out dalam 5 detik.", "rarity": "Rare"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON dari response (handle markdown code block jika ada)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[cron-trends] Gemini response tidak mengandung JSON:', text.substring(0, 200));
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[cron-trends] Gemini error:', err.message);
    return null;
  }
}

/**
 * Validasi konsep hasil AI.
 * Return error message jika tidak valid, null jika OK.
 */
function validateConcept(concept) {
  if (!concept || !concept.name || !concept.description || !concept.rarity) {
    return 'Konsep tidak lengkap (missing fields)';
  }

  if (typeof concept.name !== 'string' || concept.name.length < 3 || concept.name.length > 50) {
    return 'Nama di luar range panjang (3-50)';
  }

  // Hanya izinkan huruf, angka, spasi, dan tanda baca dasar
  if (!/^[a-zA-Z0-9\s\-_,.!?]+$/.test(concept.name)) {
    return 'Nama mengandung karakter tidak valid';
  }

  if (typeof concept.description !== 'string' || concept.description.length < 10 || concept.description.length > 255) {
    return 'Deskripsi di luar range panjang (10-255)';
  }

  const validRarities = ['Common', 'Rare', 'Epic', 'Legendary'];
  if (!validRarities.includes(concept.rarity)) {
    return `Rarity tidak valid: ${concept.rarity}`;
  }

  return null; // Valid
}

/**
 * Cek apakah teks mengandung kata terlarang.
 */
function containsBlockedWords(text) {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some(word => lower.includes(word));
}
