import { pgTable, serial, varchar, integer, timestamp, boolean, doublePrecision, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// 1. USERS — Autentikasi mandiri (username/password, Fase 1)
// ============================================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 20 }).notNull().unique(), // disimpan lowercase
  passwordHash: varchar('password_hash', { length: 255 }).notNull(), // bcrypt hash
  platformId: varchar('platform_id', { length: 255 }).unique(), // NULLABLE — reserved untuk Fase 2 (account linking Google/Telegram)
  coins: integer('coins').default(500).notNull(),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastClaimedAt: timestamp('last_claimed_at').defaultNow().notNull(),
}, (table) => ({
  usernameIdx: index('username_idx').on(table.username),
}));

// ============================================================
// 2. MASTER CARDS — Katalog seluruh kartu di game
// ============================================================
export const masterCards = pgTable('master_cards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(), // unique untuk idempotent seed & cron
  description: varchar('description', { length: 255 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(), // Common, Rare, Epic, Legendary
  hypeScore: integer('hype_score').notNull(),
  likesPerSec: doublePrecision('likes_per_sec').notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
  isPlaceholderImage: boolean('is_placeholder_image').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(), // soft-delete oleh admin
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  tradeLockedUntil: timestamp('trade_locked_until'), // NULLABLE
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
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, sold, canceled
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
// RELASI
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  inventory: many(userInventory),
  listings: many(marketplaceListings),
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
