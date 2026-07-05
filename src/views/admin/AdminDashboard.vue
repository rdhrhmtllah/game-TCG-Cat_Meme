<template>
  <div class="p-4 lg:p-6 animate-fade-in">
    <div class="premium-header mb-6">
      <div class="premium-header-icon text-accent"><span class="text-xl">📊</span></div>
      <div>
        <h1 class="premium-header-title text-2xl">Dashboard</h1>
        <p class="text-muted text-xs mt-0.5">Ringkasan pemain, ekonomi, & kartu</p>
      </div>
    </div>

    <div v-if="loading" class="glass-panel p-10 text-center text-muted text-sm">⏳ Memuat statistik…</div>

    <template v-else-if="stats">
      <!-- User stats -->
      <p class="text-xs font-display font-bold uppercase tracking-wider text-muted mb-2">👥 Pemain</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div v-for="t in userTiles" :key="t.label" class="glass-panel p-4">
          <p class="text-2xl font-display font-black" :style="{ color: t.color }">{{ fmt(t.value) }}</p>
          <p class="text-[11px] text-muted font-display mt-0.5">{{ t.label }}</p>
        </div>
      </div>

      <!-- Economy + cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div>
            <p class="text-xs font-display font-bold uppercase tracking-wider text-muted mb-2">🪙 Ekonomi</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div v-for="t in ecoTiles" :key="t.label" class="glass-panel p-4">
                <p class="text-xl font-display font-black" :style="{ color: t.color }">{{ fmt(t.value) }}</p>
                <p class="text-[11px] text-muted font-display mt-0.5">{{ t.label }}</p>
              </div>
            </div>
          </div>
          <div>
            <p class="text-xs font-display font-bold uppercase tracking-wider text-muted mb-2">🃏 Kartu</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="glass-panel p-4">
                <p class="text-xl font-display font-black">{{ fmt(stats.cards.total) }}</p>
                <p class="text-[11px] text-muted font-display mt-0.5">Total Kartu Master</p>
              </div>
              <div class="glass-panel p-4">
                <p class="text-xl font-display font-black text-green-400">{{ fmt(stats.cards.active) }}</p>
                <p class="text-[11px] text-muted font-display mt-0.5">Kartu Aktif</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Top users -->
        <div class="glass-panel p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display font-bold text-sm flex items-center gap-2">🏆 Top Users (XP)</h3>
            <button @click="$emit('go-users')" class="text-[11px] text-accent hover:text-accent-soft font-display">Kelola →</button>
          </div>
          <div v-if="stats.topUsers.length === 0" class="text-muted text-xs text-center py-6">Belum ada user.</div>
          <div v-else class="space-y-2.5">
            <div v-for="(u, i) in stats.topUsers" :key="u.id" class="flex items-center gap-3">
              <span class="w-6 text-center font-display font-black text-sm" :class="medalClass(i)">{{ i < 3 ? ['🥇','🥈','🥉'][i] : '#'+(i+1) }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-display font-semibold truncate" :class="u.banned ? 'text-red-400 line-through' : 'text-white'">{{ u.username }}</p>
                <div class="stat-bar-track mt-1"><div class="stat-bar-fill" :style="{ width: barW(u.xp) + '%', background: '#A855F7' }"></div></div>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-xs font-display font-bold text-accent-soft">Lv {{ u.level }}</p>
                <p class="text-[10px] text-muted">{{ fmt(u.xp) }} XP</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="glass-panel p-10 text-center text-red-400 text-sm">Gagal memuat statistik.</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

defineEmits(['go-users']);

const stats = ref(null);
const loading = ref(true);

const userTiles = computed(() => stats.value ? [
  { label: 'Total User', value: stats.value.users.total, color: '#C084FC' },
  { label: 'Baru Hari Ini', value: stats.value.users.newToday, color: '#7DD3FC' },
  { label: 'Baru 7 Hari', value: stats.value.users.new7d, color: '#34D399' },
  { label: 'Aktif Hari Ini', value: stats.value.users.activeToday, color: '#FCD34D' },
  { label: 'Terbanned', value: stats.value.users.banned, color: '#F87171' },
] : []);

const ecoTiles = computed(() => stats.value ? [
  { label: 'Total Coin', value: stats.value.economy.totalCoins, color: '#FCD34D' },
  { label: 'Total XP', value: stats.value.economy.totalXp, color: '#C084FC' },
  { label: 'Rata Level', value: stats.value.economy.avgLevel, color: '#7DD3FC' },
  { label: 'Level Tertinggi', value: stats.value.economy.maxLevel, color: '#34D399' },
] : []);

const maxXp = computed(() => Math.max(1, ...(stats.value?.topUsers.map(u => u.xp) || [1])));
function barW(xp) { return Math.max(6, (xp / maxXp.value) * 100); }
function medalClass(i) { return ['text-legendary', 'text-secondary', 'text-epic-light'][i] || 'text-muted'; }
function fmt(n) { return Number(n).toLocaleString('id-ID'); }

async function fetchStats() {
  loading.value = true;
  try {
    const res = await fetch('/api/admin/stats');
    if (res.ok) stats.value = await res.json();
  } catch { /* biarkan null */ }
  finally { loading.value = false; }
}

onMounted(fetchStats);
</script>
