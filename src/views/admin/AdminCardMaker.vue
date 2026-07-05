<template>
  <div class="p-4 lg:p-6 animate-fade-in">
    <!-- Header + tab switch -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div class="premium-header">
        <div class="premium-header-icon text-accent"><span class="text-xl">🃏</span></div>
        <div>
          <h1 class="premium-header-title text-2xl">Card Maker</h1>
          <p class="text-muted text-xs mt-0.5">Kelola & rancang kartu MemeCats</p>
        </div>
      </div>
      <div class="glass-tabs w-fit">
        <button class="glass-tab" :class="{ 'glass-tab-active': activeTab === 'cards' }" @click="activeTab = 'cards'">🃏 Kartu</button>
        <button class="glass-tab" :class="{ 'glass-tab-active': activeTab === 'ai' }" @click="activeTab = 'ai'">🤖 AI Create</button>
      </div>
    </div>

    <!-- Stats strip -->
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
      <div class="glass-panel p-3 text-center">
        <p class="text-xl font-display font-black">{{ stats.totals.total }}</p>
        <p class="text-[11px] text-muted font-display">Total</p>
      </div>
      <div class="glass-panel p-3 text-center">
        <p class="text-xl font-display font-black text-green-400">{{ stats.totals.active }}</p>
        <p class="text-[11px] text-muted font-display">Active</p>
      </div>
      <div v-for="r in ['Common', 'Rare', 'Epic', 'Legendary']" :key="'stat-'+r" class="glass-panel p-3 text-center">
        <p class="text-xl font-display font-black" :class="rarityTextColor(r)">{{ getCountForRarity(r) }}</p>
        <p class="text-[11px] font-display" :class="rarityTextColor(r)" style="opacity:.7">{{ r }}</p>
      </div>
    </div>

    <!-- ===== AI AUTO-CREATE ===== -->
    <div v-if="activeTab === 'ai'" class="max-w-2xl mx-auto animate-fade-in">
      <div class="glass-panel-strong p-6">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-12 h-12 rounded-xl glass-panel flex items-center justify-center"><span class="text-2xl">🤖</span></div>
          <div>
            <h2 class="text-lg font-display font-bold">AI Auto-Create Card</h2>
            <p class="text-muted text-sm">Upload foto meme → AI mengenali & melengkapi seluruh data kartu.</p>
          </div>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-display font-semibold text-secondary mb-1.5">Upload Foto Kucing Meme</label>
            <div class="border-2 border-dashed rounded-xl text-center cursor-pointer transition-all relative overflow-hidden"
              :class="[aiIsDragging ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-accent/50', aiImagePreview ? 'p-4' : 'p-7']"
              @dragover.prevent="aiIsDragging = true" @dragleave.prevent="aiIsDragging = false" @drop.prevent="handleAiImageDrop" @click="triggerAiImageInput">
              <input type="file" ref="aiImageInputRef" class="hidden" accept="image/*" @change="handleAiImageFileChange" />
              <div v-if="aiImagePreview" class="relative flex flex-col items-center">
                <img :src="aiImagePreview" class="max-h-40 rounded-lg shadow-lg mb-2 object-contain border border-white/10" />
                <button @click.stop="clearAiImage" class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
                <p class="text-xs text-muted font-display max-w-xs truncate">{{ aiImageFileName }}</p>
              </div>
              <div v-else class="space-y-2 flex flex-col items-center">
                <span class="text-3xl">📷</span>
                <p class="text-sm font-display text-secondary">Tarik foto ke sini atau klik untuk browse</p>
                <p class="text-xs text-muted">AI mengidentifikasi meme & melengkapi data kartu.</p>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-display font-semibold text-secondary mb-1.5">Instruksi tambahan (opsional)</label>
            <input v-model="aiPrompt" class="input-premium" placeholder="contoh: jadikan tipe Air, serangan tema es…" />
          </div>
          <div>
            <label class="block text-xs font-display font-semibold text-secondary mb-1.5">Detail tambahan (opsional)</label>
            <textarea v-model="aiExtraPrompt" class="input-premium" rows="2" placeholder="contoh: epic card element fire, serangan tema dragon…"></textarea>
          </div>
          <button @click="handleAiAutoCreate" :disabled="aiLoading || (!aiPrompt.trim() && !aiImagePreview)" class="btn-primary w-full font-display">
            {{ aiLoading ? '🔮 Menghubungkan & Membuat Kartu…' : '✨ Scan Foto & Generate Kartu' }}
          </button>
          <div v-if="aiResult" class="glass-panel p-4 space-y-3 animate-slide-up">
            <div class="flex items-center justify-between">
              <h3 class="font-display font-semibold text-green-400">✅ Card Generated!</h3>
              <button @click="applyAiResult" class="btn-primary text-sm px-4 py-2">📝 Buka di Editor</button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><span class="text-muted">Name:</span> {{ aiResult.name }}</div>
              <div><span class="text-muted">Rarity:</span> <span class="rarity-badge text-[9px] ml-1" :class="'rarity-' + (aiResult.rarity || 'Common').toLowerCase()">{{ aiResult.rarity }}</span></div>
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

    <!-- ===== CARDS LIST ===== -->
    <div v-else class="animate-fade-in">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <input v-model="searchQuery" @input="debouncedFetch" class="input-premium flex-1 min-w-[180px]" placeholder="🔍 Cari kartu…" />
        <select v-model="sortBy" @change="fetchCards" class="input-premium text-sm py-2 px-3 w-auto">
          <option value="createdAt">Terbaru</option>
          <option value="name">Nama</option>
          <option value="rarity">Rarity</option>
          <option value="hypeScore">Hype</option>
          <option value="attack">Attack</option>
        </select>
        <button @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'; fetchCards()" class="glass-panel p-2 rounded-lg hover:bg-white/5 text-sm">{{ sortDir === 'desc' ? '⬇️' : '⬆️' }}</button>
        <button @click="viewMode = viewMode === 'grid' ? 'table' : 'grid'" class="glass-panel p-2 rounded-lg hover:bg-white/5 text-sm">{{ viewMode === 'grid' ? '📋' : '🃏' }}</button>
        <button @click="openEditor(null)" class="btn-primary text-sm px-4 py-2 font-display">➕ New</button>
      </div>

      <!-- Filter chips -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <button v-for="r in rarityOptions" :key="r.value" @click="toggleRarityFilter(r.value); page = 1; fetchCards()"
          class="px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-all border"
          :class="filterRarities.includes(r.value) ? r.activeFilterClass : 'border-white/8 text-muted hover:border-white/15'">{{ r.label }}</button>
        <span class="w-px h-5 bg-white/10 mx-1"></span>
        <select v-model="filterStatus" @change="page = 1; fetchCards()" class="input-premium text-xs py-1.5 px-3 w-auto">
          <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>

      <!-- Bulk actions -->
      <div v-if="selectedCardIds.length > 0" class="glass-panel p-3 mb-4 flex items-center justify-between animate-slide-up">
        <span class="text-sm text-secondary font-display">{{ selectedCardIds.length }} kartu dipilih</span>
        <div class="flex gap-2">
          <button @click="handleBulkAction('activate')" class="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-display">✅ Activate</button>
          <button @click="handleBulkAction('deactivate')" class="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-xs font-display">🚫 Deactivate</button>
          <button @click="selectedCardIds = []" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-display">Cancel</button>
        </div>
      </div>

      <!-- GRID -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div v-for="card in cards" :key="card.id" class="relative cursor-pointer group animate-fade-in" :class="{ 'opacity-40': !card.isActive }" @click="openEditor(card)">
          <label class="absolute top-2 left-2 z-20 cursor-pointer" @click.stop>
            <input type="checkbox" :value="card.id" v-model="selectedCardIds" class="w-4 h-4 rounded border-gray-600 bg-gray-800/80 text-accent" />
          </label>
          <div class="aspect-[5/7] rounded-xl card-frame card-hover relative" :class="'card-frame-' + card.rarity.toLowerCase()">
            <div class="w-full h-full rounded-lg overflow-hidden bg-surface-card relative">
              <img v-if="card.imageUrl && !card.isPlaceholderImage" :src="card.imageUrl" :alt="card.name" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
              <div v-else class="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-b from-surface-card to-surface">{{ rarityEmoji(card.rarity) }}</div>
              <div class="holo-overlay"></div>
            </div>
            <span v-if="!card.isActive" class="absolute top-2 right-2 bg-red-900/80 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">OFF</span>
            <span v-if="card.isPlaceholderImage" class="absolute bottom-2 right-2 bg-yellow-900/80 text-yellow-300 text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">📷</span>
          </div>
          <div class="mt-1.5 text-center">
            <p class="text-xs font-display font-semibold truncate">{{ card.name }}</p>
            <span class="rarity-badge text-[8px] py-0.5 px-1.5 mt-0.5 inline-flex" :class="'rarity-' + card.rarity.toLowerCase()">{{ card.rarity }}</span>
          </div>
        </div>
      </div>

      <!-- TABLE -->
      <div v-else class="glass-panel overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-white/5">
            <tr class="text-left text-muted text-xs font-display uppercase tracking-wider">
              <th class="p-3 w-8"><input type="checkbox" @change="toggleSelectAll" :checked="selectedCardIds.length === cards.length && cards.length > 0" class="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-accent" /></th>
              <th class="p-3">Kartu</th><th class="p-3">Rarity</th><th class="p-3">Element</th><th class="p-3">Hype</th><th class="p-3">L/s</th><th class="p-3">Atk</th><th class="p-3">Def</th><th class="p-3">Status</th><th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="card in cards" :key="'t-'+card.id" class="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
              <td class="p-3"><input type="checkbox" :value="card.id" v-model="selectedCardIds" class="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-accent" /></td>
              <td class="p-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-10 rounded overflow-hidden bg-surface-card flex-shrink-0 border border-white/10">
                    <img v-if="card.imageUrl && !card.isPlaceholderImage" :src="card.imageUrl" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-sm">{{ rarityEmoji(card.rarity) }}</div>
                  </div>
                  <div><p class="font-display font-semibold text-sm">{{ card.name }}</p><p class="text-muted text-[10px] truncate max-w-[180px]">{{ card.description }}</p></div>
                </div>
              </td>
              <td class="p-3"><span class="rarity-badge text-[9px]" :class="'rarity-' + card.rarity.toLowerCase()">{{ card.rarity }}</span></td>
              <td class="p-3 text-xs">{{ elementEmoji(card.element) }} {{ card.element }}</td>
              <td class="p-3 font-display font-semibold">{{ card.hypeScore }}</td>
              <td class="p-3">{{ card.likesPerSec }}</td>
              <td class="p-3">{{ card.attack }}</td>
              <td class="p-3">{{ card.defense }}</td>
              <td class="p-3"><span :class="card.isActive ? 'text-green-400' : 'text-red-400'" class="text-xs font-display">{{ card.isActive ? '● Active' : '● Off' }}</span></td>
              <td class="p-3">
                <div class="flex gap-1">
                  <button @click="openEditor(card)" class="px-2.5 py-1 bg-accent/20 hover:bg-accent/40 text-accent-soft rounded text-xs font-display">Edit</button>
                  <button @click="handleToggleActive(card)" class="px-2.5 py-1 rounded text-xs font-display" :class="card.isActive ? 'bg-red-900/30 hover:bg-red-900/60 text-red-400' : 'bg-green-900/30 hover:bg-green-900/60 text-green-400'">{{ card.isActive ? 'Off' : 'On' }}</button>
                </div>
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
    </div>

    <!-- ===== EDITOR MODAL (redesigned, stepper) ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEditor" class="modal-overlay flex items-start justify-center p-4 overflow-y-auto" @click.self="closeEditor">
          <div class="modal-content w-full max-w-5xl my-8 glass-panel-strong overflow-hidden animate-scale-in">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 lg:p-5 border-b border-white/5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl glass-panel flex items-center justify-center"><span class="text-xl">{{ editingCard ? '✏️' : '🆕' }}</span></div>
                <div>
                  <h2 class="font-display font-bold text-lg">{{ editingCard ? 'Edit Card' : 'Create New Card' }}</h2>
                  <p class="text-muted text-xs">{{ editingCard ? `ID: ${editingCard.id}` : 'Rancang kartu TCG-mu' }}</p>
                </div>
              </div>
              <button @click="closeEditor" class="text-muted hover:text-white p-2 glass-panel rounded-lg">✕</button>
            </div>

            <div class="flex flex-col lg:flex-row">
              <!-- LEFT: stepper + form -->
              <div class="flex-1 min-w-0 lg:border-r lg:border-white/5">
                <!-- Step nav -->
                <div class="flex gap-1 p-3 overflow-x-auto border-b border-white/5 scrollbar-hide">
                  <button v-for="s in editorSteps" :key="s.id" @click="editorStep = s.id"
                    class="step-pill flex-shrink-0" :class="{ 'step-pill-active': editorStep === s.id }">
                    <span>{{ s.icon }}</span> {{ s.label }}
                  </button>
                </div>

                <div class="p-4 lg:p-6 overflow-y-auto max-h-[62vh] space-y-4">
                  <!-- BASIC -->
                  <section v-show="editorStep === 'basic'" class="space-y-3 animate-fade-in">
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Card Name *</label>
                      <input v-model="form.name" class="input-premium" placeholder="contoh: Galaxy Ninja Cat" />
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1.5 font-display">Rarity *</label>
                      <div class="grid grid-cols-4 gap-2">
                        <button v-for="r in ['Common','Rare','Epic','Legendary']" :key="r" @click="form.rarity = r; applyRarityPreset(r)"
                          class="py-2.5 rounded-xl text-xs font-display font-bold transition-all border text-center"
                          :class="form.rarity === r ? 'rarity-' + r.toLowerCase() + ' border-transparent shadow-lg' : 'border-white/8 text-muted hover:border-white/15'">{{ r }}</button>
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Foil Style</label>
                      <select v-model="form.foilStyle" class="input-premium text-sm">
                        <option value="Standard">Standard (Matte)</option>
                        <option value="Holo">Holo (Art Window)</option>
                        <option value="Reverse Holo">Reverse Holo (Frame)</option>
                        <option value="Full Art ex">Full Art ex (Glass)</option>
                        <option value="Secret Gold">Secret Gold (Gilded)</option>
                        <option value="Special Illustration">Special Illustration (Parallax)</option>
                      </select>
                    </div>
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <label class="text-xs text-muted font-display">🎲 Bobot Gacha (dalam rarity)</label>
                        <button type="button" @click="autoWeightFromStrength" class="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent-soft hover:bg-accent/25 font-display">⚡ Auto</button>
                      </div>
                      <div class="flex items-center gap-2">
                        <input type="number" v-model.number="form.dropWeight" min="0.05" max="1000" step="0.05" class="input-premium text-sm flex-1" placeholder="1.0" />
                        <div class="text-right whitespace-nowrap px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                          <span class="text-[10px] text-muted font-display block leading-none">Peluang</span>
                          <span class="text-sm font-display font-bold" :class="'text-' + form.rarity.toLowerCase() + '-light'">{{ effectiveDropRate.toFixed(effectiveDropRate < 1 ? 2 : 1) }}%</span>
                        </div>
                      </div>
                      <p class="text-[10px] text-muted mt-1">1.0 = merata. Lebih kecil = lebih langka.</p>
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
                          <button @click="form.isActive = !form.isActive" class="relative w-11 h-6 rounded-full transition-colors" :class="form.isActive ? 'bg-green-600' : 'bg-gray-700'">
                            <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" :class="form.isActive ? 'translate-x-5' : 'translate-x-0'"></span>
                          </button>
                          <span class="text-sm" :class="form.isActive ? 'text-green-400' : 'text-muted'">{{ form.isActive ? 'Active' : 'Inactive' }}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <!-- ARTWORK -->
                  <section v-show="editorStep === 'artwork'" class="space-y-3 animate-fade-in">
                    <div class="relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-accent/50 transition-all"
                      :class="isDragging ? 'border-accent bg-accent/5' : 'border-white/10'"
                      @click="$refs.fileInput.click()" @dragover.prevent="isDragging = true" @dragleave="isDragging = false" @drop.prevent="handleDrop">
                      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
                      <div v-if="imagePreview" class="flex items-center gap-3 justify-center">
                        <img :src="imagePreview" class="w-20 h-24 object-cover rounded-lg border border-white/10" />
                        <div class="text-left">
                          <p class="text-sm font-display font-semibold text-green-400">✅ Image loaded</p>
                          <p class="text-xs text-muted mt-0.5">Klik/drop untuk ganti</p>
                          <button @click.stop="removeImage" class="text-xs text-red-400 hover:text-red-300 mt-1 font-display">🗑️ Remove</button>
                        </div>
                      </div>
                      <div v-else>
                        <div class="w-12 h-12 mx-auto rounded-xl glass-panel flex items-center justify-center mb-2"><span class="text-2xl">📤</span></div>
                        <p class="text-sm text-secondary font-display">Drop image atau klik untuk browse</p>
                        <p class="text-xs text-muted mt-1">PNG, JPG, WebP • Max 5MB</p>
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs text-muted mb-1 font-display">Atau paste URL gambar</label>
                      <input v-model="form.imageUrl" class="input-premium text-sm" placeholder="https://example.com/image.png" />
                    </div>
                    <!-- Positioning -->
                    <div v-if="imagePreview || form.imageUrl" class="pt-2 space-y-3">
                      <div class="flex items-center justify-between">
                        <p class="text-xs font-display font-bold text-secondary">🎯 Posisi Gambar</p>
                        <button @click="resetImagePosition" class="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted hover:text-white font-display">🔄 Reset</button>
                      </div>
                      <div v-for="pos in posSliders" :key="pos.key">
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-xs text-muted font-display">{{ pos.label }}</label>
                          <span class="text-xs font-display font-semibold tabular-nums">{{ pos.fmt(form[pos.key]) }}</span>
                        </div>
                        <input type="range" v-model.number="form[pos.key]" :min="pos.min" :max="pos.max" :step="pos.step" class="w-full slider" />
                      </div>
                    </div>
                  </section>

                  <!-- STATS -->
                  <section v-show="editorStep === 'stats'" class="space-y-3 animate-fade-in">
                    <div class="flex items-center justify-end">
                      <button @click="applyRarityPreset(form.rarity)" class="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent-soft hover:bg-accent/25 font-display">🎯 Auto Preset</button>
                    </div>
                    <div v-for="stat in statSliders" :key="stat.key">
                      <div class="flex items-center justify-between mb-1">
                        <label class="text-xs text-muted font-display">{{ stat.label }}</label>
                        <input v-model.number="form[stat.key]" type="number" :min="stat.min" :max="stat.max" :step="stat.step" class="w-20 text-right bg-transparent border border-white/10 rounded px-2 py-0.5 text-sm font-display focus:border-accent/50 focus:outline-none" />
                      </div>
                      <input type="range" v-model.number="form[stat.key]" :min="stat.min" :max="stat.max" :step="stat.step" class="w-full slider"
                        :style="{ background: `linear-gradient(to right, ${stat.color} 0%, ${stat.color} ${(form[stat.key]-stat.min)/(stat.max-stat.min)*100}%, rgba(255,255,255,0.06) ${(form[stat.key]-stat.min)/(stat.max-stat.min)*100}%, rgba(255,255,255,0.06) 100%)` }" />
                    </div>
                  </section>

                  <!-- FRAME -->
                  <section v-show="editorStep === 'frame'" class="space-y-3 animate-fade-in">
                    <div class="grid grid-cols-2 gap-3">
                      <div><label class="block text-xs text-muted mb-1 font-display">Attack 1 Name</label><input v-model="form.attackName1" class="input-premium text-sm" placeholder="Viral Purr" /></div>
                      <div><label class="block text-xs text-muted mb-1 font-display">Attack 2 Name</label><input v-model="form.attackName2" class="input-premium text-sm" placeholder="Meme Surge" /></div>
                      <div><label class="block text-xs text-muted mb-1 font-display">Special Ability</label><input v-model="form.specialAbility" class="input-premium text-sm" placeholder="Nama ability" /></div>
                      <div><label class="block text-xs text-muted mb-1 font-display">Illustrator</label><input v-model="form.illustrator" class="input-premium text-sm" placeholder="AI Artist" /></div>
                      <div>
                        <label class="block text-xs text-muted mb-1 font-display">Weakness</label>
                        <select v-model="form.weakness" class="input-premium text-sm"><option value="">None</option><option v-for="w in weaknessOptions" :key="w" :value="w">{{ w }}</option></select>
                      </div>
                      <div>
                        <label class="block text-xs text-muted mb-1 font-display">Resistance</label>
                        <select v-model="form.resistance" class="input-premium text-sm"><option value="">None</option><option v-for="r in resistanceOptions" :key="r" :value="r">{{ r }}</option></select>
                      </div>
                    </div>
                    <div><label class="block text-xs text-muted mb-1 font-display">Special Ability Description</label><textarea v-model="form.specialDesc" class="input-premium text-sm" rows="2" placeholder="Deskripsi special ability…"></textarea></div>
                  </section>

                  <!-- DESC -->
                  <section v-show="editorStep === 'desc'" class="space-y-2 animate-fade-in">
                    <label class="block text-xs text-muted mb-1 font-display">Description / Flavor Text</label>
                    <textarea v-model="form.description" class="input-premium" rows="4" placeholder="Deskripsi kartu yang lucu & menarik… (min 10 karakter)"></textarea>
                    <p class="text-xs text-muted">{{ form.description.length }}/255</p>
                  </section>

                  <!-- AI -->
                  <section v-show="editorStep === 'ai'" class="space-y-3 animate-fade-in">
                    <div class="flex gap-2">
                      <input v-model="editorAiPrompt" class="input-premium flex-1 text-sm" placeholder="contoh: suggest attack names tema galaxy…" />
                      <button @click="handleEditorAiAssist" :disabled="editorAiLoading" class="btn-primary text-sm px-4 py-2 font-display flex-shrink-0">{{ editorAiLoading ? '⏳' : '✨' }}</button>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                      <button @click="quickAiAssist('modify-description')" :disabled="editorAiLoading" class="px-2.5 py-1 glass-panel text-xs text-muted hover:text-white rounded-lg font-display">📝 Improve Desc</button>
                      <button @click="quickAiAssist('suggest-attacks')" :disabled="editorAiLoading" class="px-2.5 py-1 glass-panel text-xs text-muted hover:text-white rounded-lg font-display">⚔️ Suggest Attacks</button>
                    </div>
                    <div v-if="editorAiResult" class="glass-panel p-3 text-sm space-y-2 animate-fade-in">
                      <p class="text-green-400 font-display text-xs font-semibold">💡 AI Suggestion:</p>
                      <pre class="text-secondary whitespace-pre-wrap text-xs overflow-x-auto">{{ JSON.stringify(editorAiResult, null, 2) }}</pre>
                      <button @click="applyEditorAiResult" class="btn-primary text-xs px-3 py-1.5 font-display">Apply Suggestion</button>
                    </div>
                    <div v-if="editorAiError" class="text-red-400 text-xs">{{ editorAiError }}</div>
                  </section>
                </div>

                <!-- Save bar -->
                <div class="p-4 lg:p-5 border-t border-white/5 flex gap-3 items-center">
                  <button @click="handleSave" :disabled="saving" class="btn-primary flex-1 font-display">{{ saving ? '⏳ Menyimpan…' : (editingCard ? '💾 Update Card' : '✨ Create Card') }}</button>
                  <button @click="closeEditor" class="btn-secondary px-6 font-display">Cancel</button>
                </div>
                <div v-if="formError" class="px-5 pb-4 -mt-1"><p class="text-red-400 text-sm glass-panel p-3 rounded-lg text-center">{{ formError }}</p></div>
              </div>

              <!-- RIGHT: sticky live preview -->
              <div class="lg:w-[340px] flex-shrink-0 p-5 lg:p-6 flex flex-col items-center bg-[#050914]">
                <h3 class="text-xs font-display font-semibold text-muted mb-3 uppercase tracking-wider w-full text-center">Live Preview</h3>
                <div class="w-full max-w-[240px] lg:sticky lg:top-4">
                  <div class="aspect-[5/7] rounded-xl card-frame relative !overflow-visible" :class="'card-frame-' + form.rarity.toLowerCase()">
                    <Card3D :key="previewKey" :image-url="imagePreview || form.imageUrl || ''" :rarity="form.rarity"
                      :name="form.name || 'Card Name'" :description="form.description || 'Card description…'"
                      :hype-score="form.hypeScore || 0" :likes-per-sec="form.likesPerSec || 0"
                      :element="form.element" :foil-style="form.foilStyle" :img-zoom="form.imgZoom"
                      :img-offset-x="form.imgOffsetX" :img-offset-y="form.imgOffsetY" :drop-rate="effectiveDropRate"
                      mode="full" class="w-full h-full" />
                  </div>
                  <div class="w-full mt-4 space-y-2">
                    <div v-for="s in previewStats" :key="s.label" class="flex items-center gap-2">
                      <span class="text-[10px] text-muted font-display w-12 text-right">{{ s.label }}</span>
                      <div class="flex-1 stat-bar-track"><div class="stat-bar-fill" :style="{ width: Math.min(100, (s.value / s.max) * 100) + '%', background: s.color }"></div></div>
                      <span class="text-[10px] font-display font-semibold w-8">{{ s.value }}</span>
                    </div>
                  </div>
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

