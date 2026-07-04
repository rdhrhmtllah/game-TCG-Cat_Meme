<template>
  <div class="min-h-screen bg-[#070B1A]">
    <!-- LOGIN SCREEN -->
    <div v-if="!adminLoggedIn" class="flex items-center justify-center min-h-screen px-4">
      <div class="glass-panel-strong p-8 w-full max-w-md animate-scale-in">
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto rounded-2xl glass-panel flex items-center justify-center mb-4">
            <span class="text-3xl">🛡️</span>
          </div>
          <h1 class="text-2xl font-display font-bold bg-gradient-to-r from-accent via-epic to-legendary bg-clip-text text-transparent">
            Admin Command Center
          </h1>
          <p class="text-muted text-sm mt-1">MemeCats Card Management</p>
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

    <!-- ADMIN DASHBOARD -->
    <div v-else class="flex min-h-screen">
      <!-- SIDEBAR -->
      <aside class="w-64 flex-shrink-0 border-r border-white/5 bg-[#060A16] hidden lg:flex flex-col">
        <div class="p-5 border-b border-white/5">
          <h1 class="font-display font-bold text-lg bg-gradient-to-r from-accent via-epic to-legendary bg-clip-text text-transparent">
            🛡️ Card Studio
          </h1>
          <p class="text-muted text-xs mt-0.5">Admin Command Center</p>
        </div>

        <!-- Nav Links -->
        <nav class="flex-1 p-3 space-y-1">
          <button @click="activeTab = 'cards'" class="sidebar-btn" :class="{ 'sidebar-btn-active': activeTab === 'cards' }">
            <span>🃏</span> All Cards
          </button>
          <button @click="openEditor(null)" class="sidebar-btn" :class="{ 'sidebar-btn-active': activeTab === 'editor' }">
            <span>➕</span> New Card
          </button>
          <button @click="activeTab = 'ai'" class="sidebar-btn" :class="{ 'sidebar-btn-active': activeTab === 'ai' }">
            <span>🤖</span> AI Auto-Create
          </button>
        </nav>

        <!-- Rarity Filter -->
        <div class="p-4 border-t border-white/5">
          <p class="text-xs font-display font-semibold text-muted mb-2 uppercase tracking-wider">Filter Rarity</p>
          <div class="space-y-1">
            <label v-for="r in rarityOptions" :key="r.value" class="flex items-center gap-2 cursor-pointer group py-1">
              <input type="checkbox" :value="r.value" v-model="filterRarities"
                class="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-accent focus:ring-accent/30" />
              <span class="text-sm group-hover:text-white transition-colors" :class="r.colorClass">{{ r.label }}</span>
              <span class="text-xs text-muted ml-auto">({{ getCountForRarity(r.value) }})</span>
            </label>
          </div>
          <div class="mt-3 space-y-1">
            <p class="text-xs font-display font-semibold text-muted mb-1 uppercase tracking-wider">Status</p>
            <label v-for="s in statusOptions" :key="s.value" class="flex items-center gap-2 cursor-pointer group py-1">
              <input type="radio" :value="s.value" v-model="filterStatus" name="status"
                class="w-3.5 h-3.5 border-gray-600 bg-gray-800 text-accent focus:ring-accent/30" />
              <span class="text-sm text-secondary group-hover:text-white transition-colors">{{ s.label }}</span>
            </label>
          </div>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="flex-1 overflow-y-auto">
        <!-- Mobile Header -->
        <div class="lg:hidden p-4 border-b border-white/5 flex items-center justify-between">
          <h1 class="font-display font-bold text-lg">🛡️ Card Studio</h1>
          <button @click="mobileMenuOpen = !mobileMenuOpen" class="text-muted p-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Mobile Menu Dropdown -->
        <div v-if="mobileMenuOpen" class="lg:hidden glass-panel m-3 p-3 space-y-1 animate-slide-down">
          <button @click="activeTab = 'cards'; mobileMenuOpen = false" class="sidebar-btn w-full">🃏 All Cards</button>
          <button @click="openEditor(null); mobileMenuOpen = false" class="sidebar-btn w-full">➕ New Card</button>
          <button @click="activeTab = 'ai'; mobileMenuOpen = false" class="sidebar-btn w-full">🤖 AI Auto-Create</button>
          <div class="flex gap-2 flex-wrap pt-2">
            <button v-for="r in rarityOptions" :key="r.value"
              @click="toggleRarityFilter(r.value)"
              class="px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-all border"
              :class="filterRarities.includes(r.value) ? r.activeFilterClass : 'border-white/8 text-muted'">
              {{ r.label }}
            </button>
          </div>
        </div>

        <!-- STATS DASHBOARD -->
        <div class="p-4 lg:p-6 border-b border-white/5">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div class="glass-panel p-3 text-center">
              <p class="text-2xl font-display font-bold">{{ stats.totals.total }}</p>
              <p class="text-xs text-muted font-display">Total</p>
            </div>
            <div class="glass-panel p-3 text-center">
              <p class="text-2xl font-display font-bold text-green-400">{{ stats.totals.active }}</p>
              <p class="text-xs text-muted font-display">Active</p>
            </div>
            <div v-for="r in ['Common', 'Rare', 'Epic', 'Legendary']" :key="'stat-'+r" class="glass-panel p-3 text-center">
              <p class="text-2xl font-display font-bold" :class="rarityTextColor(r)">{{ getCountForRarity(r) }}</p>
              <p class="text-xs font-display" :class="rarityTextColor(r)" style="opacity: 0.7">{{ r }}</p>
            </div>
          </div>
        </div>

        <!-- AI AUTO-CREATE TAB -->
        <div v-if="activeTab === 'ai'" class="p-4 lg:p-6 animate-fade-in">
          <div class="max-w-2xl mx-auto">
            <div class="glass-panel-strong p-6">
              <div class="flex items-center gap-3 mb-5">
                <div class="w-12 h-12 rounded-xl glass-panel flex items-center justify-center">
                  <span class="text-2xl">🤖</span>
                </div>
                <div>
                  <h2 class="text-lg font-display font-bold">AI Auto-Create Card</h2>
                  <p class="text-muted text-sm">Ketik nama/tema → AI generate semua properties → upload foto → done!</p>
                </div>
              </div>

              <div class="space-y-4">
                <!-- Image Upload (Multimodal AI) -->
                <div>
                  <label class="block text-xs font-display font-semibold text-secondary mb-1.5">Upload Foto Kucing Meme (AI akan mendeteksi meme otomatis & mencari infonya di internet)</label>
                  <div
                    class="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 relative group overflow-hidden"
                    :class="[
                      aiIsDragging ? 'border-primary bg-primary/10' : 'border-surface-border hover:border-primary/50 bg-surface-elevated/40',
                      aiImagePreview ? 'py-4' : 'py-7'
                    ]"
                    @dragover.prevent="aiIsDragging = true"
                    @dragleave.prevent="aiIsDragging = false"
                    @drop.prevent="handleAiImageDrop"
                    @click="triggerAiImageInput"
                  >
                    <input
                      type="file"
                      ref="aiImageInputRef"
                      class="hidden"
                      accept="image/*"
                      @change="handleAiImageFileChange"
                    />
                    
                    <div v-if="aiImagePreview" class="relative flex flex-col items-center">
                      <img :src="aiImagePreview" class="max-h-40 rounded-lg shadow-lg mb-2 object-contain border border-surface-border" />
                      <button
                        @click.stop="clearAiImage"
                        class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md transition-all duration-200"
                        title="Hapus foto"
                      >
                        ✕
                      </button>
                      <p class="text-xs text-muted font-display max-w-xs truncate">{{ aiImageFileName }}</p>
                    </div>
                    
                    <div v-else class="space-y-2 flex flex-col items-center">
                      <span class="text-3xl filter drop-shadow">📷</span>
                      <div class="space-y-1">
                        <p class="text-sm font-display text-secondary">Tarik foto kucing meme ke sini atau klik untuk browse</p>
                        <p class="text-xs text-muted">AI akan mengidentifikasi meme & melengkapi seluruh data kartu secara ajaib!</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-display font-semibold text-secondary mb-1.5">Nama / Tema / Instruksi Tambahan (opsional)</label>
                  <input v-model="aiPrompt" class="input-premium" placeholder="contoh: Jadikan tipe Air, beri serangan tema es, atau biarkan kosong..." />
                </div>
                <div>
                  <label class="block text-xs font-display font-semibold text-secondary mb-1.5">Detail Tambahan (opsional)</label>
                  <textarea v-model="aiExtraPrompt" class="input-premium" rows="2" placeholder="contoh: buatkan epic card dengan element fire, serangan tema dragon..."></textarea>
                </div>
                <button 
                  @click="handleAiAutoCreate" 
                  :disabled="aiLoading || (!aiPrompt.trim() && !aiImagePreview)" 
                  class="btn-primary w-full font-display flex items-center justify-center gap-2"
                >
                  <span v-if="aiLoading">🔮</span>
                  <span>{{ aiLoading ? 'Menghubungkan ke Internet & Membuat Kartu...' : '✨ Scan Foto & Generate Kartu' }}</span>
                </button>

                <div v-if="aiResult" class="glass-panel p-4 mt-4 space-y-3 animate-slide-up">
                  <div class="flex items-center justify-between">
                    <h3 class="font-display font-semibold text-green-400">✅ Card Generated!</h3>
                    <button @click="applyAiResult" class="btn-primary text-sm px-4 py-2">
                      📝 Open in Editor
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div><span class="text-muted">Name:</span> {{ aiResult.name }}</div>
                    <div><span class="text-muted">Rarity:</span>
                      <span class="rarity-badge text-[9px] ml-1" :class="'rarity-' + (aiResult.rarity || 'Common').toLowerCase()">{{ aiResult.rarity }}</span>
                    </div>
                    <div><span class="text-muted">Element:</span> {{ aiResult.element }}</div>
                    <div><span class="text-muted">Hype:</span> {{ aiResult.hypeScore }}</div>
                    <div><span class="text-muted">Attack:</span> {{ aiResult.attack }}</div>
                    <div><span class="text-muted">Defense:</span> {{ aiResult.defense }}</div>
                  </div>
                  <p class="text-sm text-secondary italic">"{{ aiResult.description }}"</p>
                </div>
                <div v-if="aiError" class="text-red-400 text-sm glass-panel p-3 rounded-lg">{{ aiError }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARDS LIST TAB -->
        <div v-if="activeTab === 'cards'" class="p-4 lg:p-6 animate-fade-in">
          <!-- Toolbar -->
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <div class="flex-1 min-w-[200px]">
              <input v-model="searchQuery" @input="debouncedFetch" class="input-premium w-full" placeholder="🔍 Cari kartu..."/>
            </div>
            <div class="flex items-center gap-2">
              <select v-model="sortBy" @change="fetchCards" class="input-premium text-sm py-2 px-3 w-auto">
                <option value="createdAt">Terbaru</option>
                <option value="name">Nama</option>
                <option value="rarity">Rarity</option>
                <option value="hypeScore">Hype Score</option>
                <option value="attack">Attack</option>
              </select>
              <button @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'; fetchCards()" class="glass-panel p-2 rounded-lg hover:bg-white/5 transition-colors" :title="sortDir === 'desc' ? 'Descending' : 'Ascending'">
                <span class="text-sm">{{ sortDir === 'desc' ? '⬇️' : '⬆️' }}</span>
              </button>
              <button @click="viewMode = viewMode === 'grid' ? 'table' : 'grid'" class="glass-panel p-2 rounded-lg hover:bg-white/5 transition-colors">
                <span class="text-sm">{{ viewMode === 'grid' ? '📋' : '🃏' }}</span>
              </button>
              <button @click="openEditor(null)" class="btn-primary text-sm px-4 py-2 font-display">
                ➕ New
              </button>
            </div>
          </div>

          <!-- Bulk Actions Bar -->
          <div v-if="selectedCardIds.length > 0" class="glass-panel p-3 mb-4 flex items-center justify-between animate-slide-up">
            <span class="text-sm text-secondary font-display">{{ selectedCardIds.length }} kartu dipilih</span>
            <div class="flex gap-2">
              <button @click="handleBulkAction('activate')" class="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-display">✅ Activate</button>
              <button @click="handleBulkAction('deactivate')" class="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-xs font-display">🚫 Deactivate</button>
              <button @click="selectedCardIds = []" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-display">Cancel</button>
            </div>
          </div>

          <!-- Mobile Filter Pills -->
          <div class="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            <button v-for="r in rarityOptions" :key="'m-'+r.value"
              @click="toggleRarityFilter(r.value)"
              class="px-3 py-1.5 rounded-full text-xs font-display font-semibold whitespace-nowrap transition-all border flex-shrink-0"
              :class="filterRarities.includes(r.value) ? r.activeFilterClass : 'border-white/8 text-muted hover:border-white/15'">
              {{ r.label }}
            </button>
          </div>

          <!-- GRID VIEW -->
          <div v-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="card in cards" :key="card.id"
              class="relative cursor-pointer group animate-fade-in"
              :class="{ 'opacity-40': !card.isActive }"
              @click="openEditor(card)">
              <!-- Select checkbox -->
              <label class="absolute top-2 left-2 z-20 cursor-pointer" @click.stop>
                <input type="checkbox" :value="card.id" v-model="selectedCardIds"
                  class="w-4 h-4 rounded border-gray-600 bg-gray-800/80 text-accent focus:ring-accent/30" />
              </label>

              <div class="aspect-[5/7] rounded-xl card-frame card-hover relative"
                :class="'card-frame-' + card.rarity.toLowerCase()">
                <div class="w-full h-full rounded-lg overflow-hidden bg-surface-card relative">
                  <img v-if="card.imageUrl && !card.isPlaceholderImage" :src="card.imageUrl" :alt="card.name"
                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  <div v-else class="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-b from-surface-card to-surface">
                    {{ rarityEmoji(card.rarity) }}
                  </div>
                  <div class="holo-overlay"></div>
                </div>
                <!-- Status badge -->
                <span v-if="!card.isActive" class="absolute top-2 right-2 bg-red-900/80 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">OFF</span>
                <span v-if="card.isPlaceholderImage" class="absolute bottom-2 right-2 bg-yellow-900/80 text-yellow-300 text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">📷</span>
              </div>
              <div class="mt-1.5 text-center">
                <p class="text-xs font-display font-semibold truncate">{{ card.name }}</p>
                <span class="rarity-badge text-[8px] py-0.5 px-1.5 mt-0.5 inline-flex" :class="'rarity-' + card.rarity.toLowerCase()">
                  {{ card.rarity }}
                </span>
              </div>
            </div>
          </div>

          <!-- TABLE VIEW -->
          <div v-else class="glass-panel overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="border-b border-white/5">
                <tr class="text-left text-muted text-xs font-display uppercase tracking-wider">
                  <th class="p-3 w-8">
                    <input type="checkbox" @change="toggleSelectAll" :checked="selectedCardIds.length === cards.length && cards.length > 0"
                      class="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-accent" />
                  </th>
                  <th class="p-3">Kartu</th>
                  <th class="p-3">Rarity</th>
                  <th class="p-3">Element</th>
                  <th class="p-3">Hype</th>
                  <th class="p-3">L/s</th>
                  <th class="p-3">Atk</th>
                  <th class="p-3">Def</th>
                  <th class="p-3">Status</th>
                  <th class="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="card in cards" :key="'t-'+card.id" class="border-b border-white/3 hover:bg-white/3 transition-colors">
                  <td class="p-3">
                    <input type="checkbox" :value="card.id" v-model="selectedCardIds"
                      class="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-accent" />
                  </td>
                  <td class="p-3">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-10 rounded overflow-hidden bg-surface-card flex-shrink-0 border" :class="'border-' + card.rarity.toLowerCase() + '/30'">
                        <img v-if="card.imageUrl && !card.isPlaceholderImage" :src="card.imageUrl" class="w-full h-full object-cover" />
                        <div v-else class="w-full h-full flex items-center justify-center text-sm">{{ rarityEmoji(card.rarity) }}</div>
                      </div>
                      <div>
                        <p class="font-display font-semibold text-sm">{{ card.name }}</p>
                        <p class="text-muted text-[10px] truncate max-w-[180px]">{{ card.description }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="p-3"><span class="rarity-badge text-[9px]" :class="'rarity-' + card.rarity.toLowerCase()">{{ card.rarity }}</span></td>
                  <td class="p-3 text-xs">{{ elementEmoji(card.element) }} {{ card.element }}</td>
                  <td class="p-3 font-display font-semibold">{{ card.hypeScore }}</td>
                  <td class="p-3">{{ card.likesPerSec }}</td>
                  <td class="p-3">{{ card.attack }}</td>
                  <td class="p-3">{{ card.defense }}</td>
                  <td class="p-3">
                    <span :class="card.isActive ? 'text-green-400' : 'text-red-400'" class="text-xs font-display">
                      {{ card.isActive ? '● Active' : '● Off' }}
                    </span>
                  </td>
                  <td class="p-3">
                    <div class="flex gap-1">
                      <button @click="openEditor(card)" class="px-2.5 py-1 bg-accent/20 hover:bg-accent/40 text-accent-soft rounded text-xs font-display transition-colors">Edit</button>
                      <button v-if="card.isActive" @click="handleToggleActive(card)" class="px-2.5 py-1 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded text-xs font-display transition-colors">Off</button>
                      <button v-else @click="handleToggleActive(card)" class="px-2.5 py-1 bg-green-900/30 hover:bg-green-900/60 text-green-400 rounded text-xs font-display transition-colors">On</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-center gap-2 mt-6">
            <button @click="page = Math.max(1, page - 1)" :disabled="page <= 1" class="glass-panel px-3 py-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5 transition-colors text-sm font-display">← Prev</button>
            <span class="px-4 py-1.5 text-sm text-muted font-display">{{ page }} / {{ totalPages }}</span>
            <button @click="page = Math.min(totalPages, page + 1)" :disabled="page >= totalPages" class="glass-panel px-3 py-1.5 rounded-lg disabled:opacity-30 hover:bg-white/5 transition-colors text-sm font-display">Next →</button>
          </div>
        </div>
      </main>
    </div>

    <!-- CARD EDITOR MODAL -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEditor" class="modal-overlay flex items-start justify-center p-4 overflow-y-auto" @click.self="closeEditor">
          <div class="modal-content w-full max-w-6xl my-8 glass-panel-strong overflow-hidden animate-scale-in">
            <!-- Editor Header -->
            <div class="flex items-center justify-between p-5 border-b border-white/5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl glass-panel flex items-center justify-center">
                  <span class="text-xl">{{ editingCard ? '✏️' : '🆕' }}</span>
                </div>
                <div>
                  <h2 class="font-display font-bold text-lg">{{ editingCard ? 'Edit Card' : 'Create New Card' }}</h2>
                  <p class="text-muted text-xs">{{ editingCard ? `ID: ${editingCard.id}` : 'Craft your TCG card from scratch' }}</p>
                </div>
              </div>
              <button @click="closeEditor" class="text-muted hover:text-white p-2 glass-panel rounded-lg transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="flex flex-col lg:flex-row">
              <!-- LEFT: FORM -->
              <div class="flex-1 p-5 lg:p-6 overflow-y-auto max-h-[75vh] space-y-5 lg:border-r lg:border-white/5">

                <!-- Basic Info -->
                <section>
                  <h3 class="text-sm font-display font-bold text-secondary mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px]">1</span>
                    Basic Info
                  </h3>
                  <div class="space-y-3">
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Card Name *</label>
                      <input v-model="form.name" class="input-premium" placeholder="contoh: Galaxy Ninja Cat" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Rarity *</label>
                      <div class="grid grid-cols-4 gap-2">
                        <button v-for="r in ['Common', 'Rare', 'Epic', 'Legendary']" :key="r"
                          @click="form.rarity = r; applyRarityPreset(r)"
                          class="py-2.5 rounded-xl text-xs font-display font-bold transition-all border text-center"
                          :class="form.rarity === r
                            ? 'rarity-' + r.toLowerCase() + ' border-transparent shadow-lg'
                            : 'border-white/8 text-muted hover:border-white/15'">
                          {{ r }}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Foil Style *</label>
                      <select v-model="form.foilStyle" class="input-premium text-sm">
                        <option value="Standard">Standard (Matte)</option>
                        <option value="Holo">Holo (Art Window Only)</option>
                        <option value="Reverse Holo">Reverse Holo (Frame Only)</option>
                        <option value="Full Art ex">Full Art ex (Glassmorphic)</option>
                        <option value="Secret Gold">Secret Gold (Gilded)</option>
                        <option value="Special Illustration">Special Illustration (Parallax + 3D Particles)</option>
                      </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs text-muted mb-1 font-display">Element</label>
                        <select v-model="form.element" class="input-premium text-sm">
                          <option v-for="e in elementOptions" :key="e.value" :value="e.value">{{ e.emoji }} {{ e.label }}</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs text-muted mb-1 font-display">Status</label>
                        <div class="flex items-center gap-3 h-[42px]">
                          <button @click="form.isActive = !form.isActive"
                            class="relative w-11 h-6 rounded-full transition-colors duration-200"
                            :class="form.isActive ? 'bg-green-600' : 'bg-gray-700'">
                            <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                              :class="form.isActive ? 'translate-x-5' : 'translate-x-0'"></span>
                          </button>
                          <span class="text-sm" :class="form.isActive ? 'text-green-400' : 'text-muted'">
                            {{ form.isActive ? 'Active' : 'Inactive' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- Artwork -->
                <section>
                  <h3 class="text-sm font-display font-bold text-secondary mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-rare/20 text-rare flex items-center justify-center text-[10px]">2</span>
                    Artwork
                  </h3>
                  <div
                    class="relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer hover:border-accent/50"
                    :class="isDragging ? 'border-accent bg-accent/5' : 'border-white/10'"
                    @click="$refs.fileInput.click()"
                    @dragover.prevent="isDragging = true"
                    @dragleave="isDragging = false"
                    @drop.prevent="handleDrop">
                    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
                    <div v-if="imagePreview" class="flex items-center gap-3">
                      <img :src="imagePreview" class="w-20 h-24 object-cover rounded-lg border border-white/10" />
                      <div class="text-left">
                        <p class="text-sm font-display font-semibold text-green-400">✅ Image loaded</p>
                        <p class="text-xs text-muted mt-0.5">Click or drop to replace</p>
                        <button @click.stop="removeImage" class="text-xs text-red-400 hover:text-red-300 mt-1 font-display">🗑️ Remove</button>
                      </div>
                    </div>
                    <div v-else>
                      <div class="w-12 h-12 mx-auto rounded-xl glass-panel flex items-center justify-center mb-2">
                        <span class="text-2xl">📤</span>
                      </div>
                      <p class="text-sm text-secondary font-display">Drop image here or click to browse</p>
                      <p class="text-xs text-muted mt-1">PNG, JPG, WebP • Max 5MB</p>
                    </div>
                  </div>
                  <div class="mt-2">
                    <label class="block text-xs text-muted mb-1 font-display">Or paste image URL</label>
                    <input v-model="form.imageUrl" class="input-premium text-sm" placeholder="https://example.com/image.png" />
                  </div>
                </section>

                <!-- Image Positioning (only when image loaded) -->
                <section v-if="imagePreview || form.imageUrl">
                  <h3 class="text-sm font-display font-bold text-secondary mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">🎯</span>
                    Image Positioning
                    <button @click="resetImagePosition" class="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted hover:bg-white/10 hover:text-white transition-colors font-display">🔄 Reset</button>
                  </h3>
                  <div class="space-y-3">
                    <!-- Zoom -->
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <label class="text-xs text-muted font-display flex items-center gap-1">🔍 Zoom</label>
                        <span class="text-xs font-display font-semibold tabular-nums">{{ (form.imgZoom ?? 1.0).toFixed(2) }}x</span>
                      </div>
                      <input type="range" v-model.number="form.imgZoom" :min="0.5" :max="3.0" :step="0.05"
                        class="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        :style="{ background: `linear-gradient(to right, #22D3EE 0%, #22D3EE ${(((form.imgZoom ?? 1.0) - 0.5) / 2.5) * 100}%, rgba(255,255,255,0.06) ${(((form.imgZoom ?? 1.0) - 0.5) / 2.5) * 100}%, rgba(255,255,255,0.06) 100%)` }" />
                    </div>
                    <!-- Pan Horizontal -->
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <label class="text-xs text-muted font-display flex items-center gap-1">↔️ Pan Horizontal</label>
                        <span class="text-xs font-display font-semibold tabular-nums">{{ (form.imgOffsetX ?? 0.0) >= 0 ? '+' : '' }}{{ (form.imgOffsetX ?? 0.0).toFixed(2) }}</span>
                      </div>
                      <input type="range" v-model.number="form.imgOffsetX" :min="-1.0" :max="1.0" :step="0.01"
                        class="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        :style="{ background: `linear-gradient(to right, rgba(255,255,255,0.06) 0%, #A855F7 50%, rgba(255,255,255,0.06) 100%)` }" />
                    </div>
                    <!-- Pan Vertical -->
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <label class="text-xs text-muted font-display flex items-center gap-1">↕️ Pan Vertical</label>
                        <span class="text-xs font-display font-semibold tabular-nums">{{ (form.imgOffsetY ?? 0.0) >= 0 ? '+' : '' }}{{ (form.imgOffsetY ?? 0.0).toFixed(2) }}</span>
                      </div>
                      <input type="range" v-model.number="form.imgOffsetY" :min="-1.0" :max="1.0" :step="0.01"
                        class="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        :style="{ background: `linear-gradient(to right, rgba(255,255,255,0.06) 0%, #F59E0B 50%, rgba(255,255,255,0.06) 100%)` }" />
                    </div>
                  </div>
                </section>

                <!-- Card Stats -->
                <section>
                  <h3 class="text-sm font-display font-bold text-secondary mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-epic/20 text-epic flex items-center justify-center text-[10px]">3</span>
                    Card Stats
                    <button @click="applyRarityPreset(form.rarity)" class="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent-soft hover:bg-accent/25 transition-colors font-display">🎯 Auto Preset</button>
                  </h3>
                  <div class="space-y-3">
                    <div v-for="stat in statSliders" :key="stat.key">
                      <div class="flex items-center justify-between mb-1">
                        <label class="text-xs text-muted font-display">{{ stat.label }}</label>
                        <input v-model.number="form[stat.key]" type="number" :min="stat.min" :max="stat.max" :step="stat.step"
                          class="w-20 text-right bg-transparent border border-white/10 rounded px-2 py-0.5 text-sm font-display focus:border-accent/50 focus:outline-none" />
                      </div>
                      <input type="range" v-model.number="form[stat.key]" :min="stat.min" :max="stat.max" :step="stat.step"
                        class="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        :style="{ background: `linear-gradient(to right, ${stat.color} 0%, ${stat.color} ${(form[stat.key] - stat.min) / (stat.max - stat.min) * 100}%, rgba(255,255,255,0.06) ${(form[stat.key] - stat.min) / (stat.max - stat.min) * 100}%, rgba(255,255,255,0.06) 100%)` }" />
                    </div>
                  </div>
                </section>

                <!-- Card Frame Content -->
                <section>
                  <h3 class="text-sm font-display font-bold text-secondary mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-legendary/20 text-legendary flex items-center justify-center text-[10px]">4</span>
                    Card Frame Content
                  </h3>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Attack 1 Name</label>
                      <input v-model="form.attackName1" class="input-premium text-sm" placeholder="contoh: Viral Purr" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Attack 2 Name</label>
                      <input v-model="form.attackName2" class="input-premium text-sm" placeholder="contoh: Meme Surge" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Special Ability</label>
                      <input v-model="form.specialAbility" class="input-premium text-sm" placeholder="Nama ability" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Illustrator</label>
                      <input v-model="form.illustrator" class="input-premium text-sm" placeholder="AI Artist" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Weakness</label>
                      <select v-model="form.weakness" class="input-premium text-sm">
                        <option value="">None</option>
                        <option v-for="w in weaknessOptions" :key="w" :value="w">{{ w }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Resistance</label>
                      <select v-model="form.resistance" class="input-premium text-sm">
                        <option value="">None</option>
                        <option v-for="r in resistanceOptions" :key="r" :value="r">{{ r }}</option>
                      </select>
                    </div>
                  </div>
                  <div class="mt-3">
                    <label class="block text-xs text-muted mb-1 font-display">Special Ability Description</label>
                    <textarea v-model="form.specialDesc" class="input-premium text-sm" rows="2" placeholder="Deskripsi special ability..."></textarea>
                  </div>
                </section>

                <!-- Description -->
                <section>
                  <h3 class="text-sm font-display font-bold text-secondary mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-green-500/20 text-green-400 flex items-center justify-center text-[10px]">5</span>
                    Description / Flavor Text
                  </h3>
                  <textarea v-model="form.description" class="input-premium" rows="3" placeholder="Deskripsi kartu yang lucu dan menarik... (min 10 karakter)"></textarea>
                  <p class="text-xs text-muted mt-1">{{ form.description.length }}/255</p>
                </section>

                <!-- AI Assist (Add-on) -->
                <section class="glass-panel p-4">
                  <button @click="showAiAssist = !showAiAssist" class="flex items-center justify-between w-full text-left">
                    <h3 class="text-sm font-display font-bold text-secondary flex items-center gap-2">
                      <span class="text-lg">🤖</span> AI Assist <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent-soft font-display">Add-on</span>
                    </h3>
                    <span class="text-muted text-xs">{{ showAiAssist ? '▼' : '▶' }}</span>
                  </button>
                  <div v-if="showAiAssist" class="mt-3 space-y-3 animate-slide-down">
                    <div class="flex gap-2">
                      <input v-model="editorAiPrompt" class="input-premium flex-1 text-sm" placeholder="contoh: suggest attack names tema galaxy..." />
                      <button @click="handleEditorAiAssist" :disabled="editorAiLoading" class="btn-primary text-sm px-4 py-2 font-display flex-shrink-0">
                        {{ editorAiLoading ? '⏳' : '✨' }}
                      </button>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                      <button @click="quickAiAssist('modify-description')" :disabled="editorAiLoading" class="px-2.5 py-1 glass-panel text-xs text-muted hover:text-white transition-colors rounded-lg font-display">📝 Improve Desc</button>
                      <button @click="quickAiAssist('suggest-attacks')" :disabled="editorAiLoading" class="px-2.5 py-1 glass-panel text-xs text-muted hover:text-white transition-colors rounded-lg font-display">⚔️ Suggest Attacks</button>
                    </div>
                    <div v-if="editorAiResult" class="glass-panel p-3 text-sm space-y-2 animate-fade-in">
                      <p class="text-green-400 font-display text-xs font-semibold">💡 AI Suggestion:</p>
                      <pre class="text-secondary whitespace-pre-wrap text-xs overflow-x-auto">{{ JSON.stringify(editorAiResult, null, 2) }}</pre>
                      <button @click="applyEditorAiResult" class="btn-primary text-xs px-3 py-1.5 font-display">Apply Suggestion</button>
                    </div>
                    <div v-if="editorAiError" class="text-red-400 text-xs">{{ editorAiError }}</div>
                  </div>
                </section>

                <!-- Save Actions -->
                <div class="flex gap-3 pt-2">
                  <button @click="handleSave" :disabled="saving" class="btn-primary flex-1 font-display">
                    {{ saving ? '⏳ Menyimpan...' : (editingCard ? '💾 Update Card' : '✨ Create Card') }}
                  </button>
                  <button @click="closeEditor" class="btn-secondary px-6 font-display">Cancel</button>
                </div>
                <div v-if="formError" class="text-red-400 text-sm glass-panel p-3 rounded-lg text-center">{{ formError }}</div>
              </div>

              <!-- RIGHT: LIVE PREVIEW -->
              <div class="lg:w-[380px] p-5 lg:p-6 flex flex-col items-center bg-[#050914]">
                <h3 class="text-xs font-display font-semibold text-muted mb-3 uppercase tracking-wider w-full text-center">Live Preview</h3>
                <div class="w-full max-w-[260px]">
                  <!-- Card preview frame -->
                  <div class="aspect-[5/7] rounded-xl card-frame relative !overflow-visible"
                    :class="'card-frame-' + form.rarity.toLowerCase()">
                    <Card3D
                      :key="previewKey"
                      :image-url="imagePreview || form.imageUrl || ''"
                      :rarity="form.rarity"
                      :name="form.name || 'Card Name'"
                      :description="form.description || 'Card description...'"
                      :hype-score="form.hypeScore || 0"
                      :likes-per-sec="form.likesPerSec || 0"
                      :element="form.element"
                      :foil-style="form.foilStyle"
                      :img-zoom="form.imgZoom"
                      :img-offset-x="form.imgOffsetX"
                      :img-offset-y="form.imgOffsetY"
                      mode="full"
                      class="w-full h-full"
                    />
                  </div>
                </div>

                <!-- Stats Gauge -->
                <div class="w-full mt-5 space-y-2">
                  <h4 class="text-xs font-display font-semibold text-muted uppercase tracking-wider">Stats</h4>
                  <div v-for="stat in [
                    { label: 'Hype', value: form.hypeScore, max: 1000, color: '#A855F7' },
                    { label: 'Likes/s', value: form.likesPerSec, max: 25, color: '#38BDF8' },
                    { label: 'Attack', value: form.attack, max: 1000, color: '#F59E0B' },
                    { label: 'Defense', value: form.defense, max: 1000, color: '#10B981' },
                  ]" :key="stat.label" class="flex items-center gap-2">
                    <span class="text-[10px] text-muted font-display w-12 text-right">{{ stat.label }}</span>
                    <div class="flex-1 stat-bar-track">
                      <div class="stat-bar-fill" :style="{ width: Math.min(100, (stat.value / stat.max) * 100) + '%', background: stat.color, '--bar-color': stat.color + '80' }"></div>
                    </div>
                    <span class="text-[10px] font-display font-semibold w-8">{{ stat.value }}</span>
                  </div>
                </div>

                <!-- Card Info -->
                <div class="w-full mt-4 glass-panel p-3 text-xs space-y-1">
                  <div class="flex justify-between"><span class="text-muted">Element</span><span>{{ elementEmoji(form.element) }} {{ form.element }}</span></div>
                  <div class="flex justify-between"><span class="text-muted">Attack 1</span><span>{{ form.attackName1 || '(default)' }}</span></div>
                  <div class="flex justify-between"><span class="text-muted">Attack 2</span><span>{{ form.attackName2 || '(default)' }}</span></div>
                  <div class="flex justify-between"><span class="text-muted">Weakness</span><span>{{ form.weakness || '(default)' }}</span></div>
                  <div class="flex justify-between"><span class="text-muted">Resistance</span><span>{{ form.resistance || '(default)' }}</span></div>
                  <div class="flex justify-between"><span class="text-muted">Illustrator</span><span>{{ form.illustrator || 'AI Artist' }}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import Card3D from '@/components/Card3D.vue';

// ============ AUTH ============
const secret = ref('');
const adminLoggedIn = ref(false);
const loginError = ref('');
const loading = ref(false);
const sessionTtl = ref(43200); // Default to 12 hours (43200 seconds)

async function handleLogin() {
  loading.value = true;
  loginError.value = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secret.value, ttl: sessionTtl.value }),
    });
    if (!res.ok) throw new Error('Forbidden');
    adminLoggedIn.value = true;
    fetchCards();
    fetchStats();
  } catch {
    loginError.value = 'Secret salah.';
  } finally {
    loading.value = false;
  }
}

