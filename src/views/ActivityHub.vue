<template>
  <div class="max-w-xl mx-auto px-4 py-6 pb-28">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-xl font-display font-bold flex items-center gap-2">
        <span class="text-2xl">🎮</span> Activities
      </h1>
      <CoinDisplay :amount="playerStore.coins" size="lg" />
    </div>

    <!-- ===== DAILY LOGIN ===== -->
    <section class="mb-5 glass-panel p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-display font-bold flex items-center gap-2">🌅 Daily Login</h2>
        <span v-if="loginData.streak > 0" class="text-xs font-display font-bold text-legendary">
          🔥 {{ loginData.streak }} hari
        </span>
      </div>
      <!-- Streak dots -->
      <div class="flex gap-1.5 mb-3">
        <div v-for="day in 7" :key="'s'+day"
          class="flex-1 rounded-lg py-2 text-center text-[10px] font-display font-semibold transition-all"
          :class="day <= loginData.streak
            ? 'bg-gradient-to-b from-legendary/30 to-legendary/10 text-legendary-light border border-legendary/30'
            : 'glass-panel text-muted'">
          <p class="text-lg mb-0.5">{{ day <= loginData.streak ? '🔥' : '⬜' }}</p>
          <p>D{{ day }}</p>
          <p class="text-[8px] text-muted">{{ [50,75,100,125,150,200,500][day-1] }}🪙</p>
        </div>
      </div>
      <button @click="claimDailyLogin" :disabled="loginData.claimed" class="btn-primary w-full py-3 text-sm font-display">
        {{ loginData.claimed ? '✅ Sudah Diklaim' : '🌅 Klaim Login Harian' }}
      </button>
    </section>

    <!-- ===== SPIN WHEEL ===== -->
    <section class="mb-5 glass-panel p-5">
      <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-3">🎰 Fortune Wheel</h2>
      <div class="relative mx-auto mb-4" style="width: 260px; height: 260px;">
        <!-- Wheel -->
        <div class="w-full h-full rounded-full border-4 border-white/10 relative overflow-hidden"
          :style="{ transform: `rotate(${wheelRotation}deg)`, transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }">
          <div v-for="(prize, i) in prizes" :key="'p'+i"
            class="absolute left-1/2 top-0 origin-bottom text-center"
            :style="{
              width: '80px', height: '130px', marginLeft: '-40px',
              transform: `rotate(${i * (360 / prizes.length)}deg)`,
            }">
            <span class="text-[10px] font-display font-bold block mt-6" :style="{ color: prize.color }">
              {{ prize.amount }}
            </span>
            <span class="text-xs">🪙</span>
          </div>
        </div>
        <!-- Center pointer -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 text-2xl drop-shadow-lg">▼</div>
        <!-- Center circle -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-16 h-16 rounded-full glass-panel-strong flex items-center justify-center">
            <span class="text-2xl">🎰</span>
          </div>
        </div>
      </div>
      <button @click="spinTheWheel" :disabled="!canSpin || spinning" class="btn-primary w-full py-3 text-sm font-display">
        {{ spinning ? '🎰 Berputar...' : !canSpin ? '⏳ Sudah Spin Hari Ini' : '🎰 Spin Gratis!' }}
      </button>
      <p v-if="spinResult" class="text-center mt-2 text-sm font-display font-bold animate-scale-in"
        :class="spinResult.prize.amount >= 100 ? 'text-legendary-light' : 'text-secondary'">
        🎉 +{{ spinResult.prize.amount }} coin!
      </p>
    </section>

    <!-- ===== DAILY MISSIONS ===== -->
    <section class="mb-5 glass-panel p-5">
      <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-3">🎯 Misi Harian</h2>
      <div class="space-y-2">
        <div v-for="m in missions" :key="m.key"
          class="flex items-center gap-3 p-3 rounded-xl transition-all"
          :class="m.claimed ? 'bg-emerald-500/5 border border-emerald-500/15' : 'glass-panel'">
          <span class="text-xl flex-shrink-0">{{ m.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-display font-semibold">{{ m.title }}</p>
            <p class="text-[10px] text-muted">{{ m.desc }}</p>
            <!-- Progress bar -->
            <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
              <div class="h-full rounded-full transition-all duration-500"
                :class="m.completed ? 'bg-emerald-400' : 'bg-accent'"
                :style="{ width: Math.min(100, (m.progress / m.target) * 100) + '%' }" />
            </div>
          </div>
          <div class="flex-shrink-0 text-right">
            <p class="text-[10px] text-muted font-display">{{ m.progress }}/{{ m.target }}</p>
            <button v-if="m.completed && !m.claimed" @click="claimMission(m.key)"
              class="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-full font-display font-bold mt-0.5 hover:bg-emerald-400 transition-colors">
              +{{ m.reward }} 🪙
            </button>
            <span v-else-if="m.claimed" class="text-[10px] text-emerald-400 font-display">✅</span>
            <span v-else class="text-[10px] text-muted font-display">{{ m.reward }} 🪙</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== COIN FLIP ===== -->
    <section class="mb-5 glass-panel p-5">
      <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-3">🪙 Coin Flip</h2>
      <div class="flex items-center gap-3 mb-3">
        <input v-model.number="flipBet" type="number" min="10" max="500" placeholder="10-500"
          class="input-premium flex-1 text-center text-sm" />
        <div class="flex gap-2">
          <button @click="flipChoice = 'heads'" class="px-4 py-2.5 rounded-xl text-sm font-display font-semibold transition-all border"
            :class="flipChoice === 'heads' ? 'bg-legendary/20 text-legendary-light border-legendary/30' : 'glass-panel text-muted border-transparent'">
            👑 Heads
          </button>
          <button @click="flipChoice = 'tails'" class="px-4 py-2.5 rounded-xl text-sm font-display font-semibold transition-all border"
            :class="flipChoice === 'tails' ? 'bg-accent/20 text-accent-soft border-accent/30' : 'glass-panel text-muted border-transparent'">
            🌙 Tails
          </button>
        </div>
      </div>
      <!-- Coin animation -->
      <div class="flex items-center justify-center h-20 mb-3">
        <div class="text-5xl transition-all duration-700"
          :class="flipping ? 'animate-coin-flip-anim' : ''">
          {{ flipResultDisplay === 'heads' ? '👑' : flipResultDisplay === 'tails' ? '🌙' : '🪙' }}
        </div>
      </div>
      <button @click="doFlip" :disabled="!flipChoice || !flipBet || flipping || flipBet < 10 || flipBet > 500"
        class="btn-primary w-full py-3 text-sm font-display">
        🪙 Flip! ({{ flipBet || 0 }} coin)
      </button>
      <p v-if="flipResult" class="text-center mt-2 text-sm font-display font-bold animate-scale-in"
        :class="flipResult.won ? 'text-emerald-400' : 'text-red-400'">
        {{ flipResult.won ? `🎉 WIN! +${flipResult.betAmount}` : `😢 LOSE! -${flipResult.betAmount}` }} coin
      </p>
    </section>

    <!-- ===== ACHIEVEMENTS ===== -->
    <section class="mb-5 glass-panel p-5">
      <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-3">🏆 Achievements</h2>
      <div class="space-y-2">
        <div v-for="a in achievements" :key="a.key"
          class="flex items-center gap-3 p-3 rounded-xl transition-all"
          :class="a.claimed ? 'bg-legendary/5 border border-legendary/15' : a.eligible ? 'glass-panel border border-emerald-500/20' : 'glass-panel opacity-60'">
          <span class="text-xl flex-shrink-0">{{ a.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-display font-semibold" :class="a.claimed ? 'text-legendary-light' : ''">{{ a.title }}</p>
            <p class="text-[10px] text-muted">{{ a.desc }}</p>
          </div>
          <div class="flex-shrink-0">
            <button v-if="a.eligible && !a.claimed" @click="claimAchievement(a.key)"
              class="text-[10px] bg-legendary text-white px-3 py-1.5 rounded-full font-display font-bold hover:bg-legendary-light transition-colors">
              +{{ a.reward }} 🪙
            </button>
            <span v-else-if="a.claimed" class="text-[10px] text-legendary font-display font-bold">✅ {{ a.reward }} 🪙</span>
            <span v-else class="text-[10px] text-muted font-display">🔒 {{ a.reward }} 🪙</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CARD FUSION ===== -->
    <section class="mb-5 glass-panel p-5">
      <h2 class="text-sm font-display font-bold flex items-center gap-2 mb-3">⚗️ Card Fusion</h2>
      <p class="text-xs text-muted mb-3">Gabungkan 3 kartu yang sama → 1 kartu rarity lebih tinggi + bonus coin!</p>

      <!-- Fusion candidates -->
      <div v-if="fusionCandidates.length === 0" class="text-center text-muted text-xs py-4">
        Belum ada kartu dengan qty ≥ 3 untuk fusion.
      </div>
      <div v-else class="space-y-2">
        <div v-for="item in fusionCandidates" :key="item.id"
          class="flex items-center gap-3 p-3 rounded-xl glass-panel">
          <div class="w-10 h-14 rounded overflow-hidden flex-shrink-0 card-frame"
            :class="'card-frame-' + item.card.rarity.toLowerCase()">
            <img v-if="item.card?.imageUrl" :src="item.card.imageUrl" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-display font-semibold truncate">{{ item.card?.name }}</p>
            <span class="rarity-badge text-[8px]" :class="'rarity-' + item.card?.rarity?.toLowerCase()">{{ item.card?.rarity }}</span>
            <p class="text-[10px] text-muted mt-0.5">Qty: {{ item.quantity }}</p>
          </div>
          <button @click="doFusion(item)" :disabled="fusionLoading"
            class="text-[10px] bg-epic text-white px-3 py-1.5 rounded-full font-display font-bold hover:bg-epic-light transition-colors">
            ⚗️ Fuse 3→1
          </button>
        </div>
      </div>

      <!-- Fusion result -->
      <div v-if="fusionResult" class="mt-3 p-4 glass-panel border border-legendary/30 text-center animate-scale-in">
        <p class="text-sm font-display font-bold mb-1">⚗️ Fusion Berhasil!</p>
        <p class="text-xs text-secondary">3× {{ fusionResult.fusedCard.name }} → {{ fusionResult.resultCard.name }}</p>
        <span class="rarity-badge mt-1" :class="'rarity-' + fusionResult.resultCard.rarity.toLowerCase()">
          {{ fusionResult.resultCard.rarity }}
        </span>
        <p v-if="fusionResult.resultCard.isNew" class="text-[10px] text-legendary font-display font-bold mt-1">✨ NEW CARD!</p>
        <p class="text-xs text-emerald-400 font-display font-bold mt-1">+{{ fusionResult.bonusCoins }} bonus coin</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import { usePlayerStore } from '@/stores/player.js';
import { useToast } from '@/composables/useToast.js';
import CoinDisplay from '@/components/CoinDisplay.vue';

const authStore = useAuthStore();
const playerStore = usePlayerStore();
const toast = useToast();

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

async function fetchMissions() {
  try {
    const res = await fetch('/api/missions', { headers: { Authorization: `Bearer ${authStore.token}` } });
    const data = await res.json();
    if (res.ok) missions.value = data.missions;
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

// --- Coin Flip ---
const flipBet = ref(50);
const flipChoice = ref('');
const flipping = ref(false);
const flipResult = ref(null);
const flipResultDisplay = ref('');

async function doFlip() {
  if (flipping.value || !flipChoice.value || flipBet.value < 10) return;
  flipping.value = true;
  flipResult.value = null;
  flipResultDisplay.value = '';
  try {
    const res = await fetch('/api/coin-flip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ bet: flipBet.value, choice: flipChoice.value }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    setTimeout(() => {
      flipResultDisplay.value = data.flipResult;
      flipping.value = false;
      flipResult.value = data;
      if (data.won) toast.success(`WIN! +${data.betAmount} coin!`);
      else toast.error(`LOSE! -${data.betAmount} coin`);
      authStore.fetchMe();
    }, 1500);
  } catch(e) {
    flipping.value = false;
    toast.error(e.message || 'Gagal flip.');
  }
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

async function doFusion(item) {
  fusionLoading.value = true;
  fusionResult.value = null;
  try {
    const res = await fetch('/api/card-fusion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ cardInventoryId: item.id }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    fusionResult.value = data;
    toast.success(`Fusion berhasil! +${data.bonusCoins} coin!`);
    await playerStore.refreshAfterAction();
  } catch(e) { toast.error(e.message || 'Gagal fusion.'); }
  finally { fusionLoading.value = false; }
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
@keyframes coin-flip-anim {
  0% { transform: rotateY(0) scale(1); }
  25% { transform: rotateY(450deg) scale(1.2); }
  50% { transform: rotateY(900deg) scale(1.1); }
  75% { transform: rotateY(1350deg) scale(1.05); }
  100% { transform: rotateY(1800deg) scale(1); }
}
.animate-coin-flip-anim {
  animation: coin-flip-anim 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
