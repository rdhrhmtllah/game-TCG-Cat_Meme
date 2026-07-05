<template>
  <div class="min-h-screen bg-[#070B1A] text-white">
    <!-- Splash saat cek sesi -->
    <div v-if="admin.checking.value" class="flex items-center justify-center min-h-screen">
      <p class="text-muted font-display text-sm animate-pulse">⏳ Memuat admin…</p>
    </div>

    <!-- LOGIN GATE -->
    <div v-else-if="!admin.loggedIn.value" class="flex items-center justify-center min-h-screen px-4">
      <div class="glass-panel-strong p-8 w-full max-w-md animate-scale-in">
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto rounded-2xl glass-panel flex items-center justify-center mb-4">
            <span class="text-3xl">🛡️</span>
          </div>
          <h1 class="text-2xl font-display font-bold bg-gradient-to-r from-accent via-epic to-legendary bg-clip-text text-transparent">
            Admin Command Center
          </h1>
          <p class="text-muted text-sm mt-1">MemeCats Control Panel</p>
        </div>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-display font-semibold text-secondary mb-1.5">Admin Secret</label>
            <input v-model="secret" type="password" class="input-premium" placeholder="Masukkan admin secret" required />
          </div>
          <div>
            <label class="block text-xs font-display font-semibold text-secondary mb-1.5">Durasi Sesi (TTL)</label>
            <select v-model="sessionTtl" class="input-premium py-2.5 text-sm">
              <option :value="3600">1 Jam</option>
              <option :value="43200">12 Jam (Default)</option>
              <option :value="86400">1 Hari</option>
              <option :value="604800">7 Hari</option>
              <option :value="2592000">30 Hari</option>
            </select>
          </div>
          <div v-if="loginError" class="text-red-400 text-sm glass-panel p-2 rounded-lg text-center">{{ loginError }}</div>
          <button type="submit" :disabled="loading" class="btn-primary w-full font-display">
            {{ loading ? '⏳ Verifying...' : '🔐 Login Admin' }}
          </button>
        </form>
      </div>
    </div>

    <!-- PANEL -->
    <div v-else class="flex min-h-screen">
      <!-- Sidebar (desktop) -->
      <aside class="w-60 flex-shrink-0 border-r border-white/5 bg-[#060A16] hidden lg:flex flex-col">
        <div class="p-5 border-b border-white/5">
          <h1 class="font-display font-bold text-lg bg-gradient-to-r from-accent via-epic to-legendary bg-clip-text text-transparent">
            🛡️ MemeCats Admin
          </h1>
          <p class="text-muted text-xs mt-0.5">Control Panel</p>
        </div>
        <nav class="flex-1 p-3 space-y-1">
          <button v-for="s in sections" :key="s.id" @click="section = s.id"
            class="admin-nav-btn" :class="{ 'admin-nav-btn-active': section === s.id }">
            <span>{{ s.icon }}</span> {{ s.label }}
          </button>
        </nav>
        <div class="p-3 border-t border-white/5">
          <button @click="handleLogout" class="admin-nav-btn text-red-300/80 hover:text-red-300">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <!-- Main -->
      <main class="flex-1 min-w-0 overflow-y-auto">
        <!-- Mobile section switcher -->
        <div class="lg:hidden sticky top-0 z-20 bg-[#070B1A]/90 backdrop-blur border-b border-white/5 p-3 flex items-center gap-2 overflow-x-auto">
          <button v-for="s in sections" :key="'m'+s.id" @click="section = s.id"
            class="px-3 py-1.5 rounded-full text-xs font-display font-semibold whitespace-nowrap border flex-shrink-0"
            :class="section === s.id ? 'bg-accent/20 text-accent-soft border-accent/30' : 'border-white/8 text-muted'">
            {{ s.icon }} {{ s.label }}
          </button>
          <button @click="handleLogout" class="ml-auto px-3 py-1.5 rounded-full text-xs font-display text-red-300 border border-red-500/20 flex-shrink-0">🚪</button>
        </div>

        <AdminDashboard v-if="section === 'dashboard'" @go-users="section = 'users'" />
        <AdminUsers v-else-if="section === 'users'" />
        <AdminCardMaker v-else-if="section === 'cards'" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAdminAuth } from '@/composables/useAdminAuth.js';
import AdminDashboard from '@/views/admin/AdminDashboard.vue';
import AdminUsers from '@/views/admin/AdminUsers.vue';
import AdminCardMaker from '@/views/admin/AdminCardMaker.vue';

const admin = useAdminAuth();

const secret = ref('');
const sessionTtl = ref(43200);
const loginError = ref('');
const loading = ref(false);
const section = ref('dashboard');

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'cards', label: 'Card Maker', icon: '🃏' },
];

async function handleLogin() {
  loading.value = true;
  loginError.value = '';
  try {
    await admin.login(secret.value, sessionTtl.value);
  } catch (e) {
    loginError.value = e.message || 'Secret salah.';
  } finally {
    loading.value = false;
  }
}

async function handleLogout() {
  await admin.logout();
}

onMounted(() => admin.checkSession());
</script>

<style scoped>
.admin-nav-btn {
  display: flex; align-items: center; gap: 0.6rem; width: 100%;
  padding: 0.65rem 0.8rem; border-radius: 0.75rem;
  font-family: 'Outfit', sans-serif; font-size: 0.9rem; font-weight: 500;
  color: #94A3B8; transition: all 0.15s ease; cursor: pointer;
}
.admin-nav-btn:hover { background: rgba(255,255,255,0.04); color: #F1F5F9; }
.admin-nav-btn-active {
  background: rgba(124, 58, 237, 0.12); color: #C084FC;
  box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.2);
}
</style>
