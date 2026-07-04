<template>
  <div class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
    style="background: #070B1A;">
    <!-- Atmospheric background -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute inset-0" style="background:
        radial-gradient(ellipse 70% 50% at 50% 20%, rgba(124, 58, 237, 0.1) 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 70% 80%, rgba(245, 158, 11, 0.05) 0%, transparent 50%);"></div>
      <span v-for="i in 8" :key="i"
        class="absolute rounded-full animate-particle-float opacity-15"
        :style="{
          width: (1 + Math.random() * 2) + 'px', height: (1 + Math.random() * 2) + 'px',
          background: ['#7C3AED', '#F59E0B', '#A855F7'][i % 3],
          left: (Math.random() * 100) + '%', top: (Math.random() * 100) + '%',
          animationDelay: (i * 0.6) + 's', animationDuration: (5 + Math.random() * 4) + 's',
        }"
      />
    </div>

    <div class="glass-panel-strong p-8 w-full max-w-sm animate-scale-in relative z-10">
      <!-- Logo -->
      <div class="text-center mb-7">
        <div class="w-16 h-16 mx-auto rounded-2xl glass-panel flex items-center justify-center mb-3 animate-float">
          <span class="text-3xl">🐱</span>
        </div>
        <h1 class="text-2xl font-display font-bold bg-gradient-to-r from-primary via-accent-soft to-primary bg-clip-text text-transparent">MemeCats</h1>
        <p class="text-muted text-sm mt-1">Buat akun untuk mulai koleksi</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-display font-semibold text-secondary mb-1.5 uppercase tracking-wider">Username</label>
          <input v-model="username" type="text" autocomplete="username"
            class="input-premium" placeholder="Nama keren kamu" required minlength="3" maxlength="20" pattern="^[a-zA-Z0-9_]+$" />
          <p class="text-[11px] text-muted mt-1">3-20 karakter, huruf, angka, underscore</p>
        </div>
        <div>
          <label class="block text-xs font-display font-semibold text-secondary mb-1.5 uppercase tracking-wider">Password</label>
          <input v-model="password" type="password" autocomplete="new-password"
            class="input-premium" placeholder="Minimal 8 karakter" required minlength="8" maxlength="72" />
        </div>
        <div>
          <label class="block text-xs font-display font-semibold text-secondary mb-1.5 uppercase tracking-wider">Konfirmasi Password</label>
          <input v-model="confirmPassword" type="password" autocomplete="new-password"
            class="input-premium" placeholder="Ulangi password" required />
        </div>

        <div v-if="clientError" class="p-3 glass-panel border-yellow-500/30 text-yellow-300 text-sm flex items-center gap-2 animate-scale-in">
          <span>⚠️</span> {{ clientError }}
        </div>
        <div v-if="error" class="p-3 glass-panel border-red-500/30 text-red-300 text-sm flex items-center gap-2 animate-scale-in">
          <span>⚠️</span> {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full py-3.5 font-display text-base">
          {{ loading ? 'Loading...' : 'Daftar' }}
        </button>
      </form>

      <p class="text-center text-sm text-muted mt-5">
        Sudah punya akun?
        <router-link to="/login" class="text-accent hover:text-accent-soft font-display font-semibold transition-colors">Login</router-link>
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
  try { await authStore.register(username.value, password.value); toast.success('Akun berhasil dibuat!'); router.push('/'); }
  catch (e) { error.value = e.message || 'Pendaftaran gagal.'; }
  finally { loading.value = false; }
}
</script>
