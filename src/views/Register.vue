<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-surface">
    <div class="glass-panel p-8 w-full max-w-sm animate-scale-in">
      <div class="text-center mb-6">
        <span class="text-4xl">🐱</span>
        <h1 class="text-2xl font-bold mt-2">MemeCats</h1>
        <p class="text-text-muted text-sm mt-1">Buat akun untuk mulai koleksi</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1.5">Username</label>
          <input v-model="username" type="text" autocomplete="username"
            class="w-full px-3 py-2.5 bg-surface-card border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            placeholder="Nama keren kamu" required minlength="3" maxlength="20" pattern="^[a-zA-Z0-9_]+$" />
          <p class="text-xs text-text-muted mt-1">3-20 karakter, huruf, angka, underscore</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
          <input v-model="password" type="password" autocomplete="new-password"
            class="w-full px-3 py-2.5 bg-surface-card border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            placeholder="Minimal 8 karakter" required minlength="8" maxlength="72" />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1.5">Konfirmasi Password</label>
          <input v-model="confirmPassword" type="password" autocomplete="new-password"
            class="w-full px-3 py-2.5 bg-surface-card border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            placeholder="Ulangi password" required />
        </div>

        <div v-if="clientError" class="p-3 bg-yellow-900/30 border border-yellow-800/50 rounded-xl text-yellow-300 text-sm flex items-center gap-2">
          <span>⚠️</span> {{ clientError }}
        </div>
        <div v-if="error" class="p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-red-300 text-sm flex items-center gap-2">
          <span>⚠️</span> {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full py-3">
          {{ loading ? 'Loading...' : 'Daftar' }}
        </button>
      </form>

      <p class="text-center text-sm text-text-muted mt-4">
        Sudah punya akun?
        <router-link to="/login" class="text-accent hover:text-accent/80 font-medium">Login</router-link>
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
const username = ref(''); const password = ref(''); const confirmPassword = ref('');
const error = ref(''); const clientError = ref(''); const loading = ref(false);

async function handleRegister() {
  error.value = ''; clientError.value = '';
  if (password.value !== confirmPassword.value) { clientError.value = 'Password tidak cocok.'; return; }
  loading.value = true;
  try { await authStore.register(username.value, password.value); toast.success('Akun berhasil dibuat!'); router.push('/gacha'); }
  catch (e) { error.value = e.message || 'Pendaftaran gagal.'; }
  finally { loading.value = false; }
}
</script>