// ============ STATE ============
const activeTab = ref('cards'); // 'cards' | 'ai'
const viewMode = ref('grid');
const mobileMenuOpen = ref(false);
const cards = ref([]);
const page = ref(1);
const limit = 20;
const totalCount = ref(0);
const searchQuery = ref('');
const sortBy = ref('createdAt');
const sortDir = ref('desc');
const filterRarities = ref([]);
const filterStatus = ref('all');
const selectedCardIds = ref([]);

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / limit)));

// Stats
const stats = ref({
  distribution: [],
  totals: { total: 0, active: 0, inactive: 0, placeholder: 0 },
  avgStats: [],
});

// Editor
const showEditor = ref(false);
const editingCard = ref(null);
const saving = ref(false);
const formError = ref('');
const previewKey = ref(0);

const defaultForm = {
  name: '', description: '', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8,
  element: 'Normal', attack: 30, defense: 30, specialAbility: '', specialDesc: '',
  attackName1: '', attackName2: '', weakness: '', resistance: '',
  illustrator: 'AI Artist', imageUrl: '', isActive: true,
  foilStyle: 'Standard',
  imgZoom: 1.0, imgOffsetX: 0.0, imgOffsetY: 0.0,
};
const form = ref({ ...defaultForm });

// Image upload
const isDragging = ref(false);
const imagePreview = ref('');
const imageFile = ref(null);

