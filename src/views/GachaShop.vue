<template>
  <div class="relative min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
    <!-- Atmospheric background (always present) -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute inset-0" style="background:
        radial-gradient(ellipse 60% 40% at 50% 30%, rgba(124, 58, 237, 0.1) 0%, transparent 55%),
        radial-gradient(ellipse 40% 30% at 80% 70%, rgba(245, 158, 11, 0.06) 0%, transparent 45%),
        radial-gradient(ellipse 35% 25% at 20% 60%, rgba(248, 140, 212, 0.04) 0%, transparent 50%);"></div>
      <div class="floating-orb floating-orb-purple" style="width: 300px; height: 300px; top: 10%; left: 60%; animation-delay: -3s;"></div>
      <div class="floating-orb floating-orb-blue" style="width: 220px; height: 220px; bottom: 20%; left: 15%; animation-delay: -7s;"></div>
      <span v-for="i in 14" :key="'bg'+i"
        class="absolute rounded-full animate-particle-float"
        :style="{
          width: (1 + Math.random() * 2) + 'px', height: (1 + Math.random() * 2) + 'px',
          background: ['#7C3AED', '#38BDF8', '#F59E0B', '#F88CD4'][i % 4],
          left: (Math.random() * 100) + '%', top: (Math.random() * 100) + '%',
          opacity: 0.15 + Math.random() * 0.1,
          animationDelay: (i * 0.5) + 's', animationDuration: (5 + Math.random() * 4) + 's',
        }"
      />
    </div>

    <!-- =============== RARITY TRANSITION OVERLAY (sinematik) =============== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="step === 'transition'" class="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
          :style="{ background: highestTheme.stage }">

          <!-- Rays berputar -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="gacha-rays"
              :style="{ background: `conic-gradient(from 0deg, transparent 0deg, ${highestTheme.glow} 6deg, transparent 12deg, transparent 30deg, ${highestTheme.glow} 36deg, transparent 42deg)` }"></div>
          </div>

          <!-- Cincin ekspansi -->
          <div v-for="i in 3" :key="'ring'+i"
            class="absolute rounded-full border pointer-events-none gacha-ring"
            :style="{ borderColor: highestTheme.ring, animationDelay: (i*0.35)+'s' }"></div>

          <!-- Core glow -->
          <div class="absolute w-72 h-72 rounded-full blur-2xl animate-energy-pulse pointer-events-none"
            :style="{ background: `radial-gradient(circle, ${highestTheme.glow}, transparent 68%)` }"></div>

          <!-- Sparkle burst (partikel, bukan emoji) -->
          <span v-for="i in 20" :key="'ts'+i" class="absolute rounded-full pointer-events-none animate-sparkle"
            :style="{
              width: (2 + (i%4))+'px', height: (2 + (i%4))+'px',
              left: (12 + ((i*53)%76))+'%', top: (14 + ((i*37)%72))+'%',
              background: highestTheme.accent,
              boxShadow: `0 0 8px ${highestTheme.accent}`,
              animationDelay: (i*0.06)+'s',
            }"></span>

          <!-- Nama rarity besar -->
          <div class="relative z-10 text-center gacha-rarity-in px-6">
            <p class="text-xs font-display tracking-[0.4em] mb-3" :style="{ color: highestTheme.accent }">PACK OPENED</p>
            <h1 class="gacha-rarity-word"
              :style="{ backgroundImage: highestTheme.grad, filter: `drop-shadow(0 0 22px ${highestTheme.glow})` }">
              {{ highestTheme.label }}
            </h1>
            <div class="flex items-center justify-center gap-3 mt-4">
              <span class="h-px w-16" :style="{ background: `linear-gradient(90deg, transparent, ${highestTheme.accent})` }"></span>
              <span class="w-2 h-2 rotate-45" :style="{ background: highestTheme.accent }"></span>
              <span class="h-px w-16" :style="{ background: `linear-gradient(270deg, transparent, ${highestTheme.accent})` }"></span>
            </div>
            <p class="text-sm font-display text-muted mt-3">{{ revealedCards.length }} kartu menantimu...</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =============== CARD-BY-CARD REVEAL OVERLAY =============== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="step === 'revealing'" class="fixed inset-0 z-[60] flex flex-col items-center justify-between py-6"
          :style="{ background: currentTheme.stage, transition: 'background 0.5s ease' }"
          @touchstart="onRevealTouchStart" @touchmove.prevent="onRevealTouchMove" @touchend="onRevealTouchEnd"
        >
          <!-- Ambient rays bertema rarity -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
            <div class="gacha-rays-slow"
              :style="{ background: `conic-gradient(from 0deg, transparent 0deg, ${currentTheme.glow} 8deg, transparent 16deg, transparent 40deg, ${currentTheme.glow} 48deg, transparent 56deg)` }"></div>
          </div>

          <!-- Top bar -->
          <div class="relative z-20 w-full flex items-center justify-between px-5">
            <span class="text-sm font-display font-semibold" :style="{ color: currentTheme.accent }">
              {{ currentRevealIndex + 1 }} <span class="text-muted">/ {{ revealedCards.length }}</span>
            </span>
            <button @click="skipToSummary"
              class="px-4 py-2 glass-panel text-xs font-display text-muted hover:text-white transition-colors">
              Skip semua ⏭
            </button>
          </div>

          <!-- Card display (BESAR & di tengah) -->
          <div class="relative flex-1 w-full flex items-center justify-center min-h-0">
            <!-- Rarity glow behind card -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="w-[80vw] max-w-sm rounded-full blur-3xl animate-energy-pulse"
                :style="{ aspectRatio: '1', background: `radial-gradient(circle, ${currentTheme.glow} 0%, transparent 68%)` }"></div>
            </div>

            <!-- SATU instance Card3D untuk semua kartu (rebuild in-place).
                 Sekuens sinematik (flip+flash+bloom) dipicu reveal-mode. -->
            <div class="relative h-full flex items-center justify-center"
              style="width: min(86vw, 380px); max-height: 62vh;">
              <div class="rounded-2xl !overflow-visible w-full" style="aspect-ratio: 600/840; max-height: 62vh;"
                :class="'card-frame card-frame-' + currentCard?.rarity?.toLowerCase()">
                <Card3D
                  :image-url="currentCard?.imageUrl"
                  :rarity="currentCard?.rarity"
                  :name="currentCard?.name"
                  :description="currentCard?.description"
                  :hype-score="currentCard?.hypeScore"
                  :likes-per-sec="currentCard?.likesPerSec"
                  :element="currentCard?.element"
                  :foil-style="currentCard?.foilStyle"
                  :img-zoom="currentCard?.imgZoom"
                  :img-offset-x="currentCard?.imgOffsetX"
                  :img-offset-y="currentCard?.imgOffsetY"
                  :drop-rate="playerStore.dropRateOf(currentCard?.id)"
                  mode="full"
                  reveal-mode
                  class="w-full h-full"
                />
              </div>

              <!-- NEW badge mengambang -->
              <div v-if="currentCard?.isNew"
                class="absolute -top-1 right-2 z-20 gacha-rarity-in">
                <span class="text-[11px] font-display font-black tracking-wider px-3 py-1 rounded-full text-black shadow-lg"
                  style="background: linear-gradient(180deg,#FEF9C3,#F59E0B);">NEW!</span>
              </div>
            </div>
          </div>

          <!-- Card info panel (premium, lebar penuh) -->
          <div class="relative z-20 w-full max-w-md px-5" :key="'info-' + currentRevealIndex">
            <div class="gacha-info-in text-center">
              <span class="inline-block text-[11px] font-display font-bold tracking-[0.25em] px-3 py-1 rounded-full mb-2"
                :style="{ color: '#04060F', background: currentTheme.grad }">
                {{ currentTheme.label }}
              </span>
              <h2 class="text-2xl font-display font-black leading-tight"
                :style="{ color: currentTheme.color, textShadow: `0 0 20px ${currentTheme.glow}` }">
                {{ currentCard?.name }}
              </h2>
              <!-- Stat chips -->
              <div class="flex items-center justify-center gap-2 mt-3">
                <span class="glass-panel px-3 py-1.5 text-xs font-display flex items-center gap-1.5">
                  <span class="text-muted">HYPE</span>
                  <span class="font-bold" :style="{ color: currentTheme.accent }">{{ currentCard?.hypeScore }}</span>
                </span>
                <span class="glass-panel px-3 py-1.5 text-xs font-display flex items-center gap-1.5">
                  <span class="text-muted">YIELD</span>
                  <span class="font-bold" :style="{ color: currentTheme.accent }">{{ currentCard?.likesPerSec }}/s</span>
                </span>
                <span v-if="currentCard?.element" class="glass-panel px-3 py-1.5 text-xs font-display">
                  {{ currentCard?.element }}
                </span>
              </div>
            </div>

            <!-- Navigation -->
            <div class="flex items-center gap-3 mt-5">
              <button v-if="currentRevealIndex > 0" @click="prevCard"
                class="btn-secondary px-4 py-3 text-sm font-display">←</button>
              <button @click="nextCard"
                class="btn-primary flex-1 py-3.5 text-sm font-display font-bold">
                {{ currentRevealIndex < revealedCards.length - 1 ? 'Kartu Berikutnya →' : '✅ Lihat Ringkasan' }}
              </button>
            </div>

            <!-- Dots indicator -->
            <div class="flex justify-center gap-2 mt-4">
              <span v-for="(card, idx) in revealedCards" :key="'dot-'+idx"
                class="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
                :class="idx === currentRevealIndex ? 'w-6' : 'w-1.5'"
                :style="{ background: idx <= currentRevealIndex ? themeOf(card.rarity).accent : 'rgba(255,255,255,0.15)' }"
                @click="goToCard(idx)"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =============== SUMMARY OVERLAY =============== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="step === 'summary'" class="fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto py-8"
          :style="{ background: highestTheme.stage }">
          <div class="w-full max-w-md px-5 m-auto">
            <div class="text-center mb-6">
              <p class="text-xs font-display tracking-[0.3em] mb-1" :style="{ color: highestTheme.accent }">PACK OPENED</p>
              <h2 class="text-2xl font-display font-black" :style="{ color: highestTheme.color }">Koleksi Bertambah!</h2>
              <p class="text-muted text-sm mt-1">{{ revealedCards.length }} kartu masuk binder-mu</p>
            </div>

            <!-- Cards grid (lebih besar, premium) -->
            <div class="grid grid-cols-5 gap-2.5 mb-6">
              <div v-for="(card, idx) in revealedCards" :key="'sum-'+idx"
                class="gacha-card-pop relative"
                :style="{ animationDelay: idx * 0.09 + 's' }">
                <div class="aspect-[5/7] rounded-lg overflow-hidden card-frame"
                  :class="'card-frame-' + card.rarity.toLowerCase()"
                  :style="{ boxShadow: `0 4px 16px ${themeOf(card.rarity).glow}` }">
                  <img v-if="card.imageUrl" :src="card.imageUrl" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center"
                    :style="{ background: themeOf(card.rarity).stage }">
                    <span class="w-2.5 h-2.5 rotate-45" :style="{ background: themeOf(card.rarity).accent }"></span>
                  </div>
                </div>
                <span v-if="card.isNew"
                  class="absolute -top-1.5 -right-1.5 text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-lg font-display text-black"
                  style="background: linear-gradient(180deg,#FEF9C3,#F59E0B);">NEW</span>
              </div>
            </div>

            <!-- Stats summary -->
            <div class="glass-panel p-4 mb-5">
              <div class="flex justify-around text-center">
                <div>
                  <p class="text-muted text-[10px] font-display tracking-wider mb-1">DIHABISKAN</p>
                  <p class="font-display font-bold">🪙 100</p>
                </div>
                <div class="w-px bg-white/10"></div>
                <div>
                  <p class="text-muted text-[10px] font-display tracking-wider mb-1">KARTU BARU</p>
                  <p class="font-display font-bold text-legendary">{{ revealedCards.filter(c => c.isNew).length }}</p>
                </div>
                <div class="w-px bg-white/10"></div>
                <div>
                  <p class="text-muted text-[10px] font-display tracking-wider mb-1">TERBAIK</p>
                  <p class="font-display font-bold" :style="{ color: highestTheme.accent }">{{ highestTheme.label }}</p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button @click="resetToIdle" class="btn-primary flex-1 py-3.5 font-display font-bold">🎴 Buka Lagi</button>
              <router-link to="/binder" @click="notifyPackOpened" class="btn-secondary flex-1 py-3.5 font-display text-center">📒 Binder</router-link>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =============== MAIN CONTENT =============== -->
    <div class="relative z-10 flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">

      <!-- Header (only in idle browse) -->
      <div v-if="step === 'idle'" class="flex items-center justify-between mb-4">
        <div class="premium-header">
          <div class="premium-header-icon text-accent">
            <IconBase name="gacha" :size="20" />
          </div>
          <div>
            <h1 class="premium-header-title">Pack Shop</h1>
            <p class="text-muted text-xs mt-0.5">1 Pack = 5 Cards • 100 coin</p>
          </div>
        </div>
        <CoinDisplay :amount="playerStore.coins" size="lg" />
      </div>

      <!-- Persistent Gacha Pack — inline saat idle, FULLSCREEN saat gacha.
           Teleport :disabled menjaga instance & WebGL context tetap hidup
           saat pindah dari kotak ke fullscreen. -->
      <Teleport to="body" :disabled="!isImmersive">
        <div :class="isImmersive
          ? 'fixed inset-0 z-[55] flex flex-col items-center justify-center overflow-hidden gacha-stage'
          : 'relative w-full flex-1 flex flex-col items-center justify-center'"
          v-show="['idle', 'selecting', 'tearing'].includes(step)">

          <!-- Premium immersive backdrop -->
          <template v-if="isImmersive">
            <div class="absolute inset-0 -z-20" style="background:
              radial-gradient(ellipse 90% 70% at 50% 42%, rgba(30,20,55,0.75) 0%, rgba(7,11,26,0.97) 70%),
              #04060F;"></div>
            <!-- Aura glow di belakang pack -->
            <div class="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
              <div class="w-[420px] h-[420px] rounded-full blur-3xl animate-energy-pulse"
                :style="{ background: step === 'selecting'
                  ? 'radial-gradient(circle, rgba(245,158,11,0.22), transparent 68%)'
                  : 'radial-gradient(circle, rgba(252,211,77,0.28), transparent 65%)' }"></div>
            </div>
            <!-- Ambient floating sparks -->
            <div class="absolute inset-0 -z-10 pointer-events-none">
              <span v-for="i in 16" :key="'as'+i"
                class="absolute rounded-full animate-particle-float"
                :style="{
                  width: (1 + (i % 3)) + 'px', height: (1 + (i % 3)) + 'px',
                  background: ['#FCD34D','#F59E0B','#FEF08A'][i % 3],
                  left: ((i * 61) % 100) + '%', top: ((i * 37) % 100) + '%',
                  opacity: 0.35,
                  animationDelay: (i * 0.4) + 's', animationDuration: (5 + (i % 4)) + 's',
                }" />
            </div>
          </template>

          <!-- Back button saat memilih pack -->
          <button v-if="step === 'selecting'" @click="cancelSelecting"
            class="absolute top-4 left-4 z-30 px-4 py-2 glass-panel text-xs font-display text-muted hover:text-white transition-colors">
            ← Batal
          </button>

          <!-- Judul immersive -->
          <div v-if="step === 'selecting'" class="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none w-full px-6">
            <p class="text-legendary font-display font-bold text-lg animate-pulse drop-shadow-lg">Pilih Pack Keberuntunganmu</p>
            <p class="text-muted text-xs mt-1">Geser untuk memutar • Tap pack yang kamu mau</p>
          </div>

          <!-- Canvas holder: kotak saat idle, penuh saat immersive -->
          <div :class="isImmersive
              ? 'w-full max-w-md h-[70vh] max-h-[640px]'
              : 'glass-panel p-3 rounded-2xl w-full max-w-sm'"
            :style="isImmersive ? 'touch-action:none;' : 'height:380px;touch-action:none;'">
            <GachaPack
              ref="packRef"
              :select-mode="step === 'selecting'"
              :tearing="step === 'tearing' && tearAnimating"
              :tear-mode="step === 'tearing'"
              @pack-selected="onPackSelected"
              @tear-drag-complete="onTearDragComplete"
              @tear-animation-complete="onTearAnimationComplete"
              @tear-progress="onTearProgress"
            />
          </div>

          <!-- Auto-tear helper -->
          <button v-if="step === 'tearing' && !tearAnimating" @click="triggerAutoTear"
            class="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 btn-secondary py-2 px-5 text-sm font-display animate-pulse">
            ⚡ Buka Otomatis
          </button>

          <!-- IDLE controls (hanya saat inline) -->
          <div v-if="step === 'idle'" class="w-full max-w-xs flex flex-col items-center mt-6">
            <p v-if="checkingCards" class="text-center text-muted text-xs mb-4">⏳ Mengecek kartu...</p>
            <p v-else-if="masterCardCount === 0" class="text-center text-red-400 text-xs mb-4 glass-panel p-3 rounded-xl border border-red-500/20">
              ⚠️ <strong>Belum ada kartu tersedia.</strong><br>
              <span class="text-muted">Jalankan <code class="text-accent bg-white/5 px-1 rounded">npm run db:seed</code> atau buat kartu di Admin.</span>
            </p>
            <p v-else class="text-center text-muted text-xs mb-4">{{ masterCardCount }} kartu tersedia • Putar pack untuk melihat-lihat</p>

            <!-- Pity: jaminan Epic+ (4★) & Legendary (5★) ala Genshin -->
            <div class="w-full mb-4 glass-panel rounded-xl px-4 py-3 space-y-3">
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-[11px] font-display text-epic-light flex items-center gap-1">💎 Jaminan Epic+</span>
                  <span class="text-[11px] font-display font-bold tabular-nums" :class="pityRemainingPacks <= 1 ? 'text-legendary' : 'text-muted'">
                    {{ pityRemainingPacks }} pack lagi
                  </span>
                </div>
                <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500"
                    style="background: linear-gradient(90deg,#A855F7,#C084FC);"
                    :style="{ width: (pityProgress * 100) + '%' }"></div>
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-[11px] font-display text-legendary flex items-center gap-1">👑 Jaminan Legendary</span>
                  <span class="text-[11px] font-display font-bold tabular-nums" :class="legPityRemainingPacks <= 2 ? 'text-legendary' : 'text-muted'">
                    {{ legPityRemainingPacks }} pack lagi
                  </span>
                </div>
                <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500"
                    style="background: linear-gradient(90deg,#D97706,#FCD34D);"
                    :style="{ width: (legPityProgress * 100) + '%' }"></div>
                </div>
              </div>
            </div>

            <button @click="startOpening" :disabled="playerStore.coins < 100 || masterCardCount === 0"
              data-tour="open-pack"
              class="btn-primary w-full py-4 text-lg font-display relative overflow-hidden group">
              <span class="relative z-10 flex items-center justify-center gap-2">
                <template v-if="playerStore.coins < 100">
                  <span>Koin tidak cukup</span>
                  <span class="text-sm opacity-70">(100 🪙)</span>
                </template>
                <template v-else>
                  <span class="text-xl group-hover:animate-pack-shake">🎴</span>
                  <span>Buka Pack — 100 🪙</span>
                </template>
              </span>
            </button>
            <button @click="openRates" class="mt-3 text-xs font-display text-muted hover:text-white transition-colors flex items-center gap-1.5">
              <span>📊</span> Lihat Peluang Drop
            </button>
          </div>
        </div>
      </Teleport>

      <!-- ============ MODAL PELUANG DROP ============ -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showRates" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style="background: rgba(4,6,15,0.85);" @click.self="showRates = false">
            <div class="w-full sm:max-w-md glass-panel-strong rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" style="max-height: 85vh;">
              <div class="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
                <div>
                  <h3 class="font-display font-bold text-white">📊 Peluang Drop</h3>
                  <p class="text-[11px] text-muted">Peluang tiap kartu muncul saat buka pack</p>
                </div>
                <button @click="showRates = false" class="text-muted hover:text-white p-1.5 glass-panel rounded-full">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="overflow-y-auto scrollbar-thin px-3 py-3">
                <p v-if="ratesLoading" class="text-center text-muted text-sm py-8">⏳ Memuat peluang...</p>
                <template v-else v-for="tier in ratesByRarity" :key="tier.rarity">
                  <div v-if="tier.cards.length" class="mb-3">
                    <div class="flex items-center justify-between px-2 mb-1.5">
                      <span class="rarity-badge text-[9px]" :class="'rarity-' + tier.rarity.toLowerCase()">{{ tier.rarity }}</span>
                      <span class="text-[11px] text-muted font-display">Total tier {{ tier.base }}%</span>
                    </div>
                    <div v-for="c in tier.cards" :key="c.id"
                      class="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5">
                      <div class="w-6 h-8 rounded overflow-hidden flex-shrink-0 bg-surface-card">
                        <img v-if="c.imageUrl" :src="c.imageUrl" class="w-full h-full object-cover" />
                      </div>
                      <span class="flex-1 text-sm font-display truncate">{{ c.name }}</span>
                      <span class="text-sm font-display font-bold tabular-nums"
                        :class="'text-' + tier.rarity.toLowerCase() + '-light'">
                        {{ c.dropRate < 1 ? c.dropRate.toFixed(2) : c.dropRate.toFixed(1) }}%
                      </span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Coin warning -->
      <div v-if="playerStore.coins < 100 && step === 'idle'"
        class="mt-4 glass-panel p-4 border-red-500/20 text-sm text-center text-secondary">
        <span class="text-red-400">⚠️</span> Koin tidak cukup. Claim koin pasif dari Dashboard atau jual kartu duplikat!
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import { useSound } from '@/composables/useSound.js';
import { PITY_THRESHOLD, LEGENDARY_PITY } from '@/utils/progression.js';
import CoinDisplay from '@/components/CoinDisplay.vue';
import Card3D from '@/components/Card3D.vue';
import GachaPack from '@/components/GachaPack.vue';
import IconBase from '@/components/IconBase.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();
const sound = useSound();

