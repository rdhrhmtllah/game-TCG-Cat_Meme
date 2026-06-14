import { db } from '../db/client.js';
import { masterCards } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import requireAdmin from '../_lib/requireAdmin.js';
import { adminCardSchema, adminCardUpdateSchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * GET /api/admin/cards — List semua kartu (termasuk nonaktif)
 * POST /api/admin/cards — Tambah kartu baru
 * PATCH /api/admin/cards/:id — Update kartu
 * DELETE /api/admin/cards/:id — Soft-delete (isActive = false)
 */
export default requireAdmin(async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // Routing manual untuk /:id pada PATCH dan DELETE
  const idMatch = pathname.match(/\/api\/admin\/cards\/(\d+)$/);
  const cardId = idMatch ? parseInt(idMatch[1]) : null;

  try {
    switch (req.method) {
      case 'GET':
        return handleGetCards(req, res, url);
      case 'POST':
        return handleCreateCard(req, res);
      case 'PATCH':
        if (!cardId) return sendError(res, 400, 'VALIDATION_ERROR', 'ID kartu diperlukan.');
        return handleUpdateCard(req, res, cardId);
      case 'DELETE':
        if (!cardId) return sendError(res, 400, 'VALIDATION_ERROR', 'ID kartu diperlukan.');
        return handleDeleteCard(req, res, cardId);
      default:
        return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
    }
  } catch (err) {
    logError('/api/admin/cards', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});

// GET — List semua kartu
async function handleGetCards(req, res, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = (page - 1) * limit;

  const cards = await db.select()
    .from(masterCards)
    .orderBy(desc(masterCards.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: sql`COUNT(*)` }).from(masterCards);
  const total = Number(totalResult[0].count);

  return res.status(200).json({ cards, pagination: { page, limit, total } });
}

// POST — Tambah kartu baru
async function handleCreateCard(req, res) {
  const parsed = adminCardSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
  }

  const { name, description, rarity, hypeScore, likesPerSec } = parsed.data;

  // Placeholder image sesuai rarity (admin bisa ganti nanti via edit)
  const imageUrl = `/placeholders/${rarity.toLowerCase()}-placeholder.svg`;

  const [card] = await db.insert(masterCards)
    .values({
      name,
      description,
      rarity,
      hypeScore,
      likesPerSec,
      imageUrl,
      isPlaceholderImage: true,
      isActive: true,
    })
    .returning();

  return res.status(201).json({ message: 'Kartu berhasil ditambahkan!', card });
}

// PATCH — Update kartu
async function handleUpdateCard(req, res, cardId) {
  const [existing] = await db.select()
    .from(masterCards)
    .where(eq(masterCards.id, cardId));

  if (!existing) {
    return sendError(res, 404, 'NOT_FOUND', 'Kartu tidak ditemukan.');
  }

  const parsed = adminCardUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
  }

  const [updated] = await db.update(masterCards)
    .set({ ...parsed.data })
    .where(eq(masterCards.id, cardId))
    .returning();

  return res.status(200).json({ message: 'Kartu berhasil diperbarui.', card: updated });
}

// DELETE — Soft-delete
async function handleDeleteCard(req, res, cardId) {
  const [existing] = await db.select()
    .from(masterCards)
    .where(eq(masterCards.id, cardId));

  if (!existing) {
    return sendError(res, 404, 'NOT_FOUND', 'Kartu tidak ditemukan.');
  }

  await db.update(masterCards)
    .set({ isActive: false })
    .where(eq(masterCards.id, cardId));

  return res.status(200).json({ message: 'Kartu dinonaktifkan.' });
}
