<template>
  <div class="p-4 lg:p-6 animate-fade-in">
    <div class="premium-header mb-5">
      <div class="premium-header-icon text-accent"><span class="text-xl">👥</span></div>
      <div>
        <h1 class="premium-header-title text-2xl">User Management</h1>
        <p class="text-muted text-xs mt-0.5">Pantau & kelola pemain</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <input v-model="search" @input="debouncedFetch" class="input-premium flex-1 min-w-[200px]" placeholder="🔍 Cari username / email…" />
      <select v-model="filter" @change="reload" class="input-premium text-sm py-2 px-3 w-auto">
        <option value="all">Semua</option>
        <option value="active">Aktif</option>
        <option value="banned">Terbanned</option>
      </select>
      <select v-model="sortBy" @change="reload" class="input-premium text-sm py-2 px-3 w-auto">
        <option value="createdAt">Terbaru</option>
        <option value="coins">Coin</option>
        <option value="xp">XP</option>
        <option value="level">Level</option>
        <option value="username">Username</option>
      </select>
      <button @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'; reload()" class="glass-panel p-2 rounded-lg hover:bg-white/5 text-sm">
        {{ sortDir === 'desc' ? '⬇️' : '⬆️' }}
      </button>
    </div>

    <!-- Table -->
    <div v-if="loading" class="glass-panel p-10 text-center text-muted text-sm">⏳ Memuat user…</div>
    <div v-else-if="users.length === 0" class="glass-panel p-10 text-center text-muted text-sm">Tidak ada user.</div>
    <div v-else class="glass-panel overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-white/5">
          <tr class="text-left text-muted text-xs font-display uppercase tracking-wider">
            <th class="p-3">User</th>
            <th class="p-3">Level</th>
            <th class="p-3">XP</th>
            <th class="p-3">Coin</th>
            <th class="p-3 hidden sm:table-cell">Streak</th>
            <th class="p-3 hidden md:table-cell">Kartu</th>
            <th class="p-3 hidden lg:table-cell">Daftar</th>
            <th class="p-3">Status</th>
            <th class="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors"
            :class="{ 'bg-red-500/[0.04]': u.banned }">
            <td class="p-3">
              <p class="font-display font-semibold" :class="u.banned ? 'text-red-400' : 'text-white'">{{ u.username }}</p>
              <p class="text-muted text-[10px] truncate max-w-[160px]">{{ u.email || '—' }}</p>
            </td>
            <td class="p-3 font-display font-bold text-accent-soft">{{ u.level }}</td>
            <td class="p-3 tabular-nums">{{ fmt(u.xp) }}</td>
            <td class="p-3 tabular-nums text-legendary-light">{{ fmt(u.coins) }}</td>
            <td class="p-3 hidden sm:table-cell">{{ u.loginStreak }}🔥</td>
            <td class="p-3 hidden md:table-cell">{{ u.cardsOwned }}</td>
            <td class="p-3 hidden lg:table-cell text-muted text-[11px]">{{ fmtDate(u.createdAt) }}</td>
            <td class="p-3">
              <span v-if="u.banned" class="rarity-badge text-[9px] bg-red-500/20 text-red-300 border border-red-500/30">BANNED</span>
              <span v-else class="text-green-400 text-xs font-display">● Aktif</span>
            </td>
            <td class="p-3">
              <button @click="openDetail(u)" class="px-2.5 py-1 bg-accent/20 hover:bg-accent/40 text-accent-soft rounded text-xs font-display transition-colors">Kelola</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-center gap-2 mt-6">
      <button @click="page = Math.max(1, page - 1)" :disabled="page <= 1" class="glass-panel px-3 py-1.5 rounded-lg disabled:opacity-30 text-sm font-display">← Prev</button>
      <span class="px-4 py-1.5 text-sm text-muted font-display">{{ page }} / {{ totalPages }}</span>
      <button @click="page = Math.min(totalPages, page + 1)" :disabled="page >= totalPages" class="glass-panel px-3 py-1.5 rounded-lg disabled:opacity-30 text-sm font-display">Next →</button>
    </div>

    <!-- Detail / Action Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay flex items-start justify-center p-4 overflow-y-auto" @click.self="closeDetail">
          <div class="modal-content w-full max-w-lg my-8 glass-panel-strong overflow-hidden animate-scale-in">
            <!-- Header -->
            <div class="flex items-center justify-between p-5 border-b border-white/5">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl glass-panel flex items-center justify-center flex-shrink-0"><span class="text-lg">👤</span></div>
                <div class="min-w-0">
                  <h2 class="font-display font-bold text-lg truncate">{{ detail?.username || active?.username }}</h2>
                  <p class="text-muted text-xs truncate">{{ detail?.email || 'ID: ' + active?.id }}</p>
                </div>
              </div>
              <button @click="closeDetail" class="text-muted hover:text-white p-2 glass-panel rounded-lg flex-shrink-0">✕</button>
            </div>

            <div class="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              <div v-if="detailLoading" class="text-center text-muted text-sm py-6">⏳ Memuat detail…</div>
              <template v-else-if="detail">
                <!-- Status ban -->
                <div v-if="detail.banned" class="glass-panel p-3 rounded-lg border border-red-500/25 bg-red-500/[0.05] text-red-300 text-xs font-display flex items-center gap-2">
                  ⛔ Akun ini sedang <strong>DIBLOKIR</strong>.
                </div>

                <!-- Stat ringkas -->
                <div class="grid grid-cols-3 gap-2.5">
                  <div v-for="s in detailStats" :key="s.label" class="glass-panel p-3 text-center rounded-lg">
                    <p class="text-lg font-display font-black" :style="{ color: s.color }">{{ fmt(s.value) }}</p>
                    <p class="text-[10px] text-muted font-display mt-0.5">{{ s.label }}</p>
                  </div>
                </div>
                <p class="text-[11px] text-muted -mt-2">
                  Kartu: {{ detail.uniqueCards }} unik / {{ detail.totalCards }} total · Showcase {{ detail.showcaseCount }} ·
                  Achievement {{ detail.achievementsCount }} · Streak {{ detail.loginStreak }}🔥 · Daftar {{ fmtDate(detail.createdAt) }}
                </p>

                <!-- Grant / Set: Coin -->
                <div class="glass-panel p-3.5 rounded-xl">
                  <p class="text-xs font-display font-bold text-secondary mb-2">🪙 Coin <span class="text-muted font-normal">(sekarang {{ fmt(detail.coins) }})</span></p>
                  <div class="flex items-center gap-2">
                    <input v-model.number="coinInput" type="number" class="input-premium text-sm flex-1" placeholder="jumlah" />
                    <button @click="act('grant_coins', { amount: coinInput })" :disabled="busy" class="act-btn act-add">Tambah</button>
                    <button @click="act('set_coins', { value: coinInput })" :disabled="busy" class="act-btn act-set">Set</button>
                  </div>
                </div>

                <!-- Grant / Set: XP -->
                <div class="glass-panel p-3.5 rounded-xl">
                  <p class="text-xs font-display font-bold text-secondary mb-2">⭐ XP <span class="text-muted font-normal">(sekarang {{ fmt(detail.xp) }} · Lv {{ detail.level }})</span></p>
                  <div class="flex items-center gap-2">
                    <input v-model.number="xpInput" type="number" class="input-premium text-sm flex-1" placeholder="jumlah" />
                    <button @click="act('grant_xp', { amount: xpInput })" :disabled="busy" class="act-btn act-add">Tambah</button>
                    <button @click="act('set_xp', { value: xpInput })" :disabled="busy" class="act-btn act-set">Set</button>
                  </div>
                </div>

                <!-- Set Level -->
                <div class="glass-panel p-3.5 rounded-xl">
                  <p class="text-xs font-display font-bold text-secondary mb-2">📈 Level <span class="text-muted font-normal">(sekarang {{ detail.level }})</span></p>
                  <div class="flex items-center gap-2">
                    <input v-model.number="levelInput" type="number" min="1" class="input-premium text-sm flex-1" placeholder="level baru" />
                    <button @click="act('set_level', { value: levelInput })" :disabled="busy" class="act-btn act-set">Set Level</button>
                  </div>
                </div>

                <!-- Reset password -->
                <div class="glass-panel p-3.5 rounded-xl">
                  <p class="text-xs font-display font-bold text-secondary mb-2">🔑 Reset Password</p>
                  <div class="flex items-center gap-2">
                    <input v-model="pwInput" type="text" class="input-premium text-sm flex-1" placeholder="password baru (min 8)" />
                    <button @click="doResetPw" :disabled="busy" class="act-btn act-set">Reset</button>
                  </div>
                </div>

                <!-- Ban + Delete -->
                <div class="flex flex-wrap gap-2.5 pt-1">
                  <button v-if="!detail.banned" @click="act('ban')" :disabled="busy" class="btn-danger flex-1 text-sm font-display py-2.5 rounded-xl">⛔ Ban User</button>
                  <button v-else @click="act('unban')" :disabled="busy" class="btn-secondary flex-1 text-sm font-display py-2.5 rounded-xl border border-green-500/30 text-green-400">✅ Unban</button>
                  <button @click="doDelete" :disabled="busy" class="btn-danger flex-1 text-sm font-display py-2.5 rounded-xl"
                    :class="{ 'animate-pulse': confirmDelete }">
                    {{ confirmDelete ? '⚠️ Klik lagi untuk HAPUS' : '🗑️ Hapus Akun' }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from '@/composables/useToast.js';

const toast = useToast();

const users = ref([]);
const loading = ref(true);
const page = ref(1);
const limit = 20;
const total = ref(0);
const search = ref('');
const filter = ref('all');
const sortBy = ref('createdAt');
const sortDir = ref('desc');

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

let debounceTimer = null;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { page.value = 1; fetchUsers(); }, 300);
}
function reload() { page.value = 1; fetchUsers(); }

