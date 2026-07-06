import { db } from '../db/client.js';
import { redeemCodes } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import requireAdmin from '../_lib/requireAdmin.js';
import { sendError, logError } from '../_lib/errors.js';

/**
 * /api/admin/redeem-codes — kelola kode promo (path flat, method-switched
 * agar aman dengan peta route exact-match PROD).
 *   GET    → daftar semua kode
 *   POST   → buat kode { code, coinReward, maxUses?, startsAt, endsAt, isActive? }
 *   PATCH  → ubah { id, ...fields }
 *   DELETE → hapus { id }  (?id= juga didukung)
 */
export default requireAdmin(async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':   return await listCodes(req, res);
      case 'POST':  return await createCode(req, res);
      case 'PATCH': return await updateCode(req, res);
      case 'DELETE': return await deleteCode(req, res);
      default: return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
    }
  } catch (err) {
    if (err?.code === '23505') {
      return sendError(res, 409, 'DUPLICATE', 'Kode sudah dipakai. Gunakan kode lain.');
    }
    logError('/api/admin/redeem-codes', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});

async function listCodes(req, res) {
  const codes = await db.select().from(redeemCodes).orderBy(desc(redeemCodes.createdAt));
  return res.status(200).json({ codes });
}

function parseDate(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Validasi + normalisasi field code dari body
function normalizeInput(body, { partial = false } = {}) {
  const out = {};
  if (body.code !== undefined) {
    const code = String(body.code).trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw { status: 400, code: 'VALIDATION_ERROR', message: 'Kode 3-40 karakter, hanya huruf/angka/-/_.' };
    out.code = code;
  }
  if (body.coinReward !== undefined) {
    const c = Math.floor(Number(body.coinReward));
    if (!Number.isFinite(c) || c < 1 || c > 10_000_000) throw { status: 400, code: 'VALIDATION_ERROR', message: 'Coin reward harus 1 - 10.000.000.' };
    out.coinReward = c;
  }
  if (body.maxUses !== undefined) {
    if (body.maxUses === null || body.maxUses === '' ) out.maxUses = null;
    else {
      const m = Math.floor(Number(body.maxUses));
      if (!Number.isFinite(m) || m < 1) throw { status: 400, code: 'VALIDATION_ERROR', message: 'Batas total minimal 1 (atau kosong = tak terbatas).' };
      out.maxUses = m;
    }
  }
  if (body.startsAt !== undefined) {
    const d = parseDate(body.startsAt);
    if (!d) throw { status: 400, code: 'VALIDATION_ERROR', message: 'Tanggal mulai tidak valid.' };
    out.startsAt = d;
  }
  if (body.endsAt !== undefined) {
    const d = parseDate(body.endsAt);
    if (!d) throw { status: 400, code: 'VALIDATION_ERROR', message: 'Tanggal selesai tidak valid.' };
    out.endsAt = d;
  }
  if (body.isActive !== undefined) out.isActive = !!body.isActive;

  if (!partial) {
    for (const f of ['code', 'coinReward', 'startsAt', 'endsAt']) {
      if (out[f] === undefined) throw { status: 400, code: 'VALIDATION_ERROR', message: `Field ${f} wajib diisi.` };
    }
  }
  if (out.startsAt && out.endsAt && out.endsAt <= out.startsAt) {
    throw { status: 400, code: 'VALIDATION_ERROR', message: 'Tanggal selesai harus setelah tanggal mulai.' };
  }
  return out;
}

async function createCode(req, res) {
  let data;
  try { data = normalizeInput(req.body || {}); }
  catch (e) { return sendError(res, e.status || 400, e.code || 'VALIDATION_ERROR', e.message); }

  const [created] = await db.insert(redeemCodes).values({
    code: data.code,
    coinReward: data.coinReward,
    maxUses: data.maxUses ?? null,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    isActive: data.isActive ?? true,
  }).returning();
  return res.status(201).json({ message: 'Kode dibuat.', code: created });
}

async function updateCode(req, res) {
  const id = parseInt(req.body?.id);
  if (!id) return sendError(res, 400, 'VALIDATION_ERROR', 'id diperlukan.');
  let data;
  try { data = normalizeInput(req.body || {}, { partial: true }); }
  catch (e) { return sendError(res, e.status || 400, e.code || 'VALIDATION_ERROR', e.message); }
  delete data.id;
  if (Object.keys(data).length === 0) return sendError(res, 400, 'VALIDATION_ERROR', 'Tidak ada perubahan.');

  const [updated] = await db.update(redeemCodes).set(data).where(eq(redeemCodes.id, id)).returning();
  if (!updated) return sendError(res, 404, 'NOT_FOUND', 'Kode tidak ditemukan.');
  return res.status(200).json({ message: 'Kode diperbarui.', code: updated });
}

async function deleteCode(req, res) {
  const id = parseInt(req.body?.id || new URL(req.url, 'http://localhost').searchParams.get('id'));
  if (!id) return sendError(res, 400, 'VALIDATION_ERROR', 'id diperlukan.');
  await db.delete(redeemCodes).where(eq(redeemCodes.id, id));
  return res.status(200).json({ ok: true });
}
