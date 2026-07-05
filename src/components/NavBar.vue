<template>
  <!-- Mobile: floating bottom nav bar -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 safe-bottom" style="z-index: var(--z-fixed);">
    <div class="mx-3 mb-3 rounded-2xl overflow-hidden nav-mobile-bar"
      style="box-shadow: 0 -4px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(124, 58, 237, 0.06), inset 0 1px 0 rgba(255,255,255,0.06);">
      <div class="flex justify-around items-center px-1" style="height: calc(var(--space-7) - var(--space-sm));">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="nav-link-mobile flex flex-col items-center justify-center rounded-xl relative"
          active-class="nav-link-active"
          :data-tour="item.tour"
          :aria-label="item.label"
          :aria-current="$route.path === item.to ? 'page' : undefined"
        >
          <IconBase :name="item.icon" :size="20" />
          <span class="nav-label">{{ item.label }}</span>
          <!-- Active indicator dot -->
          <span class="nav-indicator" aria-hidden="true" />
        </router-link>

        <button
          @click="handleLogout"
          class="nav-link-mobile flex flex-col items-center justify-center rounded-xl"
          title="Logout"
          aria-label="Logout"
        >
          <IconBase name="logout" :size="20" />
          <span class="nav-label">Logout</span>
        </button>
      </div>
    </div>
  </nav>

  <!-- Mobile: tombol mute mengambang (pojok kanan atas) -->
  <button @click="sound.toggleMute()" data-nosound
    class="md:hidden fixed top-3 right-3 w-9 h-9 rounded-full nav-audio-float"
    style="z-index: var(--z-fixed);"
    :aria-label="sound.enabled.value ? 'Matikan suara' : 'Nyalakan suara'">
    <span aria-hidden="true">{{ sound.enabled.value ? '🔊' : '🔇' }}</span>
  </button>

  <!-- Desktop: premium frosted top nav bar -->
  <nav class="hidden md:flex fixed top-0 left-0 right-0 nav-desktop-bar"
    style="z-index: var(--z-fixed); height: 60px;">
    <div class="flex items-center justify-between w-full max-w-6xl mx-auto" style="padding: 0 var(--space-3);">
      <router-link to="/app" class="brand-logo flex items-center group" :aria-label="'MemeCats Home'">
        <div class="logo-icon">
          <span class="text-lg" aria-hidden="true">🐱</span>
        </div>
        <span class="brand-text">MemeCats</span>
      </router-link>
      <div class="flex items-center" style="gap: var(--space-1);">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="nav-link-desktop"
          active-class="nav-link-desktop-active"
          :data-tour="item.tour"
          :aria-label="item.label"
          :aria-current="$route.path === item.to ? 'page' : undefined"
        >
          <IconBase :name="item.icon" :size="18" />
          <span>{{ item.label }}</span>
          <!-- Animated underline indicator -->
          <span class="nav-underline" aria-hidden="true" />
        </router-link>
        <div class="nav-divider" role="separator" aria-hidden="true"></div>
        <!-- Audio controls -->
        <button @click="sound.toggleMusic()" data-nosound
          class="nav-audio-btn" :class="{ 'nav-audio-on': sound.musicOn.value }"
          :aria-label="sound.musicOn.value ? 'Matikan musik' : 'Nyalakan musik'" title="Musik latar">
          <span aria-hidden="true">{{ sound.musicOn.value ? '🎵' : '🎶' }}</span>
        </button>
        <button @click="sound.toggleMute()" data-nosound
          class="nav-audio-btn" :class="{ 'nav-audio-off': !sound.enabled.value }"
          :aria-label="sound.enabled.value ? 'Matikan suara' : 'Nyalakan suara'" title="Efek suara">
          <span aria-hidden="true">{{ sound.enabled.value ? '🔊' : '🔇' }}</span>
        </button>
        <div class="nav-divider" role="separator" aria-hidden="true"></div>
        <button
          @click="handleLogout"
          class="nav-link-desktop logout-btn"
          aria-label="Logout"
        >
          <IconBase name="logout" :size="18" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import { useSound } from '@/composables/useSound.js';
import IconBase from '@/components/IconBase.vue';

const sound = useSound();

const router = useRouter();
const authStore = useAuthStore();

const menuItems = [
  { to: '/app', label: 'Home', icon: 'dashboard' },
  { to: '/binder', label: 'Binder', icon: 'binder', tour: 'nav-binder' },
  { to: '/gacha', label: 'Gacha', icon: 'gacha', tour: 'nav-gacha' },
  { to: '/market', label: 'Market', icon: 'market', tour: 'nav-market' },
  { to: '/activities', label: 'Activities', icon: 'activities', tour: 'nav-activities' },
  { to: '/leaderboard', label: 'Peringkat', icon: 'trophy', tour: 'nav-leaderboard' },
];

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
/* ===== MOBILE NAV BAR — Premium Floating Pill ===== */
.nav-mobile-bar {
  background: rgba(10, 15, 36, 0.85);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
}
/* Animated top gradient border */
.nav-mobile-bar::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 5%, rgba(124, 58, 237, 0.4) 30%, rgba(248, 140, 212, 0.2) 50%, rgba(56, 189, 248, 0.3) 70%, transparent 95%);
  z-index: 1;
}