async function fetchUsers() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: page.value, limit, sort: sortBy.value, sortDir: sortDir.value, filter: filter.value,
    });
    if (search.value) params.set('search', search.value);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      users.value = data.users;
      total.value = data.pagination.total;
    }
  } catch { /* biarkan */ }
  finally { loading.value = false; }
}

watch(page, fetchUsers);

// ── Detail / aksi ──
const showModal = ref(false);
const active = ref(null);
const detail = ref(null);
const detailLoading = ref(false);
const busy = ref(false);
const confirmDelete = ref(false);
const coinInput = ref(1000);
const xpInput = ref(100);
const levelInput = ref(1);
const pwInput = ref('');

const detailStats = computed(() => detail.value ? [
  { label: 'Coin', value: detail.value.coins, color: '#FCD34D' },
  { label: 'XP', value: detail.value.xp, color: '#C084FC' },
  { label: 'Level', value: detail.value.level, color: '#7DD3FC' },
] : []);

async function openDetail(u) {
  active.value = u;
  detail.value = null;
  confirmDelete.value = false;
  pwInput.value = '';
  showModal.value = true;
  detailLoading.value = true;
  try {
    const res = await fetch(`/api/admin/user-detail?id=${u.id}`);
    if (res.ok) {
      detail.value = (await res.json()).user;
      levelInput.value = detail.value.level;
    } else {
      toast.error('Gagal memuat detail.');
    }
  } catch { toast.error('Gagal memuat detail.'); }
  finally { detailLoading.value = false; }
}

