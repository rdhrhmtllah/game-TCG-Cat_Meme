// ═══════════════════════════════════════════════════════════════
// Verifikasi Cloudflare Turnstile (anti-bot / anti-brute-force).
//
// Graceful fallback: bila TURNSTILE_SECRET_KEY belum di-set, verifikasi
// DILEWATI (skipped:true) supaya dev/pre-key tetap jalan. Begitu secret
// dipasang di env, verifikasi otomatis ditegakkan.
//
// Fail policy: gagal-tutup untuk token invalid/absen (success:false),
// tapi gagal-buka bila TIDAK BISA menghubungi Cloudflare (jaringan error)
// agar outage CF tidak mengunci seluruh login.
// ═══════════════════════════════════════════════════════════════

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * @param {string|undefined} token  nilai cf-turnstile-response dari client
 * @param {string|undefined} remoteip  IP client (opsional, dari x-forwarded-for)
 * @returns {Promise<{ok:boolean, reason?:string, skipped?:boolean, degraded?:boolean, codes?:string[]}>}
 */
export async function verifyTurnstile(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true }; // fitur belum diaktifkan

  if (!token || typeof token !== 'string') {
    return { ok: false, reason: 'Verifikasi keamanan diperlukan. Muat ulang halaman.' };
  }

  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (remoteip) body.set('remoteip', remoteip);

    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();

    if (data.success) return { ok: true };
    return { ok: false, reason: 'Verifikasi keamanan gagal. Coba lagi.', codes: data['error-codes'] };
  } catch (err) {
    // Tidak bisa menghubungi Cloudflare → gagal-buka (jangan kunci semua user)
    console.error('[turnstile] siteverify unreachable:', err?.message);
    return { ok: true, degraded: true };
  }
}