// AI Assist
const showAiAssist = ref(false);
const editorAiPrompt = ref('');
const editorAiLoading = ref(false);
const editorAiResult = ref(null);
const editorAiError = ref('');

// AI Auto-Create
const aiPrompt = ref('');
const aiExtraPrompt = ref('');
const aiLoading = ref(false);
const aiResult = ref(null);
const aiError = ref('');

const aiImageFile = ref(null);
const aiImagePreview = ref('');
const aiImageFileName = ref('');
const aiIsDragging = ref(false);
const aiImageInputRef = ref(null);

function triggerAiImageInput() {
  aiImageInputRef.value?.click();
}

function handleAiImageFileChange(e) {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) processAiImageFile(file);
}

function handleAiImageDrop(e) {
  aiIsDragging.value = false;
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) processAiImageFile(file);
}

function processAiImageFile(file) {
  if (file.size > 4 * 1024 * 1024) {
    aiError.value = 'File terlalu besar (max 4MB)';
    return;
  }
  aiError.value = '';
  aiImageFile.value = file;
  aiImageFileName.value = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    aiImagePreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearAiImage() {
  aiImageFile.value = null;
  aiImagePreview.value = '';
  aiImageFileName.value = '';
}

// ============ CONSTANTS ============
const rarityOptions = [
  { value: 'Common', label: 'Common', colorClass: 'text-common', activeFilterClass: 'bg-common/20 text-common-light border-common/30 shadow-sm shadow-common/10' },
  { value: 'Rare', label: 'Rare', colorClass: 'text-rare', activeFilterClass: 'bg-rare/20 text-rare-light border-rare/30 shadow-sm shadow-rare/10' },
  { value: 'Epic', label: 'Epic', colorClass: 'text-epic', activeFilterClass: 'bg-epic/20 text-epic-light border-epic/30 shadow-sm shadow-epic/10' },
  { value: 'Legendary', label: 'Legendary', colorClass: 'text-legendary', activeFilterClass: 'bg-legendary/20 text-legendary-light border-legendary/30 shadow-sm shadow-legendary/10' },
];

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const elementOptions = [
  { value: 'Normal', label: 'Normal', emoji: '⚪' },
  { value: 'Fire', label: 'Fire', emoji: '🔥' },
  { value: 'Water', label: 'Water', emoji: '💧' },
  { value: 'Electric', label: 'Electric', emoji: '⚡' },
  { value: 'Cosmic', label: 'Cosmic', emoji: '🌌' },
  { value: 'Shadow', label: 'Shadow', emoji: '🌑' },
  { value: 'Nature', label: 'Nature', emoji: '🌿' },
];

const weaknessOptions = ['💧 x2', '🔥 x2', '⚡ x2', '🌌 x2', '🌑 x2', '🌿 x2', '💧 x3', '🔥 x3'];
const resistanceOptions = ['📦 -30', '📦 -60', '🌑 -30', '🌑 -60', '🌿 -30', '⚡ -30'];

const statSliders = [
  { key: 'hypeScore', label: 'Hype Score', min: 1, max: 5000, step: 1, color: '#A855F7' },
  { key: 'likesPerSec', label: 'Likes/sec', min: 0.1, max: 100, step: 0.1, color: '#38BDF8' },
  { key: 'attack', label: 'Attack', min: 0, max: 5000, step: 1, color: '#F59E0B' },
  { key: 'defense', label: 'Defense', min: 0, max: 5000, step: 1, color: '#10B981' },
];

const rarityPresets = {
  Common: { hypeScore: 50, likesPerSec: 0.8, attack: 40, defense: 40 },
  Rare: { hypeScore: 200, likesPerSec: 2.5, attack: 180, defense: 160 },
  Epic: { hypeScore: 400, likesPerSec: 6.5, attack: 350, defense: 300 },
  Legendary: { hypeScore: 800, likesPerSec: 15.0, attack: 650, defense: 550 },
};

// ============ HELPERS ============
function rarityEmoji(r) {
  return { Common: '🐱', Rare: '🐈', Epic: '✨', Legendary: '👑' }[r] || '🐱';
}

function elementEmoji(e) {
  return { Normal: '⚪', Fire: '🔥', Water: '💧', Electric: '⚡', Cosmic: '🌌', Shadow: '🌑', Nature: '🌿' }[e] || '⚪';
}

function rarityTextColor(r) {
  return { Common: 'text-common', Rare: 'text-rare', Epic: 'text-epic', Legendary: 'text-legendary' }[r] || 'text-white';
}

function getCountForRarity(rarity) {
  const d = stats.value.distribution.find(d => d.rarity === rarity);
  return d ? d.count : 0;
}

function toggleRarityFilter(value) {
  const idx = filterRarities.value.indexOf(value);
  if (idx >= 0) filterRarities.value.splice(idx, 1);
  else filterRarities.value.push(value);
}

function toggleSelectAll(e) {
  if (e.target.checked) selectedCardIds.value = cards.value.map(c => c.id);
  else selectedCardIds.value = [];
}

// ============ FETCH ============
let debounceTimer = null;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { page.value = 1; fetchCards(); }, 300);
}