// State machine: idle → selecting → tearing → transition → revealing → summary
const step = ref('idle');

// Pack tampil fullscreen saat memilih & merobek (bukan di kotak kecil)
const isImmersive = computed(() => step.value === 'selecting' || step.value === 'tearing');

// Pity dihitung per-kartu (adil, = per-pull ala Genshin), tapi DITAMPILKAN
// dalam satuan pack (1 pack = 5 kartu) agar sesuai cara pandang "berapa kali pull".
const CARDS_PER_PACK = 5;
// Jaminan Epic+ (4★) tiap PITY_THRESHOLD kartu
const pityCounter = computed(() => authStore.user?.pityCounter || 0);
const pityRemaining = computed(() => Math.max(0, PITY_THRESHOLD - pityCounter.value));
const pityRemainingPacks = computed(() => Math.ceil(pityRemaining.value / CARDS_PER_PACK));
const pityProgress = computed(() => Math.min(1, pityCounter.value / PITY_THRESHOLD));
// Jaminan Legendary (5★) tiap LEGENDARY_PITY kartu
const legPityCounter = computed(() => authStore.user?.legendaryPity || 0);
const legPityRemaining = computed(() => Math.max(0, LEGENDARY_PITY - legPityCounter.value));
const legPityRemainingPacks = computed(() => Math.ceil(legPityRemaining.value / CARDS_PER_PACK));
const legPityProgress = computed(() => Math.min(1, legPityCounter.value / LEGENDARY_PITY));
const revealedCards = ref([]);
const highestRarity = ref('Common');
const currentRevealIndex = ref(0);
const tearAnimating = ref(false);
const tearAnimationFinished = ref(false);
const packRef = ref(null);

