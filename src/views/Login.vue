<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-surface">
    <div class="glass-panel p-8 w-full max-w-sm animate-scale-in">
      <div class="text-center mb-6">
        <span class="text-4xl">🐱</span>
        <h1 class="text-2xl font-bold mt-2">MemeCats</h1>
        <p class="text-muted text-sm mt-1">Login untuk melanjutkan koleksi</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-secondary mb-1.5">Username</label>
          <input v-model="username" type="text" autocomplete="username"
            class="w-full px-3 py-2.5 bg-surface-card border border-white/10 rounded-xl text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            placeholder="Username kamu" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-secondary mb-1.5">Password</label>
          <input v-model="password" type="password" autocomplete="current-password"
            class="w-full px-3 py-2.5 bg-surface-card border border-white/10 rounded-xl text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            placeholder="••••••••" required />
        </div>

        <div v-if="error" class="p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-red-300 text-sm flex items-center gap-2">
          <span>⚠️</span> {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full py-3">
          {{ loading ? 'Loading...' : 'Login' }}
        </button>
      </form>

      <p class="text-center text-sm text-muted mt-4">
        Belum punya akun?
        <router-link to="/register" class="text-accent hover:text-accent/80 font-medium">Daftar</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import { useToast } from '@/composables/useToast.js';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const username = ref(''); const password = ref(''); const error = ref(''); const loading = ref(false);

async function handleLogin() {
  error.value = ''; loading.value = true;
  try { await authStore.login(username.value, password.value); router.push('/gacha'); }
  catch (e) { error.value = e.message || 'Login gagal.'; }
  finally { loading.value = false; }
}
</script>
