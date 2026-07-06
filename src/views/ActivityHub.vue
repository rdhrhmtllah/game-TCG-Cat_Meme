<template>
  <div class="max-w-7xl mx-auto px-4 py-6 pb-28">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div class="premium-header">
        <div class="premium-header-icon text-accent">
          <IconBase name="activities" :size="20" />
        </div>
        <div>
          <h1 class="premium-header-title text-2xl">Activities Dashboard</h1>
          <p class="text-muted text-xs mt-0.5">Selesaikan quest harian & tantangan untuk meraih koin ekstra!</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <!-- XP / Level widget -->
        <div class="glass-panel rounded-xl px-3.5 py-2 min-w-[150px]">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[11px] font-display font-bold text-accent-soft">⭐ Level {{ levelInfo.level }}</span>
            <span class="text-[9px] text-muted font-display tabular-nums">{{ levelInfo.xpIntoLevel }}/{{ levelInfo.xpForNext }} XP</span>
          </div>
          <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700"
              style="background: linear-gradient(90deg,#7C3AED,#A855F7);"
              :style="{ width: (levelInfo.progress * 100) + '%' }"></div>
          </div>
        </div>
        <CoinDisplay :amount="playerStore.coins" size="lg" />
      </div>
    </div>

    <!-- ===== QUICK CLAIM CENTER (Claimable Rewards) ===== -->
    <Transition name="fade-slide">
      <div v-if="quickClaims.length > 0" class="mb-6 relative overflow-hidden rounded-2xl p-0.5"
        style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.4), rgba(124, 58, 237, 0.3), rgba(56, 189, 248, 0.4)); box-shadow: 0 8px 32px rgba(245, 158, 11, 0.15), 0 0 40px rgba(124, 58, 237, 0.08);">
        <div class="glass-panel-strong p-5 rounded-[14px] relative z-10">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl animate-bounce">🎁</span>
              <div>
                <h2 class="text-base font-display font-bold text-legendary-light">Reward Center</h2>
                <p class="text-muted text-[11px] mt-0.5">Kamu memiliki {{ quickClaims.length }} reward siap klaim!</p>
              </div>
            </div>
            <button @click="claimAllRewards" :disabled="claimingAll"
              class="btn-primary py-2 px-5 text-xs font-display flex items-center gap-2 self-start sm:self-auto"
              style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
              <span>{{ claimingAll ? 'Mengproses...' : '⚡ Klaim Semua' }}</span>
            </button>
          </div>

          <!-- Claimable List -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
            <div v-for="item in quickClaims" :key="item.type + '-' + item.key"
              class="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
              <div class="flex items-center gap-3 min-w-0">
                <span class="text-xl flex-shrink-0">{{ item.icon }}</span>
                <div class="min-w-0">
                  <p class="text-xs font-display font-semibold truncate text-white">{{ item.title }}</p>
                  <span class="text-[9px] uppercase tracking-wider text-muted font-display block mt-0.5">{{ item.label }}</span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-display font-bold text-emerald-400">+{{ item.reward }} 🪙</span>
                <button @click="item.type === 'mission' ? claimMission(item.key) : claimAchievement(item.key)"
                  class="btn-primary btn-sm !py-1.5 !px-3.5 !text-[11px] !rounded-lg"
                  style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">
                  Klaim
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===== LEVEL & XP (penjelasan progres) ===== -->
    <section class="section-glass p-5 mb-6" data-tour="xp">
      <div class="flex items-center gap-4">
        <div class="xp-level-badge flex-shrink-0">
          <span class="text-[9px] font-display text-muted leading-none">LEVEL</span>
          <span class="font-display font-black text-2xl leading-none brand-title-gradient">{{ levelInfo.level }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-sm font-display font-bold flex items-center gap-1.5"><span>⭐</span> Level & XP</span>
            <span class="text-[11px] text-muted font-display tabular-nums">{{ levelInfo.xpIntoLevel }} / {{ levelInfo.xpForNext }} XP</span>
          </div>
          <div class="xp-track-lg"><div class="xp-fill-lg" :style="{ width: (levelInfo.progress * 100) + '%' }"></div></div>
          <p class="text-[11px] text-muted mt-2 font-dm-sans">
            <strong class="text-accent-soft tabular-nums">{{ xpToNext }} XP</strong> lagi menuju
            <strong class="text-white">Level {{ levelInfo.level + 1 }}</strong>
            <span class="text-emerald-400 font-display">· hadiah +{{ nextLevelReward.toLocaleString('id-ID') }} 🪙</span>
          </p>
        </div>
      </div>

      <div class="border-t border-white/5 mt-4 pt-4">
        <XpGuide />
      </div>
    </section>

    <!-- ===== REDEEM CODE ===== -->
    <section class="section-glass p-5 mb-6">
      <div class="flex items-center gap-2 mb-1.5">
        <span class="text-base">🎁</span>
        <h2 class="text-sm font-display font-bold">Redeem Code</h2>
      </div>
      <p class="text-[11px] text-muted mb-3 leading-relaxed">Punya kode promo dari developer? Tukarkan di sini untuk hadiah coin.</p>
      <div class="flex items-center gap-2">
        <input v-model="redeemInput" @keyup.enter="doRedeem" :disabled="redeeming" maxlength="40"
          class="input-premium flex-1 font-display tracking-wider uppercase" placeholder="MASUKKAN KODE" />
        <button @click="doRedeem" :disabled="redeeming || !redeemInput.trim()" class="btn-primary px-5 font-display flex-shrink-0">
          {{ redeeming ? '⏳' : '🎁 Redeem' }}
        </button>
      </div>
    </section>

    <!-- ===== MAIN DASHBOARD GRID ===== -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- COLUMN 1: LOGIN & SPIN (LEFT) -->
      <div class="lg:col-span-4 space-y-6">
        
        <!-- DAILY LOGIN -->
        <section class="section-glass p-5 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-legendary/10 to-transparent rounded-full blur-xl pointer-events-none"></div>
          
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-display font-bold flex items-center gap-2">
              <span class="text-base">🌅</span> Daily Login
            </h2>
            <span v-if="loginData.streak > 0" class="text-xs font-display font-bold text-legendary flex items-center gap-1">
              <span>🔥</span> {{ loginData.streak }} hari
            </span>
          </div>

          <!-- Streak Calendar -->
          <div class="grid grid-cols-7 gap-1.5 mb-4">
            <div v-for="day in 7" :key="'s'+day"
              class="flex flex-col items-center justify-between rounded-xl py-2 text-center transition-all streak-day cursor-default border"
              :class="day <= loginData.streak
                ? 'bg-gradient-to-b from-legendary/20 to-legendary/5 text-legendary-light border-legendary/30 shadow-sm shadow-legendary/5'
                : 'glass-panel text-muted/60 border-transparent'">
              <p class="text-[10px] font-display font-semibold opacity-85">D{{ day }}</p>
              <p class="text-lg my-1.5 filter drop-shadow-sm">{{ day <= loginData.streak ? '🔥' : '🔒' }}</p>
              <p class="text-[8px] font-display font-bold">{{ [50,75,100,125,150,200,500][day-1] }}🪙</p>
            </div>
          </div>

          <button @click="claimDailyLogin" :disabled="loginData.claimed" class="btn-primary w-full py-3 text-sm font-display">
            {{ loginData.claimed ? '✅ Sudah Diklaim' : '🌅 Klaim Login Harian' }}
          </button>
        </section>

        <!-- SPIN WHEEL -->
        <section class="section-glass p-5 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-xl pointer-events-none"></div>
          
          <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-4">
            <span class="text-base">🎰</span> Fortune Wheel
          </h2>
          
          <div class="relative mx-auto mb-5 wheel-container" style="width: 250px; height: 250px;">
            <!-- Outer glowing neon border -->
            <div class="absolute inset-0 rounded-full border border-white/5 bg-gradient-to-br from-white/5 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.03)] z-0"></div>
            <!-- Outer neon indicators -->
            <div class="absolute inset-0 rounded-full z-10 border border-accent/20 animate-pulse-slow"></div>
            
            <!-- Wheel disk -->
            <div class="w-full h-full rounded-full border-4 border-white/10 relative overflow-hidden z-10"
              :style="{ transform: `rotate(${wheelRotation}deg)`, transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }">
              <div v-for="(prize, i) in prizes" :key="'p'+i"
                class="absolute left-1/2 top-0 origin-bottom text-center"
                :style="{
                  width: '80px', height: '125px', marginLeft: '-40px',
                  transform: `rotate(${i * (360 / prizes.length)}deg)`,
                }">
                <span class="text-[10px] font-display font-bold block mt-6" :style="{ color: prize.color }">
                  {{ prize.amount }}
                </span>
                <span class="text-[10px] block mt-0.5">🪙</span>
              </div>
            </div>
            <!-- Center pointer -->
            <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">▼</div>
            <!-- Center circle -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div class="w-14 h-14 rounded-full glass-panel-strong flex items-center justify-center border border-white/10 shadow-lg">
                <span class="text-xl">🎰</span>
              </div>
            </div>
          </div>
          
          <button @click="spinTheWheel" :disabled="!canSpin || spinning" class="btn-primary w-full py-3 text-sm font-display">
            {{ spinning ? '🎰 Berputar...' : !canSpin ? '⏳ Sudah Spin Hari Ini' : '🎰 Spin Gratis!' }}
          </button>
          
          <Transition name="scale">
            <p v-if="spinResult" class="text-center mt-3 text-sm font-display font-bold py-2 rounded-xl bg-white/[0.03] border border-white/5 animate-scale-in"
              :class="spinResult.prize.amount >= 100 ? 'text-legendary-light' : 'text-secondary'">
              🎉 Reward: +{{ spinResult.prize.amount }} koin!
            </p>
          </Transition>
        </section>

      </div>

      <!-- COLUMN 2: GAMES & FUSION (CENTER) -->
      <div class="lg:col-span-4 space-y-6">
        
        <!-- COIN FLIP -->
        <section class="section-glass p-5 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rare/10 to-transparent rounded-full blur-xl pointer-events-none"></div>

          <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-4">
            <span class="text-base">🪙</span> Coin Flip Arena
          </h2>

          <div class="space-y-4">
            <!-- Bet Amount Input & Shortcuts -->
            <div>
              <label class="block text-[11px] font-display font-semibold text-secondary mb-1.5 uppercase tracking-wider">Jumlah Taruhan</label>
              <div class="flex items-center gap-2">
                <input v-model.number="flipBet" type="number" min="10" max="500" placeholder="10-500"
                  class="input-premium text-center text-sm font-bold flex-1" />
                <div class="flex gap-1">
                  <button @click="flipBet = Math.min(playerStore.coins, 10)" class="quick-bet-btn">Min</button>
                  <button @click="adjustBet(50)" class="quick-bet-btn">+50</button>
                  <button @click="adjustBet(100)" class="quick-bet-btn">+100</button>
                  <button @click="flipBet = Math.min(playerStore.coins, 500)" class="quick-bet-btn">Max</button>
                </div>
              </div>
            </div>

            <!-- Choice Selector -->
            <div>
              <label class="block text-[11px] font-display font-semibold text-secondary mb-2 uppercase tracking-wider">Pilih Sisi</label>
              <div class="grid grid-cols-2 gap-2.5">
                <button @click="flipChoice = 'heads'" class="flip-choice-btn flex items-center justify-center gap-1.5"
                  :class="flipChoice === 'heads' ? 'bg-legendary/20 text-legendary-light border-legendary/40 shadow-sm shadow-legendary/10' : 'glass-panel text-muted/80 border-transparent'">
                  <span>👑</span> Heads
                </button>
                <button @click="flipChoice = 'tails'" class="flip-choice-btn flex items-center justify-center gap-1.5"
                  :class="flipChoice === 'tails' ? 'bg-accent/20 text-accent-soft border-accent/40 shadow-sm shadow-accent/10' : 'glass-panel text-muted/80 border-transparent'">
                  <span>🌙</span> Tails
                </button>
              </div>
            </div>

            <!-- Coin Flip Arena — koin 3D dua sisi -->
            <div class="flip-arena my-1"
              :class="flipping ? 'is-flipping' : (flipResult ? (flipResult.won ? 'is-win' : 'is-lose') : '')">
              <div class="coin-arena-glow" :class="{'flipping-glow': flipping}"></div>
              <div class="coin-pedestal"></div>
              <div class="coin-stage" :class="{ tossing: flipping }">
                <div class="coin3d" :style="{ transform: `rotateX(${coinDeg}deg)`, transition: coinTransition }">
                  <div class="coin-face coin-heads">👑</div>
                  <div class="coin-face coin-tails">🌙</div>
                </div>
              </div>
            </div>

            <!-- Flip Execute -->
            <button @click="doFlip" :disabled="!flipChoice || !flipBet || flipping || flipBet < 10 || flipBet > 500 || playerStore.coins < flipBet"
              class="btn-primary w-full py-3 text-sm font-display">
              {{ flipping ? '🔄 Sedang Flip...' : `🪙 Pasang Flip (${flipBet || 0} koin)` }}
            </button>

            <!-- Result Msg -->
            <Transition name="scale">
              <p v-if="flipResult" class="text-center text-sm font-display font-bold py-2.5 rounded-xl border animate-scale-in"
                :class="flipResult.won ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'">
                {{ flipResult.won ? `🎉 MENANG! +${flipResult.betAmount}` : `😢 KALAH! -${flipResult.betAmount}` }} koin
              </p>
            </Transition>
          </div>
        </section>

        <!-- CARD FUSION -->
        <section class="section-glass p-5 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-epic/10 to-transparent rounded-full blur-xl pointer-events-none"></div>

          <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-2">
            <span class="text-base">⚗️</span> Card Fusion Lab
          </h2>
          <p class="text-[11px] text-muted mb-4 leading-relaxed">Gabungkan 3 kartu identik untuk mensintesis 1 kartu dengan tingkat rarity yang lebih tinggi!</p>

          <!-- Candidate List -->
          <div v-if="fusionCandidates.length === 0" class="text-center text-muted text-xs py-8 border border-white/[0.03] bg-white/[0.01] rounded-2xl flex flex-col items-center justify-center gap-2">
            <span class="text-3xl opacity-40">🧪</span>
            <p>Belum ada kartu dengan qty ≥ 3 untuk difusikan.</p>
          </div>
          <div v-else class="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            <div v-for="item in fusionCandidates" :key="item.id"
              class="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
              <div class="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 card-frame border border-white/10"
                :class="'card-frame-' + item.card.rarity.toLowerCase()">
                <img v-if="item.card?.imageUrl" :src="item.card.imageUrl" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-display font-semibold truncate text-white">{{ item.card?.name }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="rarity-badge text-[7px] py-0.5 px-1.5" :class="'rarity-' + item.card?.rarity?.toLowerCase()">{{ item.card?.rarity }}</span>
                  <span class="text-[10px] text-muted font-display font-bold">Qty: {{ item.quantity }}</span>
                </div>
              </div>
              <button @click="doFusion(item)" :disabled="fusionLoading"
                class="text-[10px] bg-epic text-white px-3.5 py-2 rounded-full font-display font-bold hover:bg-epic-light hover:shadow-lg hover:shadow-epic/20 transition-all">
                ⚗️ Fuse 3→1
              </button>
            </div>
          </div>

          <!-- Fusion Result Panel -->
          <Transition name="scale">
            <div v-if="fusionResult" class="mt-4 p-4 rounded-xl border border-legendary/20 bg-legendary/5 text-center animate-scale-in relative overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-r from-epic/10 via-transparent to-legendary/10 animate-pulse-slow"></div>
              <p class="text-xs font-display font-bold text-legendary-light mb-1 relative z-10">⚗️ Sintesis Berhasil!</p>
              <p class="text-[11px] text-muted relative z-10">{{ fusionResult.fusedCard.name }} ×3 ➔ {{ fusionResult.resultCard.name }}</p>
              <span class="rarity-badge mt-2 text-[8px] relative z-10" :class="'rarity-' + fusionResult.resultCard.rarity.toLowerCase()">
                {{ fusionResult.resultCard.rarity }}
              </span>
              <p v-if="fusionResult.resultCard.isNew" class="text-[9px] text-legendary font-display font-bold mt-1.5 animate-pulse relative z-10">✨ KARTU BARU DITEMUKAN!</p>
              <p class="text-xs text-emerald-400 font-display font-bold mt-1.5 relative z-10">+{{ fusionResult.bonusCoins }} bonus koin</p>
            </div>
          </Transition>
        </section>

      </div>

      <!-- COLUMN 3: MISSIONS & ACHIEVEMENTS (RIGHT) -->
      <div class="lg:col-span-4 space-y-6">
        
        <!-- DAILY MISSIONS FULL LIST -->
        <section class="section-glass p-5 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-xl pointer-events-none"></div>

          <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-4">
            <span class="text-base">🎯</span> Daily Quest
            <span class="text-[10px] text-muted font-normal ml-auto">Rotasi tiap hari</span>
          </h2>

          <div class="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            <div v-for="m in missions" :key="m.key"
              class="flex items-center gap-3 p-3 rounded-xl transition-all border"
              :class="m.claimed
                ? 'bg-emerald-500/[0.02] border-emerald-500/10 opacity-75'
                : m.completed
                  ? 'bg-emerald-500/[0.05] border-emerald-500/20 shadow-sm shadow-emerald-500/5'
                  : 'bg-white/[0.01] border-white/5'">
              <span class="text-2xl flex-shrink-0">{{ m.icon }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-display font-semibold text-white truncate">{{ m.title }}</p>
                <p class="text-[10px] text-muted truncate mt-0.5">{{ m.desc }}</p>
                <!-- Progress bar -->
                <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                  <div class="h-full rounded-full transition-all duration-500"
                    :class="m.completed ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-accent shadow-[0_0_8px_rgba(124,58,237,0.5)]'"
                    :style="{ width: Math.min(100, (m.progress / m.target) * 100) + '%' }" />
                </div>
              </div>
              <div class="flex-shrink-0 text-right">
                <p class="text-[10px] font-display font-bold text-muted">{{ m.progress }}/{{ m.target }}</p>
                <button v-if="m.completed && !m.claimed" @click="claimMission(m.key)"
                  class="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-display font-bold mt-1.5 hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-500/20 transition-all">
                  +{{ m.reward }} 🪙
                </button>
                <span v-else-if="m.claimed" class="text-xs text-emerald-400 block mt-1.5 font-display font-bold">✅</span>
                <span v-else class="text-[10px] text-muted font-display block mt-1.5">{{ m.reward }} 🪙</span>
              </div>
            </div>
          </div>

          <!-- Bonus: selesaikan semua quest -->
          <div class="mt-3 p-3 rounded-xl border relative overflow-hidden"
            :class="questBonus.bonusClaimed
              ? 'border-legendary/10 bg-legendary/[0.02] opacity-70'
              : questBonus.allClaimed
                ? 'border-legendary/30 bg-legendary/[0.06]'
                : 'border-white/5 bg-white/[0.01]'">
            <div class="flex items-center gap-3">
              <span class="text-2xl flex-shrink-0">🎁</span>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-display font-bold text-legendary-light">Bonus Harian</p>
                <p class="text-[10px] text-muted mt-0.5">Selesaikan & klaim semua quest hari ini</p>
              </div>
              <button v-if="questBonus.allClaimed && !questBonus.bonusClaimed" @click="claimQuestBonus"
                class="text-[10px] bg-legendary text-white px-3 py-1.5 rounded-lg font-display font-bold hover:bg-legendary-light transition-all flex-shrink-0">
                +{{ questBonus.reward }} 🪙
              </button>
              <span v-else-if="questBonus.bonusClaimed" class="text-xs text-legendary font-display font-bold flex-shrink-0">✅</span>
              <span v-else class="text-[10px] text-muted/60 font-display flex-shrink-0">🔒 {{ questBonus.reward }} 🪙</span>
            </div>
          </div>
        </section>

        <!-- ACHIEVEMENTS FULL LIST -->
        <section class="section-glass p-5 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-legendary/10 to-transparent rounded-full blur-xl pointer-events-none"></div>

          <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-4">
            <span class="text-base">🏆</span> Achievements
          </h2>

          <div class="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            <div v-for="a in achievements" :key="a.key"
              class="flex items-center gap-3 p-3 rounded-xl transition-all border"
              :class="a.claimed
                ? 'bg-legendary/[0.02] border-legendary/10 opacity-70'
                : a.eligible
                  ? 'bg-legendary/[0.06] border-legendary/20 shadow-sm shadow-legendary/5'
                  : 'bg-white/[0.01] border-white/5 opacity-65'">
              <span class="text-2xl flex-shrink-0">{{ a.icon }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-display font-semibold text-white truncate">{{ a.title }}</p>
                <p class="text-[10px] text-muted truncate mt-0.5">{{ a.desc }}</p>
              </div>
              <div class="flex-shrink-0">
                <button v-if="a.eligible && !a.claimed" @click="claimAchievement(a.key)"
                  class="text-[10px] bg-legendary text-white px-3 py-1.5 rounded-lg font-display font-bold hover:bg-legendary-light hover:shadow-md hover:shadow-legendary/20 transition-all">
                  +{{ a.reward }} 🪙
                </button>
                <span v-else-if="a.claimed" class="text-xs text-legendary block font-display font-bold">✅</span>
                <span v-else class="text-[10px] text-muted/60 font-display block">🔒 {{ a.reward }}</span>
              </div>
            </div>
          </div>
        </section>

      </div>

    </div>

    <!-- Shortcut ke Papan Peringkat -->
    <router-link to="/leaderboard"
      class="section-glass p-4 mt-6 flex items-center gap-3 hover:border-accent/30 transition-all group">
      <span class="text-2xl">🏅</span>
      <div class="flex-1">
        <p class="text-sm font-display font-bold text-white">Papan Peringkat</p>
        <p class="text-[11px] text-muted">Lihat peringkat Level, Koleksi & Coins sepanjang masa</p>
      </div>
      <span class="text-accent group-hover:translate-x-1 transition-transform">→</span>
    </router-link>

    <!-- Overlay sinematik Card Fusion -->
    <FusionOverlay
      :active="fusion.active"
      :phase="fusion.phase"
      :input-card="fusion.inputCard"
      :result="fusion.result"
      @close="closeFusion"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import { useSound } from '@/composables/useSound.js';
import { computeLevel, levelUpCoinBonus } from '@/utils/progression.js';
import CoinDisplay from '@/components/CoinDisplay.vue';
import IconBase from '@/components/IconBase.vue';
import XpGuide from '@/components/XpGuide.vue';
import FusionOverlay from '@/components/FusionOverlay.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();
const sound = useSound();

// --- Level / XP ---
const levelInfo = computed(() => computeLevel(authStore.user?.xp || 0));

// --- Redeem Code ---
const redeemInput = ref('');
const redeeming = ref(false);
async function doRedeem() {
  const code = redeemInput.value.trim();
  if (!code || redeeming.value) return;
  redeeming.value = true;
  try {
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menukarkan kode.');
    toast.success(data.message || `+${data.coinReward} coin!`);
    redeemInput.value = '';
    try { sound.play('coinBurst'); } catch {}
    await playerStore.refreshAfterAction();
  } catch (e) {
    toast.error(e.message || 'Gagal menukarkan kode.');
  } finally {
    redeeming.value = false;
  }
}
const xpToNext = computed(() => Math.max(0, levelInfo.value.xpForNext - levelInfo.value.xpIntoLevel));
const nextLevelReward = computed(() => levelUpCoinBonus(levelInfo.value.level + 1));

// --- Daily Login ---
const loginData = ref({ streak: 0, claimed: false });

async function fetchLoginStatus() {
  try {
    const [user] = await Promise.all([authStore.fetchMe()]);
    const u = authStore.user;
    const today = new Date().toISOString().split('T')[0];
    loginData.value = {
      streak: u?.loginStreak || 0,
      claimed: u?.lastLoginDate === today,
    };
  } catch(e) {}
}

async function claimDailyLogin() {
  try {
    const res = await fetch('/api/daily-login', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await res.json();
    if (!res.ok) throw data;
    if (data.alreadyClaimed) { toast.info('Sudah diklaim hari ini!'); return; }
    toast.success(`+${data.reward} coin! 🔥 Streak: ${data.streak} hari`);
    loginData.value = { streak: data.streak, claimed: true };
    await authStore.fetchMe();
  } catch(e) { toast.error(e.message || 'Gagal klaim.'); }
}

// --- Spin Wheel ---
const prizes = ref([]);
const canSpin = ref(false);
const spinning = ref(false);
const wheelRotation = ref(0);
const spinResult = ref(null);

async function fetchSpinData() {
  try {
    const res = await fetch('/api/spin-wheel', { headers: { Authorization: `Bearer ${authStore.token}` } });
    const data = await res.json();
    if (res.ok) { prizes.value = data.prizes; canSpin.value = data.canSpin; }
  } catch(e) {}
}

async function spinTheWheel() {
  if (!canSpin.value || spinning.value) return;
  spinning.value = true;
  spinResult.value = null;
  try {
    const res = await fetch('/api/spin-wheel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const data = await res.json();
    if (!res.ok) throw data;

    // Calculate rotation to land on prize
    const sliceAngle = 360 / prizes.value.length;
    const targetAngle = 360 - (data.prizeIndex * sliceAngle + sliceAngle / 2);
    const spins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
    wheelRotation.value = spins * 360 + targetAngle;

    setTimeout(() => {
      spinning.value = false;
      spinResult.value = data;
      canSpin.value = false;
      toast.success(`+${data.prize.amount} coin!`);
      authStore.fetchMe();
    }, 4200);
  } catch(e) {
    spinning.value = false;
    toast.error(e.message || 'Gagal spin.');
  }
}

// --- Missions ---
const missions = ref([]);
const questBonus = ref({ reward: 0, xp: 0, allClaimed: false, bonusClaimed: false });

async function fetchMissions() {
  try {
    const res = await fetch('/api/missions', { headers: { Authorization: `Bearer ${authStore.token}` } });
    const data = await res.json();
    if (res.ok) {
      missions.value = data.missions;
      if (data.bonus) questBonus.value = data.bonus;
    }
  } catch(e) {}
}

async function claimMission(key) {
  try {
    const res = await fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ missionKey: key }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    toast.success(`+${data.reward} coin!`);
    await fetchMissions();
    await authStore.fetchMe();
  } catch(e) { toast.error(e.message || 'Gagal klaim.'); }
}

async function claimQuestBonus() {
  try {
    const res = await fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ missionKey: '_daily_bonus' }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    toast.success(`🎁 Bonus quest! +${data.reward} coin!`);
    await fetchMissions();
    await authStore.fetchMe();
  } catch(e) { toast.error(e.message || 'Gagal klaim bonus.'); }
}


// --- Coin Flip ---
const flipBet = ref(50);
const flipChoice = ref('');
const flipping = ref(false);
const flipResult = ref(null);
const flipResultDisplay = ref('');
const coinDeg = ref(0);            // rotasi rotateX koin (deg)
const coinTransition = ref('none'); // transition transform aktif

function adjustBet(amount) {
  flipBet.value = Math.min(500, Math.max(10, (flipBet.value || 0) + amount));
}

async function doFlip() {
  if (flipping.value || !flipChoice.value || flipBet.value < 10 || flipBet.value > 500) return;
  if (playerStore.coins < flipBet.value) {
    toast.error('Koin tidak mencukupi untuk taruhan ini.');
    return;
  }
  flipping.value = true;
  flipResult.value = null;
  flipResultDisplay.value = '';
  try { sound.play('whoosh'); } catch {}

  // Fase 1: putaran cepat (mendarat sementara di kelipatan 360)
  coinTransition.value = 'transform 0.9s cubic-bezier(0.3, 0, 0.35, 1)';
  coinDeg.value += 360 * 5;
  const start = Date.now();

  try {
    const res = await fetch('/api/coin-flip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ bet: flipBet.value, choice: flipChoice.value }),
    });
    const data = await res.json();
    if (!res.ok) throw data;

    // Jaga durasi minimum supaya putaran terasa
    const MIN_MS = 1100;
    const elapsed = Date.now() - start;
    if (elapsed < MIN_MS) await new Promise(r => setTimeout(r, MIN_MS - elapsed));

    // Fase 2: deselerasi & mendarat di sisi hasil (heads=0°, tails=180°)
    const faceOffset = data.flipResult === 'tails' ? 180 : 0;
    const base = Math.ceil(coinDeg.value / 360) * 360;
    coinTransition.value = 'transform 1.15s cubic-bezier(0.16, 0.9, 0.28, 1)';
    coinDeg.value = base + 360 * 3 + faceOffset;

    // Selesaikan setelah koin mendarat
    await new Promise(r => setTimeout(r, 1200));
    flipResultDisplay.value = data.flipResult;
    flipResult.value = data;
    flipping.value = false;
    if (data.won) {
      try { sound.play('coinBurst'); } catch {}
      fireWinConfetti();
      toast.success(`WIN! +${data.betAmount} coin!`);
    } else {
      try { sound.play('error'); } catch {}
      toast.error(`LOSE! -${data.betAmount} coin`);
    }
    authStore.fetchMe();
  } catch(e) {
    flipping.value = false;
    toast.error(e.message || 'Gagal flip.');
  }
}

async function fireWinConfetti() {
  try {
    const confetti = (await import('canvas-confetti')).default;
    confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 }, colors: ['#FCD34D', '#F59E0B', '#34D399', '#FBBF24'], ticks: 90, zIndex: 10000 });
  } catch { /* abaikan */ }
}

