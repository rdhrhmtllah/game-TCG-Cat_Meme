<template>
  <div class="max-w-2xl mx-auto px-4 py-6 pb-28">
    <!-- Header -->
    <div class="premium-header mb-5">
      <div class="premium-header-icon text-legendary">
        <IconBase name="trophy" :size="20" />
      </div>
      <div>
        <h1 class="premium-header-title text-2xl">Papan Peringkat</h1>
        <p class="text-muted text-xs mt-0.5">Peringkat pemain sepanjang masa</p>
      </div>
    </div>

    <!-- Tabs metrik -->
    <div class="glass-tabs mb-5">
      <button v-for="m in metrics" :key="m.value" @click="setMetric(m.value)"
        class="glass-tab" :class="{ 'glass-tab-active': metric === m.value }">
        {{ m.label }}
      </button>
    </div>

    <!-- Panduan: cara naik Level (hanya di mode Level) -->
    <div v-if="metric === 'level'" class="glass-panel rounded-xl p-4 mb-5">
      <p class="text-xs text-secondary font-display mb-3 leading-relaxed">
        ⭐ Peringkat ini berdasarkan <strong class="text-accent-soft">Level</strong>. Naikkan Level dengan mengumpulkan
        <strong class="text-accent-soft">XP</strong> — makin banyak beraktivitas, makin cepat naik:
      </p>
      <XpGuide :default-open="true" />
    </div>

    <!-- Podium top 3 -->
    <div v-if="!loading && top.length >= 3" class="grid grid-cols-3 gap-3 mb-6 items-end">
      <div v-for="slot in podium" :key="slot.rank"
        class="glass-panel rounded-2xl p-4 text-center relative"
        :class="slot.rank === 1 ? 'order-2 pb-6' : slot.rank === 2 ? 'order-1' : 'order-3'"
        :style="slot.rank === 1 ? 'box-shadow: 0 0 30px rgba(245,158,11,0.25);' : ''">
        <div class="text-3xl mb-1">{{ ['🥇','🥈','🥉'][slot.rank - 1] }}</div>
        <p class="font-display font-bold text-sm truncate"
          :class="slot.me ? 'text-accent-soft' : 'text-white'">{{ slot.username }}</p>
        <p class="text-[10px] text-muted">Lv {{ slot.level }}</p>
        <p class="font-display font-black mt-1" :class="'text-' + rarityTint(slot.rank)">{{ unit(slot.value) }}</p>
      </div>
    </div>

    <!-- List -->
    <div v-if="loading" class="glass-panel p-10 text-center text-muted text-sm">⏳ Memuat peringkat...</div>
    <div v-else-if="top.length === 0" class="glass-panel p-10 text-center">
      <div class="w-16 h-16 mx-auto mb-3 rounded-full glass-panel flex items-center justify-center text-3xl">🏅</div>
      <p class="text-primary font-display font-semibold">Belum ada peringkat.</p>
      <p class="text-muted text-sm">Jadilah yang pertama naik daun!</p>
    </div>
    <div v-else class="space-y-1.5">
      <div v-for="row in rest" :key="row.id"
        class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
        :class="row.me ? 'bg-accent/15 border border-accent/30' : 'glass-panel hover:border-accent/20'">
        <span class="w-8 text-center font-display font-black text-sm flex-shrink-0 text-muted">#{{ row.rank }}</span>
        <span class="flex-1 text-sm font-display truncate" :class="row.me ? 'text-accent-soft font-bold' : 'text-white'">
          {{ row.username }}<span v-if="row.me" class="text-[10px] text-accent ml-1">(kamu)</span>
        </span>
        <span class="text-[10px] text-muted font-display hidden sm:block">Lv {{ row.level }}</span>
        <span class="text-sm font-display font-bold tabular-nums text-secondary flex-shrink-0">{{ unit(row.value) }}</span>
      </div>

      <!-- Rank kamu bila di luar daftar -->
      <div v-if="me && me.rank > top.length"
        class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 mt-3">
        <span class="w-8 text-center font-display font-black text-sm text-accent-soft flex-shrink-0">#{{ me.rank }}</span>
        <span class="flex-1 text-sm font-display font-bold text-accent-soft">Kamu</span>
        <span class="text-sm font-display font-bold tabular-nums text-accent-soft flex-shrink-0">{{ unit(me.value) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import IconBase from '@/components/IconBase.vue';
import XpGuide from '@/components/XpGuide.vue';

const authStore = useAuthStore();

const metrics = [
  { value: 'level', label: '⭐ Level' },
  { value: 'collection', label: '🃏 Koleksi' },
  { value: 'coins', label: '🪙 Coins' },
];
const metric = ref('level');
const top = ref([]);
const me = ref(null);
const loading = ref(false);

function unit(v) {
  if (metric.value === 'level') return `Lv ${v}`;
  if (metric.value === 'coins') return `${Number(v).toLocaleString('id-ID')}`;
  return `${v} kartu`;
}
function rarityTint(rank) {
  return rank === 1 ? 'legendary-light' : rank === 2 ? 'rare-light' : 'epic-light';
}

// Tandai baris milik user + siapkan podium/rest
const marked = computed(() => top.value.map(r => ({ ...r, me: r.id === me.value?.id })));
const podium = computed(() => marked.value.slice(0, 3));
const rest = computed(() => marked.value.slice(3));

async function fetchLeaderboard() {
  loading.value = true;
  try {
    const res = await fetch(`/api/leaderboard?metric=${metric.value}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await res.json();
    if (res.ok) { top.value = data.top; me.value = data.me; }
  } catch (e) { /* biarkan kosong */ }
  finally { loading.value = false; }
}

function setMetric(m) {
  if (metric.value === m) return;
  metric.value = m;
  fetchLeaderboard();
}

onMounted(fetchLeaderboard);
</script>
