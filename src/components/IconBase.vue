<template>
  <svg
    :width="size"
    :height="size"
    :class="className"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Dashboard / Home -->
    <template v-if="name === 'dashboard'">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </template>
    <!-- Binder / Collection -->
    <template v-else-if="name === 'binder'">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
    </template>
    <!-- Gacha / Gift Box -->
    <template v-else-if="name === 'gacha'">
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M12 8V3" />
      <path d="M3 13l4-5h10l4 5" />
      <line x1="12" y1="13" x2="12" y2="21" />
      <line x1="8" y1="13" x2="16" y2="13" />
    </template>
    <!-- Activities / Game Controller -->
    <template v-else-if="name === 'activities'">
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15.5" cy="12" r="1" fill="currentColor" />
      <circle cx="18" cy="10.5" r="1" fill="currentColor" />
    </template>
    <!-- Market / Shop -->
    <template v-else-if="name === 'market'">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H8" />
      <line x1="12" y1="6" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="18" />
    </template>
    <!-- Coin -->
    <template v-else-if="name === 'coin'">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" stroke-width="1.5" />
      <text x="12" y="13" text-anchor="middle" font-size="5" fill="currentColor" stroke="none">$</text>
    </template>
    <!-- Close / X -->
    <template v-else-if="name === 'close'">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </template>
    <!-- Back Arrow -->
    <template v-else-if="name === 'back'">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </template>
    <!-- Claim / Download -->
    <template v-else-if="name === 'claim'">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </template>
    <!-- Search -->
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </template>
    <!-- Check / Success -->
    <template v-else-if="name === 'check'">
      <polyline points="20 6 9 17 4 12" />
    </template>
    <!-- Alert / Warning -->
    <template v-else-if="name === 'alert'">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </template>
    <!-- Info -->
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </template>
    <!-- Star -->
    <template v-else-if="name === 'star'">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </template>
    <!-- Sparkle -->
    <template v-else-if="name === 'sparkle'">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
      <path d="M5 16l0.75 2.25L8 19l-2.25 0.75L5 22l-0.75-2.25L2 19l2.25-0.75z" />
    </template>
    <!-- Trash -->
    <template v-else-if="name === 'trash'">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </template>
    <!-- Edit / Pencil -->
    <template v-else-if="name === 'edit'">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </template>
    <!-- Logout -->
    <template v-else-if="name === 'logout'">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </template>
    <!-- Trophy / Leaderboard -->
    <template v-else-if="name === 'trophy'">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </template>
    <!-- Card Back -->
    <template v-else-if="name === 'cardback'">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="3" y="5" width="18" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2,2" />
      <path d="M12 8v8M8 12h8" stroke-width="1.5" opacity="0.5" />
    </template>
    <!-- Default: circle -->
    <template v-else>
      <circle cx="12" cy="12" r="10" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 },
  className: { type: String, default: '' },
});
</script>
