// Autentikasi admin berbasis cookie httpOnly (admin_session).
// Secret dikirim sekali saat login; cookie dikirim otomatis same-origin
// pada tiap request /api/admin/* — frontend tak menyimpan secret.
import { ref } from 'vue';

const loggedIn = ref(false);
const checking = ref(true);

async function checkSession() {
  checking.value = true;
  try {
    const res = await fetch('/api/admin/stats');
    loggedIn.value = res.ok;
  } catch {
    loggedIn.value = false;
  } finally {
    checking.value = false;
  }
  return loggedIn.value;
}

async function login(secret, ttl = 43200, turnstileToken) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, ttl, turnstileToken }),
  });
  let data = {};
  try { data = await res.json(); } catch { /* abaikan */ }
  if (!res.ok) throw new Error(data.message || 'Secret salah.');
  loggedIn.value = true;
  return data;
}

async function logout() {
  try { await fetch('/api/admin/logout', { method: 'POST' }); } catch { /* abaikan */ }
  loggedIn.value = false;
}

export function useAdminAuth() {
  return { loggedIn, checking, checkSession, login, logout };
}