// Swipe tracking for card reveal
let revealTouchStartX = 0;

const rarityEmblems = { Common: '🐱', Rare: '💠', Epic: '💎', Legendary: '👑' };
const rarityGlowColors = {
  Common: 'rgba(148, 163, 184, 0.3)',
  Rare: 'rgba(56, 189, 248, 0.4)',
  Epic: 'rgba(168, 85, 247, 0.5)',
  Legendary: 'rgba(245, 158, 11, 0.6)',
};

// Tema rarity premium — dipakai overlay reveal/transition (tanpa emoji)
const RARITY_THEME = {
  Common: {
    label: 'COMMON', color: '#E2E8F0', accent: '#94A3B8',
    grad: 'linear-gradient(180deg,#F1F5F9,#94A3B8)',
    glow: 'rgba(148,163,184,0.55)',
    stage: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(51,65,85,0.55) 0%, rgba(7,11,26,0.98) 72%), #04060F',
    ring: 'rgba(148,163,184,0.5)',
  },
  Rare: {
    label: 'RARE', color: '#BAE6FD', accent: '#38BDF8',
    grad: 'linear-gradient(180deg,#E0F7FF,#0EA5E9)',
    glow: 'rgba(56,189,248,0.6)',
    stage: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(8,47,73,0.7) 0%, rgba(4,9,20,0.98) 72%), #03060F',
    ring: 'rgba(56,189,248,0.55)',
  },
  Epic: {
    label: 'EPIC', color: '#E9D5FF', accent: '#A855F7',
    grad: 'linear-gradient(180deg,#F3E8FF,#7C3AED)',
    glow: 'rgba(168,85,247,0.65)',
    stage: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(44,18,96,0.72) 0%, rgba(8,4,20,0.98) 72%), #06040F',
    ring: 'rgba(192,132,252,0.6)',
  },
  Legendary: {
    label: 'LEGENDARY', color: '#FEF3C7', accent: '#F59E0B',
    grad: 'linear-gradient(180deg,#FEF9C3,#D97706)',
    glow: 'rgba(245,158,11,0.7)',
    stage: 'radial-gradient(ellipse 85% 65% at 50% 40%, rgba(60,37,6,0.8) 0%, rgba(9,5,2,0.98) 70%), #08050F',
    ring: 'rgba(252,211,77,0.65)',
  },
};
const themeOf = (r) => RARITY_THEME[r] || RARITY_THEME.Common;
const currentTheme = computed(() => themeOf(currentCard.value?.rarity));
const highestTheme = computed(() => themeOf(highestRarity.value));