// ============ STATE ============
const activeTab = ref('cards');
const viewMode = ref('grid');
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

const stats = ref({ distribution: [], totals: { total: 0, active: 0, inactive: 0, placeholder: 0 }, avgStats: [] });

// Editor
const showEditor = ref(false);
const editingCard = ref(null);
const saving = ref(false);
const formError = ref('');
const previewKey = ref(0);
const editorStep = ref('basic');
const editorSteps = [
  { id: 'basic', label: 'Basic', icon: '📋' },
  { id: 'artwork', label: 'Artwork', icon: '🖼️' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'frame', label: 'Frame', icon: '⚔️' },
  { id: 'desc', label: 'Deskripsi', icon: '📝' },
  { id: 'ai', label: 'AI', icon: '🤖' },
];

const defaultForm = {
  name: '', description: '', rarity: 'Common', hypeScore: 50, likesPerSec: 0.8,
  element: 'Normal', attack: 30, defense: 30, specialAbility: '', specialDesc: '',
  attackName1: '', attackName2: '', weakness: '', resistance: '',
  illustrator: 'AI Artist', imageUrl: '', isActive: true, foilStyle: 'Standard',
  dropWeight: 1.0, imgZoom: 1.0, imgOffsetX: 0.0, imgOffsetY: 0.0,
};
const TIER_BASELINE_HYPE = { Common: 50, Rare: 200, Epic: 400, Legendary: 800 };
const form = ref({ ...defaultForm });