async function fetchCards() {
  try {
    const params = new URLSearchParams({
      page: page.value, limit,
      sort: sortBy.value, sortDir: sortDir.value,
      status: filterStatus.value,
    });
    if (searchQuery.value) params.set('search', searchQuery.value);
    if (filterRarities.value.length === 1) params.set('rarity', filterRarities.value[0]);

    const res = await fetch(`/api/admin/cards?${params}`);
    const data = await res.json();
    if (res.ok) {
      cards.value = data.cards;
      totalCount.value = data.pagination.total;
    }
  } catch (e) {
    console.error('Fetch cards error:', e);
  }
}

async function fetchStats() {
  try {
    const res = await fetch('/api/admin/cards/stats');
    const data = await res.json();
    if (res.ok) stats.value = data;
  } catch (e) {
    console.error('Fetch stats error:', e);
  }
}

// ============ EDITOR ============
function openEditor(card) {
  editingCard.value = card;
  activeTab.value = 'editor';
  if (card) {
    form.value = {
      name: card.name || '', description: card.description || '', rarity: card.rarity || 'Common',
      hypeScore: card.hypeScore || 50, likesPerSec: card.likesPerSec || 0.8,
      element: card.element || 'Normal', attack: card.attack || 0, defense: card.defense || 0,
      specialAbility: card.specialAbility || '', specialDesc: card.specialDesc || '',
      attackName1: card.attackName1 || '', attackName2: card.attackName2 || '',
      weakness: card.weakness || '', resistance: card.resistance || '',
      illustrator: card.illustrator || 'AI Artist',
      imageUrl: card.imageUrl || '', isActive: card.isActive !== false,
      foilStyle: card.foilStyle || 'Standard',
      imgZoom: card.imgZoom ?? 1.0, imgOffsetX: card.imgOffsetX ?? 0.0, imgOffsetY: card.imgOffsetY ?? 0.0,
    };
    if (card.imageUrl && !card.isPlaceholderImage) {
      imagePreview.value = card.imageUrl;
    } else {
      imagePreview.value = '';
    }
  } else {
    form.value = { ...defaultForm };
    imagePreview.value = '';
  }
  imageFile.value = null;
  formError.value = '';
  showEditor.value = true;
  previewKey.value++;
}