// --- Achievements ---
const achievements = ref([]);

async function fetchAchievements() {
  try {
    const res = await fetch('/api/achievements', { headers: { Authorization: `Bearer ${authStore.token}` } });
    const data = await res.json();
    if (res.ok) achievements.value = data.achievements;
  } catch(e) {}
}

async function claimAchievement(key) {
  try {
    const res = await fetch('/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ achievementKey: key }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    toast.success(`Achievement! +${data.reward} coin!`);
    await fetchAchievements();
    await authStore.fetchMe();
  } catch(e) { toast.error(e.message || 'Gagal klaim.'); }
}

// --- Card Fusion ---
const fusionResult = ref(null);
const fusionLoading = ref(false);

const fusionCandidates = computed(() => {
  return playerStore.inventory
    .filter(i => i.quantity >= 3 && i.card?.rarity !== 'Legendary')
    .sort((a, b) => {
      const order = { Common: 0, Rare: 1, Epic: 2 };
      return (order[a.card?.rarity] || 0) - (order[b.card?.rarity] || 0);
    });
});

// Overlay sinematik fusion
const fusion = ref({ active: false, phase: 'gather', inputCard: null, result: null });
function closeFusion() { fusion.value = { active: false, phase: 'gather', inputCard: null, result: null }; }

async function doFusion(item) {
  if (fusionLoading.value) return;
  fusionLoading.value = true;
  fusionResult.value = null;

  // Mulai sinematik: kumpul → fusi (API jalan paralel menutupi latensi)
  fusion.value = { active: true, phase: 'gather', inputCard: item.card, result: null };
  try { sound.play('whoosh'); } catch {}
  const start = Date.now();
  setTimeout(() => {
    if (fusion.value.active && fusion.value.phase === 'gather') {
      fusion.value.phase = 'fuse';
      try { sound.play('packShake'); } catch {}
    }
  }, 750);

  try {
    const res = await fetch('/api/card-fusion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ cardInventoryId: item.id }),
    });
    const data = await res.json();
    if (!res.ok) throw data;

    // Tunggu durasi minimum agar animasi fusi terasa (paralel dgn API)
    const MIN_MS = 2300;
    const elapsed = Date.now() - start;
    if (elapsed < MIN_MS) await new Promise(r => setTimeout(r, MIN_MS - elapsed));

    fusionResult.value = data;
    fusion.value.result = data;
    fusion.value.phase = 'reveal';

    const rarity = data.resultCard?.rarity || 'Common';
    try { sound.play('reveal' + rarity); } catch {}
    try { sound.play('coinBurst'); } catch {}
    if (rarity === 'Epic' || rarity === 'Legendary') fireFusionConfetti(rarity);

    toast.success(`Fusion berhasil! +${data.bonusCoins} coin!`);
    await playerStore.refreshAfterAction();
  } catch (e) {
    closeFusion();
    toast.error(e.message || 'Gagal fusion.');
  } finally {
    fusionLoading.value = false;
  }
}