// Image upload
const isDragging = ref(false);
const imagePreview = ref('');
const imageFile = ref(null);

// AI Assist (editor)
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

function triggerAiImageInput() { aiImageInputRef.value?.click(); }
function handleAiImageFileChange(e) { const f = e.target.files[0]; if (f && f.type.startsWith('image/')) processAiImageFile(f); }
function handleAiImageDrop(e) { aiIsDragging.value = false; const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) processAiImageFile(f); }
function processAiImageFile(file) {
  if (file.size > 4 * 1024 * 1024) { aiError.value = 'File terlalu besar (max 4MB)'; return; }
  aiError.value = ''; aiImageFile.value = file; aiImageFileName.value = file.name;
  const r = new FileReader(); r.onload = (e) => { aiImagePreview.value = e.target.result; }; r.readAsDataURL(file);
}
function clearAiImage() { aiImageFile.value = null; aiImagePreview.value = ''; aiImageFileName.value = ''; }

// ============ CONSTANTS ============
const rarityOptions = [
  { value: 'Common', label: 'Common', activeFilterClass: 'bg-common/20 text-common-light border-common/30' },
  { value: 'Rare', label: 'Rare', activeFilterClass: 'bg-rare/20 text-rare-light border-rare/30' },
  { value: 'Epic', label: 'Epic', activeFilterClass: 'bg-epic/20 text-epic-light border-epic/30' },
  { value: 'Legendary', label: 'Legendary', activeFilterClass: 'bg-legendary/20 text-legendary-light border-legendary/30' },
];
const statusOptions = [{ value: 'all', label: 'Semua Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];
const elementOptions = [
  { value: 'Normal', label: 'Normal', emoji: '⚪' }, { value: 'Fire', label: 'Fire', emoji: '🔥' },
  { value: 'Water', label: 'Water', emoji: '💧' }, { value: 'Electric', label: 'Electric', emoji: '⚡' },
  { value: 'Cosmic', label: 'Cosmic', emoji: '🌌' }, { value: 'Shadow', label: 'Shadow', emoji: '🌑' },
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
const posSliders = [
  { key: 'imgZoom', label: '🔍 Zoom', min: 0.5, max: 3.0, step: 0.05, fmt: (v) => (v ?? 1).toFixed(2) + 'x' },
  { key: 'imgOffsetX', label: '↔️ Pan Horizontal', min: -1, max: 1, step: 0.01, fmt: (v) => ((v ?? 0) >= 0 ? '+' : '') + (v ?? 0).toFixed(2) },
  { key: 'imgOffsetY', label: '↕️ Pan Vertical', min: -1, max: 1, step: 0.01, fmt: (v) => ((v ?? 0) >= 0 ? '+' : '') + (v ?? 0).toFixed(2) },
];
const rarityPresets = {
  Common: { hypeScore: 50, likesPerSec: 0.8, attack: 40, defense: 40 },
  Rare: { hypeScore: 200, likesPerSec: 2.5, attack: 180, defense: 160 },
  Epic: { hypeScore: 400, likesPerSec: 6.5, attack: 350, defense: 300 },
  Legendary: { hypeScore: 800, likesPerSec: 15.0, attack: 650, defense: 550 },
};
const RARITY_BASE_CHANCE = { Legendary: 2, Epic: 8, Rare: 20, Common: 70 };

const previewStats = computed(() => [
  { label: 'Hype', value: form.value.hypeScore, max: 1000, color: '#A855F7' },
  { label: 'Likes/s', value: form.value.likesPerSec, max: 25, color: '#38BDF8' },
  { label: 'Attack', value: form.value.attack, max: 1000, color: '#F59E0B' },
  { label: 'Defense', value: form.value.defense, max: 1000, color: '#10B981' },
]);

// ============ HELPERS ============
function rarityEmoji(r) { return { Common: '🐱', Rare: '🐈', Epic: '✨', Legendary: '👑' }[r] || '🐱'; }
function elementEmoji(e) { return { Normal: '⚪', Fire: '🔥', Water: '💧', Electric: '⚡', Cosmic: '🌌', Shadow: '🌑', Nature: '🌿' }[e] || '⚪'; }
function rarityTextColor(r) { return { Common: 'text-common', Rare: 'text-rare', Epic: 'text-epic', Legendary: 'text-legendary' }[r] || 'text-white'; }
function getCountForRarity(rarity) { const d = stats.value.distribution.find(d => d.rarity === rarity); return d ? d.count : 0; }
function toggleRarityFilter(value) { const i = filterRarities.value.indexOf(value); if (i >= 0) filterRarities.value.splice(i, 1); else filterRarities.value.push(value); }
function toggleSelectAll(e) { selectedCardIds.value = e.target.checked ? cards.value.map(c => c.id) : []; }

// ============ FETCH ============
let debounceTimer = null;
function debouncedFetch() { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { page.value = 1; fetchCards(); }, 300); }

async function fetchCards() {
  try {
    const params = new URLSearchParams({ page: page.value, limit, sort: sortBy.value, sortDir: sortDir.value, status: filterStatus.value });
    if (searchQuery.value) params.set('search', searchQuery.value);
    if (filterRarities.value.length === 1) params.set('rarity', filterRarities.value[0]);
    const res = await fetch(`/api/admin/cards?${params}`);
    const data = await res.json();
    if (res.ok) { cards.value = data.cards; totalCount.value = data.pagination.total; }
  } catch (e) { console.error('Fetch cards error:', e); }
}
async function fetchStats() {
  try { const res = await fetch('/api/admin/cards/stats'); const data = await res.json(); if (res.ok) stats.value = data; }
  catch (e) { console.error('Fetch stats error:', e); }
}

// ============ EDITOR ============
function openEditor(card) {
  editingCard.value = card;
  editorStep.value = 'basic';
  if (card) {
    form.value = {
      name: card.name || '', description: card.description || '', rarity: card.rarity || 'Common',
      hypeScore: card.hypeScore || 50, likesPerSec: card.likesPerSec || 0.8,
      element: card.element || 'Normal', attack: card.attack || 0, defense: card.defense || 0,
      specialAbility: card.specialAbility || '', specialDesc: card.specialDesc || '',
      attackName1: card.attackName1 || '', attackName2: card.attackName2 || '',
      weakness: card.weakness || '', resistance: card.resistance || '',
      illustrator: card.illustrator || 'AI Artist', imageUrl: card.imageUrl || '', isActive: card.isActive !== false,
      foilStyle: card.foilStyle || 'Standard', dropWeight: card.dropWeight ?? 1.0,
      imgZoom: card.imgZoom ?? 1.0, imgOffsetX: card.imgOffsetX ?? 0.0, imgOffsetY: card.imgOffsetY ?? 0.0,
    };
    imagePreview.value = (card.imageUrl && !card.isPlaceholderImage) ? card.imageUrl : '';
  } else {
    form.value = { ...defaultForm };
    imagePreview.value = '';
  }
  imageFile.value = null; formError.value = ''; showEditor.value = true; previewKey.value++;
}
function closeEditor() {
  showEditor.value = false; editingCard.value = null; formError.value = '';
  imageFile.value = null; imagePreview.value = ''; editorAiResult.value = null;
}
function applyRarityPreset(rarity) {
  const p = rarityPresets[rarity];
  if (p) {
    form.value.hypeScore = p.hypeScore; form.value.likesPerSec = p.likesPerSec; form.value.attack = p.attack; form.value.defense = p.defense;
    if (rarity === 'Common') form.value.foilStyle = 'Standard';
    else if (rarity === 'Rare') form.value.foilStyle = 'Holo';
    else if (rarity === 'Epic') form.value.foilStyle = 'Full Art ex';
    else if (rarity === 'Legendary') form.value.foilStyle = 'Secret Gold';
  }
}
function autoWeightFromStrength() {
  const baseline = TIER_BASELINE_HYPE[form.value.rarity] || 100;
  const hype = Math.max(1, Number(form.value.hypeScore) || 1);
  form.value.dropWeight = Math.min(20, Math.max(0.05, Math.round((baseline / hype) * 1000) / 1000));
}
const effectiveDropRate = computed(() => {
  const rarity = form.value.rarity;
  const base = RARITY_BASE_CHANCE[rarity] || 0;
  const myWeight = Math.max(0, Number(form.value.dropWeight) || 0);
  let sum = 0;
  for (const c of cards.value) {
    if (c.rarity !== rarity || c.isActive === false) continue;
    if (editingCard.value && c.id === editingCard.value.id) continue;
    sum += Math.max(0, Number(c.dropWeight) ?? 1);
  }
  sum += myWeight;
  return sum > 0 ? (base * myWeight) / sum : 0;
});
function resetImagePosition() { form.value.imgZoom = 1.0; form.value.imgOffsetX = 0.0; form.value.imgOffsetY = 0.0; }

// ============ IMAGE UPLOAD ============
function handleFileSelect(e) { const f = e.target.files[0]; if (f) processImageFile(f); }
function handleDrop(e) { isDragging.value = false; const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) processImageFile(f); }
function processImageFile(file) {
  if (file.size > 5 * 1024 * 1024) { formError.value = 'File terlalu besar (max 5MB)'; return; }
  imageFile.value = file;
  const r = new FileReader(); r.onload = (e) => { imagePreview.value = e.target.result; previewKey.value++; }; r.readAsDataURL(file);
}
function removeImage() { imageFile.value = null; imagePreview.value = ''; form.value.imageUrl = ''; previewKey.value++; }
async function uploadImage() {
  if (!imageFile.value) return form.value.imageUrl || '';
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        const res = await fetch('/api/admin/upload-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: e.target.result, fileName: form.value.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(), contentType: imageFile.value.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload failed');
        resolve(data.url);
      } catch (err) { reject(err); }
    };
    reader.readAsDataURL(imageFile.value);
  });
}

