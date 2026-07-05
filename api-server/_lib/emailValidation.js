// Validasi email TANPA verifikasi: pastikan bukan email sekali-pakai &
// domainnya punya mail server sungguhan (MX). Semua server-side & instan,
// tanpa mengirim email. Aman di Vercel serverless (hanya DNS, bukan SMTP).
import dns from 'node:dns';

// Domain email sekali-pakai / temporer yang umum. Mudah ditambah.
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'temp-mail.org', 'tempmail.com', 'tempmailo.com',
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net', 'sharklasers.com',
  '10minutemail.com', '10minutemail.net', '20minutemail.com', 'minuteinbox.com',
  'yopmail.com', 'yopmail.net', 'yopmail.fr', 'throwawaymail.com', 'throwaway.email',
  'getnada.com', 'nada.email', 'maildrop.cc', 'mailnesia.com', 'mailcatch.com',
  'dispostable.com', 'trashmail.com', 'trashmail.de', 'wegwerfmail.de',
  'fakeinbox.com', 'fake-mail.net', 'spam4.me', 'mytemp.email', 'temp-mail.io',
  'emailondeck.com', 'moakt.com', 'tempinbox.com', 'mohmal.com', 'inboxkitten.com',
  'burnermail.io', 'mailsac.com', 'harakirimail.com', 'jetable.org', 'discard.email',
  'tempr.email', 'mailtemp.info', 'luxusmail.org', 'emailfake.com', 'anonbox.net',
  'gmailnator.com', 'tempail.com', 'mailpoof.com', 'cs.email', 'tmail.io',
  'tmpmail.org', 'tmpmail.net', 'tmpeml.com', 'tmpbox.net', 'onemail.host',
  'mailtm.com', 'mail.tm', 'mail-temp.com', '1secmail.com', '1secmail.net', '1secmail.org',
  'muellmail.com', 'spambog.com', 'spambox.us', 'spamgourmet.com', 'trbvm.com',
  'byom.de', 'tempmailer.de', 'wegwerfemail.de', 'einrot.com', 'gustr.com',
]);

function mxWithTimeout(domain, ms = 4000) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; resolve({ status: 'timeout', records: [] }); }
    }, ms);
    dns.resolveMx(domain, (err, records) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) resolve({ status: err.code || 'error', records: [] });
      else resolve({ status: 'ok', records: records || [] });
    });
  });
}

/**
 * @param {string} rawEmail
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function validateEmail(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) {
    return { ok: false, reason: 'Format email tidak valid.' };
  }
  const domain = email.slice(at + 1);

  // 1. Blokir email sekali-pakai
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, reason: 'Email sekali-pakai / temporer tidak diperbolehkan. Gunakan email asli.' };
  }

  // 2. Cek MX — domain harus punya mail server
  const { status, records } = await mxWithTimeout(domain);
  if (status === 'ok') {
    if (records.length > 0) return { ok: true };
    return { ok: false, reason: 'Domain email tidak bisa menerima email (tidak ada mail server).' };
  }
  // Domain / MX benar-benar tidak ada → tolak (typo/domain palsu)
  if (status === 'ENOTFOUND' || status === 'ENODATA' || status === 'NXDOMAIN') {
    return { ok: false, reason: 'Domain email tidak valid. Cek kembali alamat emailmu.' };
  }
  // Error transien (timeout/SERVFAIL/dll) → fail-open supaya user sah tak terblokir
  console.warn(`[emailValidation] MX lookup '${domain}' status=${status} → fail-open (diizinkan)`);
  return { ok: true };
}