async function fireFusionConfetti(rarity) {
  try {
    const confetti = (await import('canvas-confetti')).default;
    const colors = rarity === 'Legendary'
      ? ['#F59E0B', '#FCD34D', '#D97706', '#FBBF24']
      : ['#A855F7', '#C084FC', '#7C3AED', '#8B5CF6'];
    confetti({ particleCount: rarity === 'Legendary' ? 160 : 90, spread: 90, origin: { y: 0.5 }, colors, ticks: 120, zIndex: 10000 });
  } catch { /* abaikan */ }
}

// --- Quick Claims (Missions and Achievements) ---
const quickClaims = computed(() => {
  const list = [];
  missions.value.forEach(m => {
    if (m.completed && !m.claimed) {
      list.push({
        type: 'mission',
        key: m.key,
        title: m.title,
        reward: m.reward,
        icon: m.icon || '🎯',
        label: 'Misi Harian'
      });
    }
  });
  achievements.value.forEach(a => {
    if (a.eligible && !a.claimed) {
      list.push({
        type: 'achievement',
        key: a.key,
        title: a.title,
        reward: a.reward,
        icon: a.icon || '🏆',
        label: 'Achievement'
      });
    }
  });
  return list;
});

const claimingAll = ref(false);
async function claimAllRewards() {
  if (quickClaims.value.length === 0 || claimingAll.value) return;
  claimingAll.value = true;
  let successCount = 0;
  
  try {
    // Process sequential requests to backend (safe & keeps player updates clean)
    for (const item of quickClaims.value) {
      const url = item.type === 'mission' ? '/api/missions' : '/api/achievements';
      const bodyKey = item.type === 'mission' ? 'missionKey' : 'achievementKey';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
        body: JSON.stringify({ [bodyKey]: item.key }),
      });
      if (res.ok) successCount++;
    }
    
    if (successCount > 0) {
      toast.success(`⚡ Berhasil mengklaim ${successCount} reward sekaligus!`);
    }
    
    // Refresh states
    await Promise.all([
      fetchMissions(),
      fetchAchievements(),
      authStore.fetchMe()
    ]);
  } catch (e) {
    toast.error('Gagal mengklaim reward.');
  } finally {
    claimingAll.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    fetchLoginStatus(),
    fetchSpinData(),
    fetchMissions(),
    fetchAchievements(),
    playerStore.fetchInventory(),
  ]);
});
</script>