const currentCard = computed(() => revealedCards.value[currentRevealIndex.value]);

const currentCardGlow = computed(() => {
  const r = currentCard.value?.rarity;
  return rarityGlowColors[r] || 'rgba(124, 58, 237, 0.15)';
});

const transitionBg = computed(() => {
  return {
    Common: 'radial-gradient(ellipse at center, rgba(148,163,184,0.15) 0%, #070B1A 60%)',
    Rare: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.2) 0%, #070B1A 60%)',
    Epic: 'radial-gradient(ellipse at center, rgba(168,85,247,0.3) 0%, #070B1A 50%)',
    Legendary: 'radial-gradient(ellipse at center, rgba(245,158,11,0.35) 0%, rgba(252,211,77,0.1) 30%, #070B1A 60%)',
  }[highestRarity.value] || '#070B1A';
});

// === FLOW FUNCTIONS ===

function startOpening() {
  if (playerStore.coins < 100) return;
  // Transisi pack BERPUTAR (carousel) — user memilih pack-nya sendiri
  step.value = 'selecting';
  sound.pauseMusic();      // OST berhenti selama sesi gacha
  sound.play('gachaWait'); // musik tunggu saat pack berputar
}

// Batal memilih pack → kembali ke shop idle
function cancelSelecting() {
  sound.stop('gachaWait');
  step.value = 'idle';
}

