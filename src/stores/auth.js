import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useToast } from '@/composables/useToast.js';
import { useSound } from '@/composables/useSound.js';

const TOKEN_KEY = 'memecats_token';

export const useAuthStore = defineStore('auth', () => {
  // Hydrate dari localStorage supaya refresh halaman tidak logout paksa
  const token = ref(localStorage.getItem(TOKEN_KEY) || null);
  const user = ref(null);

  const isLoggedIn = computed(() => !!token.value);

  function setToken(value) {
    token.value = value;
    if (value) {
      localStorage.setItem(TOKEN_KEY, value);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  // Safe JSON parser — handles empty responses (e.g. backend down)
  async function safeJson(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // If backend is down / proxy fails, text is empty or HTML
      if (!text || text.trim() === '') {
        throw { status: res.status, code: 'BACKEND_OFFLINE', message: 'Server tidak merespon. Coba lagi nanti.' };
      }
      throw { status: res.status, code: 'INVALID_RESPONSE', message: `Respon tidak valid (${res.status}). Coba lagi.` };
    }
  }

  async function register(username, email, password, turnstileToken) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, turnstileToken }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw data;
    setToken(data.token);
    user.value = data.user;
    return data;
  }

  async function login(username, password, turnstileToken) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, turnstileToken }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw data;
    setToken(data.token);
    user.value = data.user;
    return data;
  }

  async function fetchMe() {
    if (!token.value) return null;
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    if (!res.ok) {
      // Akun diblokir → logout + beri tahu
      if (res.status === 403) {
        try {
          const d = await res.clone().json();
          if (d?.error?.code === 'BANNED' || d?.code === 'BANNED') {
            useToast().error('Akun kamu diblokir. Hubungi admin.');
          }
        } catch { /* abaikan */ }
      }
      // Token invalid/expired/banned — bersihkan sesi tersimpan
      setToken(null);
      user.value = null;
      return null;
    }
    const data = await safeJson(res);
    // Deteksi level-up: bandingkan level sebelum & sesudah refresh
    const prevLevel = user.value?.level;
    if (prevLevel != null && data.user?.level > prevLevel) {
      useToast().success(`🎉 Naik ke Level ${data.user.level}! Bonus coin masuk.`);
      try { useSound().play('levelUp'); } catch { /* abaikan */ }
    }
    user.value = data.user;
    return data.user;
  }

  function logout() {
    setToken(null);
    user.value = null;
  }

  // Tandai onboarding tour sudah dilihat (persist di backend, lintas perangkat).
  // Optimistic: set lokal dulu agar UI langsung tenang, lalu sinkron ke server.
  async function markTourSeen() {
    if (user.value) user.value.hasSeenTour = true;
    if (!token.value) return;
    try {
      await fetch('/api/tour-seen', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
      });
    } catch { /* diamkan — flag lokal sudah true, akan tersinkron saat fetchMe berikutnya */ }
  }

  return {
    token,
    user,
    isLoggedIn,
    register,
    login,
    fetchMe,
    logout,
    markTourSeen,
  };
});