function closeEditor() {
  showEditor.value = false;
  editingCard.value = null;
  formError.value = '';
  imageFile.value = null;
  imagePreview.value = '';
  showAiAssist.value = false;
  editorAiResult.value = null;
  activeTab.value = 'cards';
}

function applyRarityPreset(rarity) {
  const preset = rarityPresets[rarity];
  if (preset) {
    form.value.hypeScore = preset.hypeScore;
    form.value.likesPerSec = preset.likesPerSec;
    form.value.attack = preset.attack;
    form.value.defense = preset.defense;
    
    if (rarity === 'Common') form.value.foilStyle = 'Standard';
    else if (rarity === 'Rare') form.value.foilStyle = 'Holo';
    else if (rarity === 'Epic') form.value.foilStyle = 'Full Art ex';
    else if (rarity === 'Legendary') form.value.foilStyle = 'Secret Gold';
  }
}

function resetImagePosition() {
  form.value.imgZoom = 1.0;
  form.value.imgOffsetX = 0.0;
  form.value.imgOffsetY = 0.0;
}

// ============ IMAGE UPLOAD ============
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processImageFile(file);
}

function handleDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) processImageFile(file);
}

function processImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    formError.value = 'File terlalu besar (max 5MB)';
    return;
  }
  imageFile.value = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target.result;
    previewKey.value++;
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  imageFile.value = null;
  imagePreview.value = '';
  form.value.imageUrl = '';
  previewKey.value++;
}