// ============ SAVE ============
async function handleSave() {
  saving.value = true; formError.value = '';
  try {
    let imageUrl = form.value.imageUrl;
    if (imageFile.value) imageUrl = await uploadImage();
    const payload = {
      name: form.value.name, description: form.value.description, rarity: form.value.rarity,
      hypeScore: form.value.hypeScore, likesPerSec: form.value.likesPerSec, element: form.value.element,
      attack: form.value.attack, defense: form.value.defense,
      specialAbility: form.value.specialAbility || null, specialDesc: form.value.specialDesc || null,
      attackName1: form.value.attackName1 || null, attackName2: form.value.attackName2 || null,
      weakness: form.value.weakness || null, resistance: form.value.resistance || null,
      illustrator: form.value.illustrator || 'AI Artist', foilStyle: form.value.foilStyle || 'Standard',
      dropWeight: Number(form.value.dropWeight) > 0 ? Number(form.value.dropWeight) : 1.0,
      imgZoom: form.value.imgZoom ?? 1.0, imgOffsetX: form.value.imgOffsetX ?? 0.0, imgOffsetY: form.value.imgOffsetY ?? 0.0,
    };
    if (imageUrl) payload.imageUrl = imageUrl;
    const url = editingCard.value ? `/api/admin/cards/${editingCard.value.id}` : '/api/admin/cards';
    const method = editingCard.value ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { formError.value = (await res.json()).message || 'Gagal menyimpan.'; return; }
    closeEditor(); fetchCards(); fetchStats();
  } catch (e) { formError.value = e.message || 'Error saving card'; }
  finally { saving.value = false; }
}

