import { db } from './db/client.js';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';
import requireAuth from './_lib/requireAuth.js';
import { sendError, logError } from './_lib/errors.js';

/**
 * POST /api/tour-seen
 * Tandai bahwa user sudah melihat (menyelesaikan/melewati) onboarding tour.
 * Idempotent — aman dipanggil berulang.
 */
export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'VALIDATION_ERROR', 'Method not allowed');
  }

  try {
    await db.update(users)
      .set({ hasSeenTour: true })
      .where(eq(users.id, req.userId));

    return res.status(200).json({ ok: true });
  } catch (err) {
    logError('/api/tour-seen', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan, coba lagi nanti.');
  }
});