async function uploadImage() {
  if (!imageFile.value) return form.value.imageUrl || '';

  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        const res = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: e.target.result,
            fileName: form.value.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
            contentType: imageFile.value.type,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload failed');
        resolve(data.url);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(imageFile.value);
  });
}

// ============ SAVE ============
async function handleSave() {
  saving.value = true;
  formError.value = '';
  try {
    // Upload image first if needed
    let imageUrl = form.value.imageUrl;
    if (imageFile.value) {
      imageUrl = await uploadImage();
    }

    const payload = {
      name: form.value.name,
      description: form.value.description,
      rarity: form.value.rarity,
      hypeScore: form.value.hypeScore,
      likesPerSec: form.value.likesPerSec,
      element: form.value.element,
      attack: form.value.attack,
      defense: form.value.defense,
      specialAbility: form.value.specialAbility || null,
      specialDesc: form.value.specialDesc || null,
      attackName1: form.value.attackName1 || null,
      attackName2: form.value.attackName2 || null,
      weakness: form.value.weakness || null,
      resistance: form.value.resistance || null,
      illustrator: form.value.illustrator || 'AI Artist',
      foilStyle: form.value.foilStyle || 'Standard',
      imgZoom: form.value.imgZoom ?? 1.0,
      imgOffsetX: form.value.imgOffsetX ?? 0.0,
      imgOffsetY: form.value.imgOffsetY ?? 0.0,
    };
    if (imageUrl) payload.imageUrl = imageUrl;

    const url = editingCard.value ? `/api/admin/cards/${editingCard.value.id}` : '/api/admin/cards';
    const method = editingCard.value ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const d = await res.json();
      formError.value = d.message || 'Gagal menyimpan.';
      return;
    }

    closeEditor();
    fetchCards();
    fetchStats();
  } catch (e) {
    formError.value = e.message || 'Error saving card';
  } finally {
    saving.value = false;
  }
}

