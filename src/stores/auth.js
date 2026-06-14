import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(null);
  const user = ref(null);

  const isLoggedIn = computed(() => !!token.value);

  async function register(username, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
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
    const data = await res.json();
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
    const data = await res.json();
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
