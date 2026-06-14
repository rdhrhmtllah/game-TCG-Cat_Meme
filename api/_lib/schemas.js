import { z } from 'zod';

// --- AUTH ---
export const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore"),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// --- GAME CORE ---
export const gachaSchema = z.object({}); // userId dari token

export const claimIdleSchema = z.object({}); // userId dari token

export const showcaseSchema = z.object({
  cardInventoryId: z.number().int().positive(),
  action: z.enum(['add', 'remove']),
});

export const sellToVaultSchema = z.object({
  cardInventoryId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

// --- MARKETPLACE ---
export const marketListSchema = z.object({
  cardInventoryId: z.number().int().positive(),
  price: z.number().int().positive().max(1_000_000),
});

export const marketBuySchema = z.object({
  listingId: z.number().int().positive(),
});

export const marketCancelSchema = z.object({
  listingId: z.number().int().positive(),
});

export const marketListingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  rarity: z.enum(['Common', 'Rare', 'Epic', 'Legendary']).optional(),
});

// --- ADMIN ---
export const adminLoginSchema = z.object({
  secret: z.string().min(1),
});

export const adminCardSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(255),
  rarity: z.enum(['Common', 'Rare', 'Epic', 'Legendary']),
  hypeScore: z.number().int().positive().max(5000),
  likesPerSec: z.number().positive().max(100),
});

export const adminCardUpdateSchema = adminCardSchema.partial();