<style scoped>
/* Badge level pada kartu XP */
.xp-level-badge {
  width: 60px; height: 60px; border-radius: 16px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  background: radial-gradient(circle at 50% 40%, rgba(124, 58, 237, 0.22), rgba(10, 15, 36, 0.5));
  border: 1.5px solid rgba(168, 85, 247, 0.45);
  box-shadow: 0 0 22px rgba(124, 58, 237, 0.25), inset 0 0 10px rgba(124, 58, 237, 0.12);
}
/* XP progress bar besar */
.xp-track-lg {
  height: 9px; border-radius: 9999px; background: rgba(255, 255, 255, 0.07); overflow: hidden;
}
.xp-fill-lg {
  height: 100%; border-radius: 9999px;
  background: linear-gradient(90deg, #7C3AED, #C084FC, #F88CD4);
  box-shadow: 0 0 12px rgba(192, 132, 252, 0.5);
  transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Streak Day Calendar Cell */
.streak-day {
  transition: all var(--motion-duration-fast) var(--motion-ease-bounce);
  position: relative;
}
.streak-day:hover {
  transform: translateY(-3px) scale(1.03);
}

/* Fortune Wheel Glow Container */
.wheel-container {
  background: radial-gradient(circle at center, rgba(124, 58, 237, 0.05) 0%, transparent 70%);
}

/* Item cards with hover movement */
.mission-item,
.achievement-item,
.fusion-item {
  transition: all var(--motion-duration-fast) var(--motion-ease-standard);
}
.mission-item:hover,
.achievement-item:hover,
.fusion-item:hover {
  transform: translateX(3px);
  border-color: var(--color-border-strong);
}

/* ── Coin Flip Arena ── */
.flip-arena {
  position: relative;
  height: 158px;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 800px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: radial-gradient(ellipse 70% 80% at 50% 45%, rgba(124, 58, 237, 0.08), rgba(255, 255, 255, 0.008) 70%);
}
.coin-arena-glow {
  position: absolute; inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.01) 0%, transparent 60%);
  transition: all 0.5s ease; pointer-events: none;
}
.flipping-glow {
  background: radial-gradient(circle at center, rgba(124, 58, 237, 0.18) 0%, transparent 62%);
  animation: breathe 1s ease-in-out infinite;
}
@keyframes breathe { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

/* Bayangan/alas koin */
.coin-pedestal {
  position: absolute; bottom: 26px; width: 92px; height: 14px; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(124, 58, 237, 0.45), transparent 70%);
  filter: blur(5px);
}
.is-flipping .coin-pedestal { animation: pedestal-throb 0.5s ease-in-out infinite alternate; }
@keyframes pedestal-throb { from { transform: scaleX(1); opacity: .5; } to { transform: scaleX(0.75); opacity: .85; } }