// Pack pilihan sudah fokus ke tengah → masuk mode sobek + panggil API
function onPackSelected() {
  sound.stop('gachaWait'); // pack terpilih → hentikan musik tunggu
  sound.play('select');
  step.value = 'tearing';
  tearAnimating.value = false;
  tearAnimationFinished.value = false;
  fetchCards();
}

let pendingCards = null;
let apiDone = false;

async function fetchCards() {
  apiDone = false;
  pendingCards = null;
  try {
    const res = await fetch('/api/gacha', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (!res.ok) {
      let errMsg = 'Gagal membuka pack.';
      try { const d = await res.json(); errMsg = d.message || errMsg; } catch(_){}
      toast.error(errMsg);
      step.value = 'idle';
      return;
    }
    const data = await res.json();
    pendingCards = data.cardsDrawn || [data.cardDrawn];
    highestRarity.value = data.highestRarity || pendingCards[pendingCards.length - 1]?.rarity || 'Common';
    apiDone = true;

    // Check if both animation and API completed
    checkAndProceed();
  } catch (e) {
    toast.error('Gagal membuka pack. Coba lagi.');
    step.value = 'idle';
  }
}

function onTearProgress(progress) {
  // Visual feedback only — handled in GachaPack
}

function onTearDragComplete() {
  tearAnimating.value = true;
}

function onTearAnimationComplete() {
  tearAnimationFinished.value = true;
  checkAndProceed();
}

function checkAndProceed() {
  if (apiDone && tearAnimationFinished.value) {
    proceedToTransition();
  }
}

function triggerAutoTear() {
  if (packRef.value) {
    packRef.value.tearProgressPercent = 1;
  }
  onTearDragComplete();
}

async function proceedToTransition() {
  if (!pendingCards || pendingCards.length === 0) {
    step.value = 'idle';
    return;
  }

  revealedCards.value = pendingCards;
  currentRevealIndex.value = 0;

  // Show rarity transition effect
  step.value = 'transition';

  // SFX + haptic sesuai rarity tertinggi
  const rk = (highestRarity.value || 'Common');
  sound.play('reveal' + rk);
  if (rk === 'Legendary') sound.haptic([60, 40, 80, 40, 120]);
  else if (rk === 'Epic') sound.haptic([40, 30, 60]);

  // Duration based on rarity
  const transitionMs = {
    Common: 1200,
    Rare: 1800,
    Epic: 2500,
    Legendary: 3500,
  }[highestRarity.value] || 1500;

  // Fire confetti for Epic/Legendary
  if (highestRarity.value === 'Epic' || highestRarity.value === 'Legendary') {
    try {
      const confetti = (await import('canvas-confetti')).default;
      const isLegendary = highestRarity.value === 'Legendary';
      const colors = isLegendary
        ? ['#F59E0B', '#FCD34D', '#D97706', '#FBBF24']
        : ['#A855F7', '#C084FC', '#7C3AED', '#8B5CF6'];
      setTimeout(() => confetti({ particleCount: isLegendary ? 200 : 100, spread: 90, origin: { y: 0.5 }, colors, ticks: 100 }), 500);
      if (isLegendary) {
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { y: 0.4 }, colors }), 1200);
        setTimeout(() => confetti({ particleCount: 100, spread: 70, origin: { x: 0.2, y: 0.5 }, colors }), 2000);
        setTimeout(() => confetti({ particleCount: 100, spread: 70, origin: { x: 0.8, y: 0.5 }, colors }), 2000);
      }
    } catch(e) {}
  }

  await new Promise(r => setTimeout(r, transitionMs));

  step.value = 'revealing';
  await playerStore.refreshAfterAction();
}