// ============ ACTIONS ============
async function handleToggleActive(card) {
  try {
    if (card.isActive) {
      await fetch(`/api/admin/cards/${card.id}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/admin/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
    }
    fetchCards();
    fetchStats();
  } catch (e) {
    console.error('Toggle active error:', e);
  }
}

async function handleBulkAction(action) {
  if (!confirm(`${action === 'activate' ? 'Activate' : 'Deactivate'} ${selectedCardIds.value.length} kartu?`)) return;
  try {
    const res = await fetch('/api/admin/cards/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, cardIds: selectedCardIds.value }),
    });
    if (res.ok) {
      selectedCardIds.value = [];
      fetchCards();
      fetchStats();
    }
  } catch (e) {
    console.error('Bulk action error:', e);
  }
}

// ============ AI ASSIST ============
async function handleAiAutoCreate() {
  aiLoading.value = true;
  aiError.value = '';
  aiResult.value = null;
  try {
    const fullPrompt = aiExtraPrompt.value ? `${aiPrompt.value}. ${aiExtraPrompt.value}` : aiPrompt.value;
    
    let imageData = null;
    if (aiImagePreview.value) {
      const parts = aiImagePreview.value.split(',');
      if (parts.length > 1) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64 = parts[1];
        imageData = {
          data: base64,
          mimeType: mime
        };
      }
    }

    const res = await fetch('/api/admin/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: fullPrompt, 
        mode: 'auto-create',
        image: imageData
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI error');
    if (data.parsed) {
      aiResult.value = data.parsed;
    } else {
      aiError.value = 'AI returned unparseable response. Raw: ' + (data.raw || '').substring(0, 200);
    }
  } catch (e) {
    aiError.value = e.message;
  } finally {
    aiLoading.value = false;
  }
}

function applyAiResult() {
  if (!aiResult.value) return;
  const ai = aiResult.value;
  
  // Set default foil style based on rarity
  let aiFoilStyle = 'Standard';
  if (ai.rarity === 'Rare') aiFoilStyle = 'Holo';
  else if (ai.rarity === 'Epic') aiFoilStyle = 'Full Art ex';
  else if (ai.rarity === 'Legendary') aiFoilStyle = 'Secret Gold';

  form.value = {
    ...defaultForm,
    name: ai.name || form.value.name,
    description: ai.description || '',
    rarity: ai.rarity || 'Common',
    hypeScore: ai.hypeScore || 50,
    likesPerSec: ai.likesPerSec || 0.8,
    element: ai.element || 'Normal',
    attack: ai.attack || 0,
    defense: ai.defense || 0,
    attackName1: ai.attackName1 || '',
    attackName2: ai.attackName2 || '',
    specialAbility: ai.specialAbility || '',
    specialDesc: ai.specialDesc || '',
    weakness: ai.weakness || '',
    resistance: ai.resistance || '',
    illustrator: ai.illustrator || 'AI Artist',
    imageUrl: '',
    isActive: true,
    foilStyle: ai.foilStyle || aiFoilStyle,
  };
  
  if (aiImageFile.value) {
    imageFile.value = aiImageFile.value;
    imagePreview.value = aiImagePreview.value;
  } else {
    imagePreview.value = '';
    imageFile.value = null;
  }
  
  activeTab.value = 'editor';
  showEditor.value = true;
  previewKey.value++;
}

async function handleEditorAiAssist() {
  editorAiLoading.value = true;
  editorAiError.value = '';
  editorAiResult.value = null;
  try {
    const res = await fetch('/api/admin/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: editorAiPrompt.value,
        currentCard: form.value,
        mode: 'suggest',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI error');
    editorAiResult.value = data.parsed || { raw: data.raw };
  } catch (e) {
    editorAiError.value = e.message;
  } finally {
    editorAiLoading.value = false;
  }
}

async function quickAiAssist(mode) {
  editorAiLoading.value = true;
  editorAiError.value = '';
  editorAiResult.value = null;
  try {
    const res = await fetch('/api/admin/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '', currentCard: form.value, mode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI error');
    editorAiResult.value = data.parsed || { raw: data.raw };
  } catch (e) {
    editorAiError.value = e.message;
  } finally {
    editorAiLoading.value = false;
  }
}

function applyEditorAiResult() {
  if (!editorAiResult.value) return;
  const ai = editorAiResult.value;
  if (ai.description) form.value.description = ai.description;
  if (ai.attackName1) form.value.attackName1 = ai.attackName1;
  if (ai.attackName2) form.value.attackName2 = ai.attackName2;
  if (ai.specialAbility) form.value.specialAbility = ai.specialAbility;
  if (ai.specialDesc) form.value.specialDesc = ai.specialDesc;
  if (ai.improvedFields) {
    Object.keys(ai.improvedFields).forEach(key => {
      if (form.value.hasOwnProperty(key)) form.value[key] = ai.improvedFields[key];
    });
  }
  previewKey.value++;
  editorAiResult.value = null;
}

// ============ WATCHERS ============
watch([page, filterStatus], fetchCards);
watch(filterRarities, () => { page.value = 1; fetchCards(); }, { deep: true });

// Watch form changes for live preview
watch(form, () => { previewKey.value++; }, { deep: true });

// ============ LIFECYCLE ============
onMounted(async () => {
  // Check if session cookie is already valid
  try {
    const res = await fetch('/api/admin/cards?limit=1');
    if (res.ok) {
      adminLoggedIn.value = true;
      fetchCards();
      fetchStats();
    }
  } catch (e) {
    console.error('Session validation check failed:', e);
  }
});
</script>

<style scoped>
.sidebar-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  font-family: 'Outfit', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: #94A3B8;
  transition: all 0.15s ease;
}
.sidebar-btn:hover { background: rgba(255, 255, 255, 0.04); color: #F1F5F9; }
.sidebar-btn-active {
  background: rgba(124, 58, 237, 0.12);
  color: #C084FC;
  box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.2);
}

/* Range slider styling */
input[type="range"] { -webkit-appearance: none; }
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4), 0 0 15px rgba(124, 58, 237, 0.3);
  cursor: pointer;
  margin-top: -1px;
}
input[type="range"]::-moz-range-thumb {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  border: none;
}

/* Checkbox and radio styling */
input[type="checkbox"], input[type="radio"] {
  accent-color: #7C3AED;
}

/* Modal transitions */
.modal-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-content { transform: scale(0.9) translateY(20px); }

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
