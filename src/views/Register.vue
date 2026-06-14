<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="glass-panel p-8 w-full max-w-sm">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-purple-400">🐱 MemeCats</h1>
        <p class="text-gray-500 text-sm mt-1">Buat akun untuk mulai koleksi</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Username</label>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Nama keren kamu"
            required
            minlength="3"
            maxlength="20"
            pattern="^[a-zA-Z0-9_]+$"
          />
          <p class="text-xs text-gray-600 mt-1">3-20 karakter, hanya huruf, angka, underscore</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Minimal 8 karakter"
            required
            minlength="8"
            maxlength="72"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Konfirmasi Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Ulangi password"
            required
          />
        </div>

        <div
          v-if="clientError"
          class="p-3 bg-yellow-900/30 border border-yellow-800 rounded-lg text-yellow-400 text-sm"
        >
          {{ clientError }}
        </div>

        <div
          v-if="error"
          class="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm"
        >
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="btn-primary w-full py-3"
        >
          {{ loading ? 'Loading...' : 'Daftar' }}
        </button>
      </form>

      <p class="text-center text-sm text-gray-500 mt-4">
        Sudah punya akun?
        <router-link to="/login" class="text-purple-400 hover:text-purple-300">Login</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const clientError = ref('');
const loading = ref(false);

async function handleRegister() {
  error.value = '';
  clientError.value = '';

  if (password.value !== confirmPassword.value) {
    clientError.value = 'Password dan konfirmasi tidak cocok.';
    return;
  }

  loading.value = true;
  try {
    await authStore.register(username.value, password.value);
    router.push('/gacha');
  } catch (e) {
    error.value = e.message || 'Pendaftaran gagal.';
  } finally {
    loading.value = false;
  }
}
</script>
