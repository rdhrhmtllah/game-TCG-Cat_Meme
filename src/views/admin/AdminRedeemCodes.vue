<template>
  <div class="p-4 lg:p-6 animate-fade-in">
    <div class="premium-header mb-5">
      <div class="premium-header-icon text-accent"><span class="text-xl">🎁</span></div>
      <div>
        <h1 class="premium-header-title text-2xl">Redeem Codes</h1>
        <p class="text-muted text-xs mt-0.5">Kode promo coin dari developer</p>
      </div>
    </div>

    <!-- Form buat kode -->
    <div class="glass-panel-strong p-5 rounded-2xl mb-6">
      <h2 class="text-sm font-display font-bold mb-3">➕ Buat Kode Baru</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="block text-[11px] text-muted mb-1 font-display uppercase tracking-wider">Kode</label>
          <div class="flex gap-2">
            <input v-model="form.code" maxlength="40" class="input-premium text-sm flex-1 uppercase tracking-wider" placeholder="LAUNCH100" />
            <button @click="genCode" class="glass-panel px-3 rounded-lg text-xs font-display hover:bg-white/5" title="Acak">🎲</button>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-muted mb-1 font-display uppercase tracking-wider">Hadiah Coin</label>
          <input v-model.number="form.coinReward" type="number" min="1" class="input-premium text-sm" placeholder="1000" />
        </div>
        <div>
          <label class="block text-[11px] text-muted mb-1 font-display uppercase tracking-wider">Batas Total <span class="normal-case">(kosong = tak terbatas)</span></label>
          <input v-model.number="form.maxUses" type="number" min="1" class="input-premium text-sm" placeholder="tak terbatas" />
        </div>
        <div>
          <label class="block text-[11px] text-muted mb-1 font-display uppercase tracking-wider">Mulai</label>
          <input v-model="form.startsAt" type="datetime-local" class="input-premium text-sm" />
        </div>
        <div>
          <label class="block text-[11px] text-muted mb-1 font-display uppercase tracking-wider">Selesai</label>
          <input v-model="form.endsAt" type="datetime-local" class="input-premium text-sm" />
        </div>
        <div class="flex items-end">
          <button @click="createCode" :disabled="creating" class="btn-primary w-full font-display text-sm">
            {{ creating ? '⏳ Membuat…' : '✨ Buat Kode' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Daftar kode -->
    <div v-if="loading" class="glass-panel p-10 text-center text-muted text-sm">⏳ Memuat kode…</div>
    <div v-else-if="codes.length === 0" class="glass-panel p-10 text-center text-muted text-sm">Belum ada kode. Buat di atas.</div>
    <div v-else class="glass-panel overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-white/5">
          <tr class="text-left text-muted text-xs font-display uppercase tracking-wider">
            <th class="p-3">Kode</th>
            <th class="p-3">Coin</th>
            <th class="p-3">Dipakai</th>
            <th class="p-3 hidden md:table-cell">Berlaku</th>
            <th class="p-3">Status</th>
            <th class="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in codes" :key="c.id" class="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
            <td class="p-3 font-display font-bold tracking-wider text-accent-soft">{{ c.code }}</td>
            <td class="p-3 tabular-nums text-legendary-light">{{ fmt(c.coinReward) }} 🪙</td>
            <td class="p-3 tabular-nums">{{ c.usedCount }}<span class="text-muted">/{{ c.maxUses ?? '∞' }}</span></td>
            <td class="p-3 hidden md:table-cell text-[11px] text-muted">{{ fmtDate(c.startsAt) }} → {{ fmtDate(c.endsAt) }}</td>
            <td class="p-3">
              <span class="rarity-badge text-[9px]" :class="statusClass(c)">{{ statusLabel(c) }}</span>
            </td>
            <td class="p-3">
              <div class="flex gap-1.5">
                <button @click="toggleActive(c)" class="px-2.5 py-1 rounded text-xs font-display"
                  :class="c.isActive ? 'bg-amber-900/30 hover:bg-amber-900/60 text-amber-400' : 'bg-green-900/30 hover:bg-green-900/60 text-green-400'">
                  {{ c.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
                <button @click="deleteCode(c)" class="px-2.5 py-1 rounded text-xs font-display bg-red-900/30 hover:bg-red-900/60 text-red-400">Hapus</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from '@/composables/useToast.js';

const toast = useToast();

const codes = ref([]);
const loading = ref(true);
const creating = ref(false);

function pad(n) { return String(n).padStart(2, '0'); }
function toLocalInput(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
const now = new Date();
const weekLater = new Date(now.getTime() + 7 * 864e5);

const form = ref({
  code: '',
  coinReward: 1000,
  maxUses: null,
  startsAt: toLocalInput(now),
  endsAt: toLocalInput(weekLater),
});

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  form.value.code = s;
}

async function fetchCodes() {
  loading.value = true;
  try {
    const res = await fetch('/api/admin/redeem-codes');
    if (res.ok) codes.value = (await res.json()).codes;
    else toast.error('Gagal memuat kode.');
  } catch { toast.error('Gagal memuat kode.'); }
  finally { loading.value = false; }
}

async function createCode() {
  if (creating.value) return;
  if (!form.value.code.trim()) { toast.error('Kode wajib diisi.'); return; }
  if (!form.value.coinReward || form.value.coinReward < 1) { toast.error('Hadiah coin minimal 1.'); return; }
  creating.value = true;
  try {
    const body = {
      code: form.value.code.trim().toUpperCase(),
      coinReward: form.value.coinReward,
      maxUses: form.value.maxUses || null,
      startsAt: new Date(form.value.startsAt).toISOString(),
      endsAt: new Date(form.value.endsAt).toISOString(),
      isActive: true,
    };
    const res = await fetch('/api/admin/redeem-codes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal membuat kode.');
    toast.success('Kode dibuat!');
    form.value.code = '';
    fetchCodes();
  } catch (e) { toast.error(e.message || 'Gagal membuat kode.'); }
  finally { creating.value = false; }
}

async function toggleActive(c) {
  try {
    const res = await fetch('/api/admin/redeem-codes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Gagal.');
    c.isActive = !c.isActive;
  } catch (e) { toast.error(e.message || 'Gagal.'); }
}

async function deleteCode(c) {
  if (!confirm(`Hapus kode ${c.code}? (riwayat pemakaian ikut terhapus)`)) return;
  try {
    const res = await fetch('/api/admin/redeem-codes', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Gagal.');
    codes.value = codes.value.filter(x => x.id !== c.id);
    toast.success('Kode dihapus.');
  } catch (e) { toast.error(e.message || 'Gagal.'); }
}

function statusLabel(c) {
  if (!c.isActive) return 'Nonaktif';
  const n = Date.now();
  if (n < new Date(c.startsAt).getTime()) return 'Terjadwal';
  if (n > new Date(c.endsAt).getTime()) return 'Kadaluarsa';
  if (c.maxUses != null && c.usedCount >= c.maxUses) return 'Habis';
  return 'Aktif';
}
function statusClass(c) {
  const s = statusLabel(c);
  return {
    'Aktif': 'bg-green-500/20 text-green-300 border border-green-500/30',
    'Terjadwal': 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
    'Kadaluarsa': 'bg-white/10 text-muted border border-white/10',
    'Habis': 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    'Nonaktif': 'bg-red-500/20 text-red-300 border border-red-500/30',
  }[s] || '';
}

function fmt(n) { return Number(n ?? 0).toLocaleString('id-ID'); }
function fmtDate(d) {
  try { return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

onMounted(fetchCodes);
</script>