// ============ ACTIONS ============
async function handleToggleActive(card) {
  try {
    if (card.isActive) await fetch(`/api/admin/cards/${card.id}`, { method: 'DELETE' });
    else await fetch(`/api/admin/cards/${card.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: true }) });
    fetchCards(); fetchStats();
  } catch (e) { console.error('Toggle active error:', e); }
}
async function handleBulkAction(action) {
  if (!confirm(`${action === 'activate' ? 'Activate' : 'Deactivate'} ${selectedCardIds.value.length} kartu?`)) return;
  try {
    const res = await fetch('/api/admin/cards/bulk-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, cardIds: selectedCardIds.value }) });
    if (res.ok) { selectedCardIds.value = []; fetchCards(); fetchStats(); }
  } catch (e) { console.error('Bulk action error:', e); }
}

// ============ AI ============
async function handleAiAutoCreate() {
  aiLoading.value = true; aiError.value = ''; aiResult.value = null;
  try {
    const fullPrompt = aiExtraPrompt.value ? `${aiPrompt.value}. ${aiExtraPrompt.value}` : aiPrompt.value;
    let imageData = null;
    if (aiImagePreview.value) {
      const parts = aiImagePreview.value.split(',');
      if (parts.length > 1) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        imageData = { data: parts[1], mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg' };
      }
    }
    const res = await fetch('/api/admin/ai-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: fullPrompt, mode: 'auto-create', image: imageData }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI error');
    if (data.parsed) aiResult.value = data.parsed;
    else aiError.value = 'AI returned unparseable response. Raw: ' + (data.raw || '').substring(0, 200);
  } catch (e) { aiError.value = e.message; }
  finally { aiLoading.value = false; }
}
function applyAiResult() {
  if (!aiResult.value) return;
  const ai = aiResult.value;
  let aiFoilStyle = 'Standard';
  if (ai.rarity === 'Rare') aiFoilStyle = 'Holo';
  else if (ai.rarity === 'Epic') aiFoilStyle = 'Full Art ex';
  else if (ai.rarity === 'Legendary') aiFoilStyle = 'Secret Gold';
  form.value = {
    ...defaultForm, name: ai.name || form.value.name, description: ai.description || '', rarity: ai.rarity || 'Common',
    hypeScore: ai.hypeScore || 50, likesPerSec: ai.likesPerSec || 0.8, element: ai.element || 'Normal',
    attack: ai.attack || 0, defense: ai.defense || 0, attackName1: ai.attackName1 || '', attackName2: ai.attackName2 || '',
    specialAbility: ai.specialAbility || '', specialDesc: ai.specialDesc || '', weakness: ai.weakness || '', resistance: ai.resistance || '',
    illustrator: ai.illustrator || 'AI Artist', imageUrl: '', isActive: true, foilStyle: ai.foilStyle || aiFoilStyle,
  };
  if (aiImageFile.value) { imageFile.value = aiImageFile.value; imagePreview.value = aiImagePreview.value; }
  else { imagePreview.value = ''; imageFile.value = null; }
  editingCard.value = null; editorStep.value = 'basic'; showEditor.value = true; previewKey.value++;
}
async function handleEditorAiAssist() {
  editorAiLoading.value = true; editorAiError.value = ''; editorAiResult.value = null;
  try {
    const res = await fetch('/api/admin/ai-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: editorAiPrompt.value, currentCard: form.value, mode: 'suggest' }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI error');
    editorAiResult.value = data.parsed || { raw: data.raw };
  } catch (e) { editorAiError.value = e.message; }
  finally { editorAiLoading.value = false; }
}
async function quickAiAssist(mode) {
  editorAiLoading.value = true; editorAiError.value = ''; editorAiResult.value = null;
  try {
    const res = await fetch('/api/admin/ai-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: '', currentCard: form.value, mode }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI error');
    editorAiResult.value = data.parsed || { raw: data.raw };
  } catch (e) { editorAiError.value = e.message; }
  finally { editorAiLoading.value = false; }
}
function applyEditorAiResult() {
  if (!editorAiResult.value) return;
  const ai = editorAiResult.value;
  if (ai.description) form.value.description = ai.description;
  if (ai.attackName1) form.value.attackName1 = ai.attackName1;
  if (ai.attackName2) form.value.attackName2 = ai.attackName2;
  if (ai.specialAbility) form.value.specialAbility = ai.specialAbility;
  if (ai.specialDesc) form.value.specialDesc = ai.specialDesc;
  if (ai.improvedFields) Object.keys(ai.improvedFields).forEach(k => { if (Object.prototype.hasOwnProperty.call(form.value, k)) form.value[k] = ai.improvedFields[k]; });
  previewKey.value++; editorAiResult.value = null;
}

// ============ WATCHERS ============
watch([page, filterStatus], fetchCards);
watch(filterRarities, () => { page.value = 1; fetchCards(); }, { deep: true });
watch(form, () => { previewKey.value++; }, { deep: true });

onMounted(() => { fetchCards(); fetchStats(); });
</script>

<style scoped>
.step-pill {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.4rem 0.8rem; border-radius: 9999px;
  font-family: 'Outfit', sans-serif; font-size: 0.78rem; font-weight: 600;
  color: #94A3B8; background: rgba(255,255,255,0.03); border: 1px solid transparent;
  cursor: pointer; transition: all 0.15s ease; white-space: nowrap;
}
.step-pill:hover { color: #F1F5F9; background: rgba(255,255,255,0.06); }
.step-pill-active { color: #C084FC; background: rgba(124,58,237,0.14); border-color: rgba(124,58,237,0.3); }

.slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 9999px; background: rgba(255,255,255,0.06); cursor: pointer; }
.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 0 6px rgba(0,0,0,0.4), 0 0 12px rgba(124,58,237,0.35); cursor: pointer; }
.slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: none; cursor: pointer; }

input[type="checkbox"] { accent-color: #7C3AED; }

.modal-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-content { transform: scale(0.9) translateY(20px); }

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