// === CARD REVEAL NAVIGATION ===

function nextCard() {
  if (currentRevealIndex.value < revealedCards.value.length - 1) {
    currentRevealIndex.value++;
    sound.play('cardFlip');
  } else {
    skipToSummary();
  }
}

function prevCard() {
  if (currentRevealIndex.value > 0) { currentRevealIndex.value--; sound.play('cardFlip'); }
}

function goToCard(idx) {
  if (idx >= 0 && idx < revealedCards.value.length) currentRevealIndex.value = idx;
}

function skipToSummary() {
  step.value = 'summary';
}

// Swipe navigation for reveal
function onRevealTouchStart(e) {
  if (e.touches.length === 1) revealTouchStartX = e.touches[0].clientX;
}
function onRevealTouchMove(e) { /* handled in touchend */ }
function onRevealTouchEnd(e) {
  const dx = (e.changedTouches?.[0]?.clientX || 0) - revealTouchStartX;
  if (Math.abs(dx) > 30) {
    if (dx < 0) nextCard(); // swipe left = next
    else prevCard(); // swipe right = prev
  }
}

// Beritahu onboarding tour bahwa pack sudah dibuka (dipakai dua jalur keluar summary)
function notifyPackOpened() {
  window.dispatchEvent(new CustomEvent('tour:pack-opened'));
}

