<template>
  <div class="max-w-5xl mx-auto px-4 py-6">
    <h1 class="text-xl font-bold mb-4">🛡️ Admin Panel — Manajemen Kartu</h1>

    <!-- Login form -->
    <div v-if="!adminLoggedIn" class="glass-panel p-6 max-w-sm mx-auto">
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Admin Secret</label>
          <input
            v-model="secret"
            type="password"
            class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Masukkan admin secret"
            required
          />
        </div>
        <div v-if="loginError" class="text-red-400 text-sm">{{ loginError }}</div>
        <button type="submit" :disabled="loading" class="btn-primary w-full">
          {{ loading ? '...' : 'Login Admin' }}
        </button>
      </form>
    </div>

    <!-- Admin Dashboard -->
    <div v-else>
      <div class="flex justify-between items-center mb-4">
        <p class="text-sm text-green-400">✅ Admin — {{ cards.length }} kartu</p>
        <button @click="showAddForm = !showAddForm" class="btn-primary text-sm">
          {{ showAddForm ? 'Tutup Form' : '+ Tambah Kartu' }}
        </button>
      </div>

      <!-- Add/Edit Form -->
      <div v-if="showAddForm" class="glass-panel p-4 mb-4 space-y-3">
        <h3 class="font-semibold">{{ editingCard ? 'Edit Kartu' : 'Tambah Kartu Baru' }}</h3>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Nama</label>
            <input v-model="form.name" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" placeholder="Nama kucing meme" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Rarity</label>
            <select v-model="form.rarity" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
              <option>Common</option><option>Rare</option><option>Epic</option><option>Legendary</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Hype Score</label>
            <input v-model.number="form.hypeScore" type="number" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Likes/detik</label>
            <input v-model.number="form.likesPerSec" type="number" step="0.1" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Deskripsi</label>
          <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" placeholder="Deskripsi singkat..."></textarea>
        </div>
        <div class="flex gap-2">
          <button @click="handleSave" :disabled="saving" class="btn-primary text-sm">
            {{ saving ? 'Menyimpan...' : (editingCard ? 'Update' : 'Tambah') }}
          </button>
          <button @click="resetForm" class="px-4 py-2 bg-gray-700 rounded-lg text-sm">Batal</button>
        </div>
        <div v-if="formError" class="text-red-400 text-sm">{{ formError }}</div>
      </div>

      <!-- Cards Table -->
      <div class="glass-panel overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-800">
            <tr class="text-left text-gray-400">
              <th class="p-3">Nama</th>
              <th class="p-3">Rarity</th>
              <th class="p-3">Hype</th>
              <th class="p-3">Likes/s</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="card in cards" :key="card.id" class="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td class="p-3">
                <div class="flex items-center gap-2">
                  <span>{{ card.name }}</span>
                  <span v-if="card.isPlaceholderImage" class="text-xs bg-yellow-900/50 text-yellow-400 px-1.5 py-0.5 rounded">Placeholder</span>
                </div>
              </td>
              <td class="p-3">
                <span class="rarity-badge" :class="'rarity-' + card.rarity.toLowerCase()">{{ card.rarity }}</span>
              </td>
              <td class="p-3">{{ card.hypeScore }}</td>
              <td class="p-3">{{ card.likesPerSec }}</td>
              <td class="p-3">
                <span :class="card.isActive ? 'text-green-400' : 'text-red-400'">
                  {{ card.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="p-3">
                <div class="flex gap-1">
                  <button @click="editCard(card)" class="px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs">Edit</button>
                  <button v-if="card.isActive" @click="handleDelete(card.id)" class="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs">Nonaktifkan</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex justify-center gap-2 mt-4">
        <button @click="page--" :disabled="page <= 1" class="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-50">←</button>
        <span class="px-3 py-1 text-sm text-gray-400">{{ page }}</span>
        <button @click="page++" :disabled="cards.length < limit" class="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-50">→</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const secret = ref('');
const adminLoggedIn = ref(false);
const loginError = ref('');
const loading = ref(false);
const saving = ref(false);
const formError = ref('');

const cards = ref([]);
const page = ref(1);
const limit = 20;

const showAddForm = ref(false);
const editingCard = ref(null);
const form = ref({
  name: '', description: '', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8,
});

async function handleLogin() {
  loading.value = true;
  loginError.value = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secret.value }),
    });
    if (!res.ok) throw new Error('Forbidden');
    adminLoggedIn.value = true;
    fetchCards();
  } catch (e) {
    loginError.value = 'Secret salah.';
  } finally {
    loading.value = false;
  }
}

async function fetchCards() {
  try {
    const res = await fetch(`/api/admin/cards?page=${page.value}&limit=${limit}`);
    const data = await res.json();
    if (res.ok) cards.value = data.cards;
  } catch (e) {
    console.error('Fetch cards error:', e);
  }
}

async function handleSave() {
  saving.value = true;
  formError.value = '';
  try {
    const url = editingCard.value
      ? `/api/admin/cards/${editingCard.value.id}`
      : '/api/admin/cards';
    const method = editingCard.value ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    });

    if (!res.ok) {
      const d = await res.json();
      formError.value = d.message || 'Gagal menyimpan.';
      return;
    }

    resetForm();
    fetchCards();
  } catch (e) {
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}

function editCard(card) {
  editingCard.value = card;
  form.value = {
    name: card.name,
    description: card.description,
    rarity: card.rarity,
    hypeScore: card.hypeScore,
    likesPerSec: card.likesPerSec,
  };
  showAddForm.value = true;
}

async function handleDelete(id) {
  if (!confirm('Nonaktifkan kartu ini?')) return;
  try {
    await fetch(`/api/admin/cards/${id}`, { method: 'DELETE' });
    fetchCards();
  } catch (e) {
    console.error('Delete error:', e);
  }
}

function resetForm() {
  showAddForm.value = false;
  editingCard.value = null;
  form.value = { name: '', description: '', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8 };
  formError.value = '';
}

watch(page, fetchCards);
onMounted(() => { if (adminLoggedIn.value) fetchCards(); });
</script>