.nav-link-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-1) var(--space-2);
  color: var(--color-text-tertiary);
  transition: all var(--motion-duration-fast) var(--motion-ease-standard);
  position: relative;
  min-width: 44px;
  min-height: 44px;
  -webkit-tap-highlight-color: transparent;
}

.nav-link-mobile:hover {
  color: var(--color-text-primary);
}

.nav-link-mobile:active {
  transform: scale(0.92);
}

.nav-link-active {
  color: var(--color-accent-primary-hover) !important;
}

.nav-label {
  font-family: var(--font-family-display);
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  letter-spacing: var(--letter-spacing-wide);
}

.nav-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: var(--color-accent-primary);
  border-radius: var(--radius-full);
  opacity: 0;
  transition: all var(--motion-duration-fast);
  box-shadow: 0 0 10px rgba(124, 58, 237, 0.6), 0 0 20px rgba(124, 58, 237, 0.3);
}

.nav-link-active .nav-indicator {
  opacity: 1;
}

/* ===== DESKTOP NAV BAR — Premium Frosted Glass ===== */
.nav-desktop-bar {
  background: rgba(10, 15, 36, 0.8);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 40px rgba(0, 0, 0, 0.35), 0 0 60px rgba(124, 58, 237, 0.04);
}
/* Animated bottom gradient border */
.nav-desktop-bar::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 5%, rgba(124, 58, 237, 0.3) 25%, rgba(248, 140, 212, 0.15) 50%, rgba(56, 189, 248, 0.25) 75%, transparent 95%);
  background-size: 200% 100%;
  animation: nav-border-shimmer 6s linear infinite;
}
@keyframes nav-border-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  transition: all var(--motion-duration-fast) var(--motion-ease-standard);
}

.brand-logo:hover .logo-icon {
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.3), 0 0 40px rgba(124, 58, 237, 0.1);
  border-color: rgba(124, 58, 237, 0.3);
}

.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-medium);
  border: 1px solid var(--color-border-subtle);
  box-shadow: 0 0 15px rgba(124, 58, 237, 0.1);
  transition: all var(--motion-duration-fast) var(--motion-ease-standard);
}

.brand-text {
  font-family: var(--font-family-display);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  background: linear-gradient(135deg, var(--color-accent-primary-hover), var(--color-accent-pink), var(--color-accent-primary-hover));
  background-size: 200% 200%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: brand-gradient 4s ease-in-out infinite alternate;
}
@keyframes brand-gradient {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}

.nav-link-desktop {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-sm) var(--space-2);
  border-radius: var(--radius-md);
  font-family: var(--font-family-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-decoration: none;
  transition: all var(--motion-duration-fast) var(--motion-ease-standard);
  position: relative;
  min-height: 36px;
}
.nav-link-desktop:hover {
  color: var(--color-text-primary);
}

.nav-link-desktop:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}

/* Animated underline indicator */
.nav-underline {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-pink));
  border-radius: var(--radius-full);
  transition: width var(--motion-duration-fast) var(--motion-ease-bounce);
  box-shadow: 0 0 8px rgba(124, 58, 237, 0.4);
}

.nav-link-desktop:hover .nav-underline {
  width: 60%;
}

.nav-link-desktop-active {
  color: var(--color-text-primary) !important;
}
.nav-link-desktop-active .nav-underline {
  width: 80%;
}

.logout-btn:hover {
  color: var(--color-error-light) !important;
}
.logout-btn:hover .nav-underline {
  background: linear-gradient(90deg, var(--color-error), var(--color-error-light));
  box-shadow: 0 0 8px rgba(185, 28, 28, 0.4);
}

.nav-divider {
  width: 1px;
  height: 24px;
  background: linear-gradient(180deg, transparent, var(--color-border-default), transparent);
  margin: 0 var(--space-1);
}

/* Audio toggle buttons (desktop nav) */
.nav-audio-btn {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 10px;
  font-size: 15px; line-height: 1;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  transition: all var(--motion-duration-fast) var(--motion-ease-standard);
}
.nav-audio-btn:hover { background: rgba(124,58,237,0.15); border-color: rgba(124,58,237,0.3); }
.nav-audio-off { opacity: 0.5; filter: grayscale(1); }
.nav-audio-on { box-shadow: 0 0 12px rgba(124,58,237,0.35); border-color: rgba(124,58,237,0.4); }

/* Floating mute (mobile) */
.nav-audio-float {
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  background: rgba(10,15,36,0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 2px 12px rgba(0,0,0,0.4);
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .nav-link-mobile,
  .nav-link-desktop,
  .nav-indicator,
  .nav-underline,
  .brand-logo,
  .brand-text {
    transition: none !important;
    animation: none !important;
  }
}

/* Touch optimization */
@media (hover: none) and (pointer: coarse) {
  .nav-link-mobile,
  .nav-link-desktop {
    min-width: 48px;
    min-height: 48px;
  }
}
</style>