function resetToIdle() {
  // Beritahu tour bila user benar-benar sudah membuka pack (ada kartu terungkap)
  if (revealedCards.value.length > 0) notifyPackOpened();
  sound.stop('gachaWait');  // pengaman: pastikan musik tunggu berhenti
  sound.resumeMusic();      // OST kembali menyala di menu
  step.value = 'idle';
  revealedCards.value = [];
  currentRevealIndex.value = 0;
  tearAnimating.value = false;
  tearAnimationFinished.value = false;
  pendingCards = null;
  apiDone = false;
}

const masterCardCount = ref(0);
const checkingCards = ref(true);

// ── Modal Peluang Drop ──
const showRates = ref(false);
const ratesLoading = ref(false);
const ratesCards = ref([]);
const ratesChances = ref({ Legendary: 2, Epic: 8, Rare: 20, Common: 70 });
const RARITY_TIER_ORDER = ['Legendary', 'Epic', 'Rare', 'Common'];

const ratesByRarity = computed(() =>
  RARITY_TIER_ORDER.map(rarity => ({
    rarity,
    base: ratesChances.value[rarity] ?? 0,
    cards: ratesCards.value
      .filter(c => c.rarity === rarity)
      .sort((a, b) => b.dropRate - a.dropRate),
  }))
);

