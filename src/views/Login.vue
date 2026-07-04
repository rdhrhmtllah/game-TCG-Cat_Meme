<template>
  <div class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
    style="background: #070B1A;">
    <!-- Atmospheric background -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute inset-0" style="background:
        radial-gradient(ellipse 70% 50% at 50% 20%, rgba(124, 58, 237, 0.1) 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 30% 80%, rgba(56, 189, 248, 0.05) 0%, transparent 50%);"></div>
      <span v-for="i in 8" :key="i"
        class="absolute rounded-full animate-particle-float opacity-15"
        :style="{
          width: (1 + Math.random() * 2) + 'px', height: (1 + Math.random() * 2) + 'px',
          background: ['#7C3AED', '#38BDF8', '#A855F7'][i % 3],
          left: (Math.random() * 100) + '%', top: (Math.random() * 100) + '%',
          animationDelay: (i * 0.7) + 's', animationDuration: (5 + Math.random() * 4) + 's',
        }"
      />
    </div>

    <div class="glass-panel-strong p-8 w-full max-w-sm animate-scale-in relative z-10">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto rounded-2xl glass-panel flex items-center justify-center mb-3 animate-float">
          <span class="text-3xl">🐱</span>
        </div>
        <h1 class="text-2xl font-display font-bold bg-gradient-to-r from-primary via-accent-soft to-primary bg-clip-text text-transparent">MemeCats</h1>
        <p class="text-muted text-sm mt-1">Login untuk melanjutkan koleksi</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-display font-semibold text-secondary mb-1.5 uppercase tracking-wider">Username</label>
          <input v-model="username" type="text" autocomplete="username"
            class="input-premium" placeholder="Username kamu" required />
        </div>
        <div>
          <label class="block text-xs font-display font-semibold text-secondary mb-1.5 uppercase tracking-wider">Password</label>
          <input v-model="password" type="password" autocomplete="current-password"
            class="input-premium" placeholder="••••••••" required />
        </div>

        <div v-if="error" class="p-3 glass-panel border-red-500/30 text-red-300 text-sm flex items-center gap-2 animate-scale-in">
          <span>⚠️</span> {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full py-3.5 font-display text-base">
          {{ loading ? 'Loading...' : 'Login' }}
        </button>
      </form>

      <p class="text-center text-sm text-muted mt-5">
        Belum punya akun?
        <router-link to="/register" class="text-accent hover:text-accent-soft font-display font-semibold transition-colors">Daftar</router-link>
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
  try {
    await authStore.login(username.value, password.value);
    const redirect = router.currentRoute.value.query.redirect || '/';
    router.push(redirect);
  }
  catch (e) { error.value = e.message || 'Login gagal.'; }
  finally { loading.value = false; }
}
</script>