/* Lempar koin ke udara saat flipping */
.coin-stage { transform-style: preserve-3d; position: relative; z-index: 5; }
.coin-stage.tossing { animation: coin-toss 0.5s ease-in-out infinite alternate; }
@keyframes coin-toss { from { transform: translateY(8px); } to { transform: translateY(-16px); } }

/* Koin 3D dua sisi */
.coin3d {
  position: relative; width: 92px; height: 92px;
  transform-style: preserve-3d; will-change: transform;
}
.coin-face {
  position: absolute; inset: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 46px; line-height: 1;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.3), inset 0 -6px 14px rgba(0, 0, 0, 0.35), 0 10px 26px rgba(0, 0, 0, 0.5);
}
.coin-heads { background: radial-gradient(circle at 34% 28%, #FEF3C7, #F59E0B 58%, #B45309 100%); }
.coin-tails { background: radial-gradient(circle at 34% 28%, #DDD6FE, #7C3AED 58%, #4C1D95 100%); transform: rotateX(180deg); }

/* Feedback menang / kalah */
.is-win { animation: arena-win 0.9s ease; }
.is-lose { animation: arena-lose 0.5s ease; }
@keyframes arena-win {
  0% { box-shadow: inset 0 0 0 0 rgba(16, 185, 129, 0); }
  30% { box-shadow: inset 0 0 46px 4px rgba(16, 185, 129, 0.45); }
  100% { box-shadow: inset 0 0 0 0 rgba(16, 185, 129, 0); }
}
@keyframes arena-lose {
  0%, 100% { transform: translateX(0); box-shadow: inset 0 0 0 0 rgba(239, 68, 68, 0); }
  20% { transform: translateX(-6px); box-shadow: inset 0 0 30px 2px rgba(239, 68, 68, 0.35); }
  60% { transform: translateX(6px); }
}

/* Choice Buttons */
.flip-choice-btn {
  font-family: var(--font-family-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  transition: all var(--motion-duration-fast);
  border: 1px solid transparent;
  min-height: 42px;
  cursor: pointer;
  border-radius: var(--radius-lg);
}

/* Quick Bet Button Adjusters */
.quick-bet-btn {
  padding: 0 10px;
  height: 42px;
  background: var(--glass-bg-light);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family-display);
  color: var(--color-text-secondary);
  transition: all var(--motion-duration-fast);
}
.quick-bet-btn:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
  background: var(--glass-bg-medium);
}
.quick-bet-btn:active {
  transform: scale(0.95);
}

/* Transition classes */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.scale-enter-active, .scale-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.scale-enter-from, .scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Custom Scrollbar for panel lists */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Touch responsiveness */
@media (hover: none) and (pointer: coarse) {
  .quick-bet-btn, .flip-choice-btn {
    min-height: 46px;
  }
}
</style>