async function openRates() {
  showRates.value = true;
  if (ratesCards.value.length) return; // sudah dimuat
  ratesLoading.value = true;
  try {
    const res = await fetch('/api/gacha-rates');
    const data = await res.json();
    if (res.ok) {
      ratesCards.value = data.cards || [];
      if (data.rarityChances) ratesChances.value = data.rarityChances;
    }
  } catch (e) { /* biarkan kosong */ }
  finally { ratesLoading.value = false; }
}

async function checkCardAvailability() {
  checkingCards.value = true;
  try {
    const res = await fetch('/api/master-cards');
    if (res.ok) {
      const data = await res.json();
      masterCardCount.value = data.cards?.length || 0;
    }
  } catch (e) {
    masterCardCount.value = 0;
  } finally {
    checkingCards.value = false;
  }
}

onMounted(async () => {
  await authStore.fetchMe();
  await checkCardAvailability();
  playerStore.fetchDropRates();
});

// Keluar halaman di tengah sesi gacha → hentikan musik tunggu & kembalikan OST
onUnmounted(() => {
  sound.stop('gachaWait');
  sound.resumeMusic();
});
</script>

<style scoped>
.fade-enter-active { transition: opacity 0.4s ease; }
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Transisi premium idle → fullscreen pemilihan pack */
.gacha-stage {
  animation: gacha-stage-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes gacha-stage-in {
  0%   { opacity: 0; backdrop-filter: blur(0); transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1); }
}

/* Rays berputar (rarity transition) */
.gacha-rays {
  width: 200vmax; height: 200vmax;
  animation: gacha-spin 14s linear infinite;
  mix-blend-mode: screen;
}
.gacha-rays-slow {
  width: 200vmax; height: 200vmax;
  animation: gacha-spin 34s linear infinite;
  mix-blend-mode: screen;
}
@keyframes gacha-spin { to { transform: rotate(360deg); } }

/* Cincin ekspansi */
.gacha-ring {
  width: 120px; height: 120px; border-width: 2px;
  animation: gacha-ring-expand 1.6s ease-out infinite;
}
@keyframes gacha-ring-expand {
  0%   { width: 100px; height: 100px; opacity: 0.9; }
  100% { width: 620px; height: 620px; opacity: 0; }
}

/* Nama rarity besar — masuk dengan pop + shimmer */
.gacha-rarity-word {
  font-family: 'Cinzel', 'Outfit', serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 9.5vw, 5.5rem);
  line-height: 1;
  letter-spacing: 0.06em;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  background-size: 100% 100%;
}
.gacha-rarity-in {
  animation: gacha-pop 0.7s cubic-bezier(0.16, 1.4, 0.3, 1) both;
}
@keyframes gacha-pop {
  0%   { opacity: 0; transform: scale(0.7) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* Info panel reveal masuk dari bawah */
.gacha-info-in {
  animation: gacha-info-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes gacha-info-up {
  0%   { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Kartu summary muncul berurutan */
.gacha-card-pop {
  animation: gacha-card-pop 0.5s cubic-bezier(0.16, 1.3, 0.3, 1) both;
}
@keyframes gacha-card-pop {
  0%   { opacity: 0; transform: scale(0.6) translateY(14px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
