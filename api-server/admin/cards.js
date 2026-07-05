import { db } from '../db/client.js';
import { masterCards } from '../db/schema.js';
import { eq, and, desc, asc, sql, ilike, or } from 'drizzle-orm';
import requireAdmin from '../_lib/requireAdmin.js';
import { adminCardSchema, adminCardUpdateSchema } from '../_lib/schemas.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * GET  /api/admin/cards       — List cards with search/filter/sort
 * GET  /api/admin/cards/stats — Dashboard stats overview
 * POST /api/admin/cards       — Create new card
 * POST /api/admin/cards/bulk-action — Bulk activate/deactivate
 * PATCH  /api/admin/cards/:id — Update card
 * DELETE /api/admin/cards/:id — Soft-delete (isActive = false)
 */
export default requireAdmin(async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // Route: /api/admin/cards/stats
  if (pathname.endsWith('/stats') && req.method === 'GET') {
    return handleGetStats(req, res);
  }

  // Route: /api/admin/cards/bulk-action
  if (pathname.endsWith('/bulk-action') && req.method === 'POST') {
    return handleBulkAction(req, res);
  }

  // Route: /api/admin/cards/:id
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

// GET — List cards with search, filter, sort
async function handleGetCards(req, res, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = (page - 1) * limit;
  const search = url.searchParams.get('search') || '';
  const rarity = url.searchParams.get('rarity') || '';
  const status = url.searchParams.get('status') || 'all'; // active, inactive, all
  const sortBy = url.searchParams.get('sort') || 'createdAt';
  const sortDir = url.searchParams.get('sortDir') || 'desc';

  // Build WHERE conditions
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(masterCards.name, `%${search}%`),
        ilike(masterCards.description, `%${search}%`)
      )
    );
  }
  if (rarity && ['Common', 'Rare', 'Epic', 'Legendary'].includes(rarity)) {
    conditions.push(eq(masterCards.rarity, rarity));
  }
  if (status === 'active') {
    conditions.push(eq(masterCards.isActive, true));
  } else if (status === 'inactive') {
    conditions.push(eq(masterCards.isActive, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build ORDER BY
  const sortColumns = {
    name: masterCards.name,
    rarity: masterCards.rarity,
    hypeScore: masterCards.hypeScore,
    likesPerSec: masterCards.likesPerSec,
    createdAt: masterCards.createdAt,
    attack: masterCards.attack,
    defense: masterCards.defense,
  };
  const sortColumn = sortColumns[sortBy] || masterCards.createdAt;
  const orderFn = sortDir === 'asc' ? asc : desc;

  let query = db.select().from(masterCards);
  if (whereClause) query = query.where(whereClause);
  const cards = await query.orderBy(orderFn(sortColumn)).limit(limit).offset(offset);

  let countQuery = db.select({ count: sql`COUNT(*)` }).from(masterCards);
  if (whereClause) countQuery = countQuery.where(whereClause);
  const totalResult = await countQuery;
  const total = Number(totalResult[0].count);

  return res.status(200).json({ cards, pagination: { page, limit, total } });
}

// GET /api/admin/cards/stats — Dashboard stats
async function handleGetStats(req, res) {
  try {
    const [distribution, totals, avgStats] = await Promise.all([
      // Cards per rarity
      db.select({
        rarity: masterCards.rarity,
        count: sql`COUNT(*)`,
        activeCount: sql`COUNT(*) FILTER (WHERE ${masterCards.isActive} = true)`,
      }).from(masterCards).groupBy(masterCards.rarity),

      // Total counts
      db.select({
        total: sql`COUNT(*)`,
        active: sql`COUNT(*) FILTER (WHERE ${masterCards.isActive} = true)`,
        inactive: sql`COUNT(*) FILTER (WHERE ${masterCards.isActive} = false)`,
        placeholder: sql`COUNT(*) FILTER (WHERE ${masterCards.isPlaceholderImage} = true)`,
      }).from(masterCards),

      // Average stats per rarity
      db.select({
        rarity: masterCards.rarity,
        avgHype: sql`ROUND(AVG(${masterCards.hypeScore}))`,
        avgLikes: sql`ROUND(AVG(${masterCards.likesPerSec})::numeric, 1)`,
        avgAttack: sql`ROUND(AVG(${masterCards.attack}))`,
        avgDefense: sql`ROUND(AVG(${masterCards.defense}))`,
      }).from(masterCards).where(eq(masterCards.isActive, true)).groupBy(masterCards.rarity),
    ]);

    return res.status(200).json({
      distribution: distribution.map(d => ({
        rarity: d.rarity,
        count: Number(d.count),
        activeCount: Number(d.activeCount),
      })),
      totals: {
        total: Number(totals[0].total),
        active: Number(totals[0].active),
        inactive: Number(totals[0].inactive),
        placeholder: Number(totals[0].placeholder),
      },
      avgStats: avgStats.map(a => ({
        rarity: a.rarity,
        avgHype: Number(a.avgHype),
        avgLikes: Number(a.avgLikes),
        avgAttack: Number(a.avgAttack),
        avgDefense: Number(a.avgDefense),
      })),
    });
  } catch (err) {
    logError('/api/admin/cards/stats', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal mengambil statistik.');
  }
}

// POST — Create new card
async function handleCreateCard(req, res) {
  const parsed = adminCardSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0].message);
  }

  const data = parsed.data;
  const imageUrl = data.imageUrl || `/placeholders/${data.rarity.toLowerCase()}-placeholder.svg`;
  const isPlaceholderImage = !data.imageUrl;

  const [card] = await db.insert(masterCards)
    .values({
      name: data.name,
      description: data.description,
      rarity: data.rarity,
      hypeScore: data.hypeScore,
      likesPerSec: data.likesPerSec,
      imageUrl,
      isPlaceholderImage,
      isActive: true,
      element: data.element || 'Normal',
      attack: data.attack || 0,
      defense: data.defense || 0,
      specialAbility: data.specialAbility || null,
      specialDesc: data.specialDesc || null,
      attackName1: data.attackName1 || null,
      attackName2: data.attackName2 || null,
      weakness: data.weakness || null,
      resistance: data.resistance || null,
      illustrator: data.illustrator || 'AI Artist',
      foilStyle: data.foilStyle || 'Standard',
      dropWeight: data.dropWeight ?? 1.0,
      imgZoom: data.imgZoom ?? 1.0,
      imgOffsetX: data.imgOffsetX ?? 0.0,
      imgOffsetY: data.imgOffsetY ?? 0.0,
    })
    .returning();

  return res.status(201).json({ message: 'Kartu berhasil ditambahkan!', card });
}

// PATCH — Update card
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

  // If imageUrl is being updated with a real URL, mark as non-placeholder
  const updateData = { ...parsed.data };
  if (updateData.imageUrl && !updateData.imageUrl.startsWith('/placeholders/')) {
    updateData.isPlaceholderImage = false;
  }

  const [updated] = await db.update(masterCards)
    .set(updateData)
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

// POST /api/admin/cards/bulk-action — Bulk activate/deactivate
async function handleBulkAction(req, res) {
  try {
    const { action, cardIds } = req.body;
    if (!action || !Array.isArray(cardIds) || cardIds.length === 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Action dan cardIds diperlukan.');
    }
    if (!['activate', 'deactivate'].includes(action)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Action harus activate atau deactivate.');
    }

    const isActive = action === 'activate';
    let affected = 0;

    for (const id of cardIds) {
      const [result] = await db.update(masterCards)
        .set({ isActive })
        .where(eq(masterCards.id, id))
        .returning();
      if (result) affected++;
    }

    return res.status(200).json({
      message: `${affected} kartu berhasil di-${action}.`,
      affected,
    });
  } catch (err) {
    logError('/api/admin/cards/bulk-action', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Gagal melakukan bulk action.');
  }
}
