import { pgTable, serial, varchar, integer, timestamp, boolean, doublePrecision, index, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// 1. USERS — Autentikasi mandiri (username/password, Fase 1)
// ============================================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 20 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  platformId: varchar('platform_id', { length: 255 }).unique(),
  coins: integer('coins').default(500).notNull(),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastClaimedAt: timestamp('last_claimed_at').defaultNow().notNull(),
  // --- Coin Mechanics ---
  loginStreak: integer('login_streak').default(0).notNull(),
  lastLoginDate: date('last_login_date'),
  lastSpinDate: date('last_spin_date'),
  referralCode: varchar('referral_code', { length: 12 }).unique(),
  referredBy: integer('referred_by'),
  referralClaimed: boolean('referral_claimed').default(false).notNull(),
}, (table) => ({
  usernameIdx: index('username_idx').on(table.username),
  referralCodeIdx: index('referral_code_idx').on(table.referralCode),
}));

// ============================================================
// 2. MASTER CARDS — Katalog seluruh kartu di game
// ============================================================
export const masterCards = pgTable('master_cards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(),
  hypeScore: integer('hype_score').notNull(),
  likesPerSec: doublePrecision('likes_per_sec').notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
  isPlaceholderImage: boolean('is_placeholder_image').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // --- Card Frame Customization ---
  element: varchar('element', { length: 20 }).default('Normal').notNull(),
  attack: integer('attack').default(0).notNull(),
  defense: integer('defense').default(0).notNull(),
  specialAbility: varchar('special_ability', { length: 100 }),
  specialDesc: varchar('special_desc', { length: 255 }),
  attackName1: varchar('attack_name_1', { length: 50 }),
  attackName2: varchar('attack_name_2', { length: 50 }),
  weakness: varchar('weakness', { length: 20 }),
  resistance: varchar('resistance', { length: 20 }),
  illustrator: varchar('illustrator', { length: 50 }).default('AI Artist').notNull(),
  foilStyle: varchar('foil_style', { length: 30 }).default('Standard').notNull(),
  // --- Image Position / Crop ---
  imgZoom: doublePrecision('img_zoom').default(1.0).notNull(),
  imgOffsetX: doublePrecision('img_offset_x').default(0.0).notNull(),
  imgOffsetY: doublePrecision('img_offset_y').default(0.0).notNull(),
}, (table) => ({
  rarityIdx: index('rarity_idx').on(table.rarity),
  activeRarityIdx: index('active_rarity_idx').on(table.isActive, table.rarity),
}));

// ============================================================
// 3. USER INVENTORY — Kepemilikan kartu per pemain
// ============================================================
export const userInventory = pgTable('user_inventory', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cardId: integer('card_id').references(() => masterCards.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  inShowcase: boolean('in_showcase').default(false).notNull(),
  isAccountBound: boolean('is_account_bound').default(false).notNull(),
  tradeLockedUntil: timestamp('trade_locked_until'),
}, (table) => ({
  userCardIdx: index('user_card_idx').on(table.userId, table.cardId),
  showcaseIdx: index('showcase_idx').on(table.userId, table.inShowcase),
}));

// ============================================================
// 4. MARKETPLACE LISTINGS — Orderbook P2P
// ============================================================
export const marketplaceListings = pgTable('marketplace_listings', {
  id: serial('id').primaryKey(),
  sellerId: integer('seller_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cardId: integer('card_id').references(() => masterCards.id, { onDelete: 'cascade' }).notNull(),
  price: integer('price').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('status_idx').on(table.status),
  listingSearchIdx: index('listing_search_idx').on(table.cardId, table.status),
}));

// ============================================================
// 5. CRON RUNS — Idempotency tracking untuk cron-trends
// ============================================================
export const cronRuns = pgTable('cron_runs', {
  id: serial('id').primaryKey(),
  jobName: varchar('job_name', { length: 50 }).notNull(),
  ranAt: timestamp('ran_at').defaultNow().notNull(),
});

// ============================================================
// 6. USER MISSIONS — Track daily mission progress
// ============================================================
export const userMissions = pgTable('user_missions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  missionKey: varchar('mission_key', { length: 50 }).notNull(),
  progress: integer('progress').default(0).notNull(),
  claimed: boolean('claimed').default(false).notNull(),
  missionDate: date('mission_date').notNull(),
}, (table) => ({
  userMissionIdx: index('user_mission_idx').on(table.userId, table.missionDate),
}));

// ============================================================
// 7. USER ACHIEVEMENTS — Track permanent achievements
// ============================================================
export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  achievementKey: varchar('achievement_key', { length: 50 }).notNull(),
  claimedAt: timestamp('claimed_at').defaultNow().notNull(),
}, (table) => ({
  userAchievementIdx: index('user_achievement_idx').on(table.userId),
}));

// ============================================================
// 8. COIN FLIP HISTORY — Audit trail for coin flip
// ============================================================
export const coinFlipHistory = pgTable('coin_flip_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  betAmount: integer('bet_amount').notNull(),
  result: varchar('result', { length: 10 }).notNull(), // 'win' or 'lose'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// RELASI
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  inventory: many(userInventory),
  listings: many(marketplaceListings),
  missions: many(userMissions),
}));

export const masterCardsRelations = relations(masterCards, ({ many }) => ({
  ownedInstances: many(userInventory),
  marketListings: many(marketplaceListings),
}));

export const userInventoryRelations = relations(userInventory, ({ one }) => ({
  user: one(users, { fields: [userInventory.userId], references: [users.id] }),
  card: one(masterCards, { fields: [userInventory.cardId], references: [masterCards.id] }),
}));

export const marketplaceListingsRelations = relations(marketplaceListings, ({ one }) => ({
  seller: one(users, { fields: [marketplaceListings.sellerId], references: [users.id] }),
  card: one(masterCards, { fields: [marketplaceListings.cardId], references: [masterCards.id] }),
}));

export const userMissionsRelations = relations(userMissions, ({ one }) => ({
  user: one(users, { fields: [userMissions.userId], references: [users.id] }),
}));
