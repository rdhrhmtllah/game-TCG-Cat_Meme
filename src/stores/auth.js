import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(null);
  const user = ref(null);

  const isLoggedIn = computed(() => !!token.value);

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

  async function register(username, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw data;
    token.value = data.token;
    user.value = data.user;
    return data;
  }

  async function login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw data;
    token.value = data.token;
    user.value = data.user;
    return data;
  }

  async function fetchMe() {
    if (!token.value) return null;
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    if (!res.ok) {
      token.value = null;
      user.value = null;
      return null;
    }
    const data = await safeJson(res);
    user.value = data.user;
    return data.user;
  }

  function logout() {
    token.value = null;
    user.value = null;
  }

  return {
    token,
    user,
    isLoggedIn,
    register,
    login,
    fetchMe,
    logout,
  };
});
