<template>
  <AuthLayout
    title="Selamat Datang"
    subtitle="Login untuk melanjutkan koleksi"
    tagline="Lanjutkan Perjalanan Koleksimu"
    subtagline="Kartu, koin, level, dan showcase-mu menunggu. Masuk untuk lanjut menaikkan peringkat & menghimpun kucing meme paling langka."
    :features="[
      'Naik level & panen hadiah harian',
      'Panjat leaderboard global',
      'Showcase, marketplace & fusion kartu',
    ]"
    accent="purple"
  >
    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label class="block text-xs font-display font-semibold text-secondary mb-2 uppercase tracking-wider">Username atau Email</label>
        <input v-model="username" type="text" autocomplete="username"
          class="input-premium" placeholder="Username atau email kamu" required />
      </div>
      <div>
        <label class="block text-xs font-display font-semibold text-secondary mb-2 uppercase tracking-wider">Password</label>
        <div class="relative">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"
            class="input-premium pr-11" placeholder="••••••••" required />
          <button type="button" @click="showPassword = !showPassword" tabindex="-1"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
            :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'">
            <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="error" class="p-3 glass-panel border-red-500/30 text-red-300 text-sm flex items-center gap-2 animate-scale-in">
        <span>⚠️</span> {{ error }}
      </div>

      <TurnstileWidget ref="turnstileRef" v-model="turnstileToken" />

      <button type="submit" :disabled="loading || !turnstileToken" class="btn-primary w-full py-3.5 font-display text-base">
        {{ loading ? 'Loading...' : 'Login' }}
      </button>
    </form>

    <p class="text-center text-sm text-muted mt-6">
      Belum punya akun?
      <router-link to="/register" class="text-accent hover:text-accent-soft font-display font-semibold transition-colors">Daftar</router-link>
    </p>
  </AuthLayout>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import TurnstileWidget from '@/components/TurnstileWidget.vue';

const router = useRouter();
const authStore = useAuthStore();
const username = ref(''); const password = ref(''); const error = ref('');
const loading = ref(false); const showPassword = ref(false);
const turnstileToken = ref(''); const turnstileRef = ref(null);

async function handleLogin() {
  error.value = ''; loading.value = true;
  try {
    await authStore.login(username.value, password.value, turnstileToken.value);
    const redirect = router.currentRoute.value.query.redirect || '/app';
    router.push(redirect);
  }
  catch (e) {
    error.value = e.message || 'Login gagal.';
    turnstileRef.value?.reset(); // token sekali-pakai → minta baru
  }
  finally { loading.value = false; }
}
</script>