function closeDetail() { showModal.value = false; active.value = null; detail.value = null; }

async function act(action, extra = {}) {
  if (busy.value || !active.value) return;
  busy.value = true;
  try {
    const res = await fetch('/api/admin/user-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: active.value.id, action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal.');
    toast.success('Berhasil diterapkan.');
    // Refresh detail + baris tabel
    if (data.user) {
      Object.assign(detail.value, data.user);
      const idx = users.value.findIndex(x => x.id === data.user.id);
      if (idx >= 0) users.value[idx] = { ...users.value[idx], ...data.user };
    }
  } catch (e) {
    toast.error(e.message || 'Gagal.');
  } finally {
    busy.value = false;
  }
}

async function doResetPw() {
  if (!pwInput.value || pwInput.value.length < 8) { toast.error('Password minimal 8 karakter.'); return; }
  await act('reset_password', { password: pwInput.value });
  pwInput.value = '';
}

async function doDelete() {
  if (!confirmDelete.value) { confirmDelete.value = true; return; }
  busy.value = true;
  try {
    const res = await fetch('/api/admin/user-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: active.value.id, action: 'delete' }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Gagal.');
    toast.success('Akun dihapus.');
    users.value = users.value.filter(x => x.id !== active.value.id);
    closeDetail();
  } catch (e) {
    toast.error(e.message || 'Gagal menghapus.');
  } finally { busy.value = false; }
}

function fmt(n) { return Number(n ?? 0).toLocaleString('id-ID'); }
function fmtDate(d) { try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }); } catch { return '—'; } }

onMounted(fetchUsers);
</script>

<style scoped>
.act-btn {
  font-family: 'Outfit', sans-serif; font-size: 0.72rem; font-weight: 700;
  padding: 0.5rem 0.75rem; border-radius: 0.6rem; cursor: pointer; white-space: nowrap;
  transition: filter .15s, transform .1s;
}
.act-btn:active { transform: scale(0.96); }
.act-btn:disabled { opacity: .5; cursor: not-allowed; }
.act-add { background: rgba(16,185,129,0.2); color: #6EE7B7; border: 1px solid rgba(16,185,129,0.3); }
.act-add:hover { background: rgba(16,185,129,0.32); }
.act-set { background: rgba(124,58,237,0.2); color: #C084FC; border: 1px solid rgba(124,58,237,0.3); }
.act-set:hover { background: rgba(124,58,237,0.32); }

.modal-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-content { transform: scale(0.9) translateY(20px); }
</style>
