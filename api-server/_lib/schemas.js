import { z } from 'zod';

// --- AUTH ---
export const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore"),
  email: z.string().trim().toLowerCase().email("Format email tidak valid.").max(255),
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
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'hype']).default('newest'),
  search: z.string().trim().max(100).optional(),
});

// --- ADMIN ---
export const adminLoginSchema = z.object({
  secret: z.string().min(1),
  ttl: z.number().int().positive().optional(),
});

export const adminCardSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(255),
  rarity: z.enum(['Common', 'Rare', 'Epic', 'Legendary']),
  hypeScore: z.number().int().positive().max(5000),
  likesPerSec: z.number().positive().max(100),
  // Card frame customization (optional)
  element: z.enum(['Normal', 'Fire', 'Water', 'Electric', 'Cosmic', 'Shadow', 'Nature']).optional(),
  attack: z.number().int().min(0).max(5000).optional(),
  defense: z.number().int().min(0).max(5000).optional(),
  specialAbility: z.string().max(100).optional().nullable(),
  specialDesc: z.string().max(255).optional().nullable(),
  attackName1: z.string().max(50).optional().nullable(),
  attackName2: z.string().max(50).optional().nullable(),
  weakness: z.string().max(20).optional().nullable(),
  resistance: z.string().max(20).optional().nullable(),
  illustrator: z.string().max(50).optional(),
  imageUrl: z.string().max(255).optional(),
  foilStyle: z.enum(['Standard', 'Holo', 'Reverse Holo', 'Full Art ex', 'Secret Gold', 'Special Illustration']).optional(),
  // Bobot gacha dalam rarity (1.0 = default/merata; <1 = lebih langka)
  dropWeight: z.number().positive().max(1000).optional(),
  // Image position / crop
  imgZoom: z.number().min(0.5).max(3.0).optional(),
  imgOffsetX: z.number().min(-1.0).max(1.0).optional(),
  imgOffsetY: z.number().min(-1.0).max(1.0).optional(),
});

export const adminCardUpdateSchema = adminCardSchema.partial();

export const adminUserActionSchema = z.object({
  userId: z.coerce.number().int().positive(),
  action: z.enum([
    'grant_xp', 'grant_coins',
    'set_xp', 'set_coins', 'set_level',
    'ban', 'unban', 'reset_password', 'delete',
  ]),
  amount: z.coerce.number().int().min(-10_000_000).max(10_000_000).optional(), // untuk grant_* (bisa negatif)
  value: z.coerce.number().int().min(0).max(100_000_000).optional(),           // untuk set_*
  password: z.string().min(8).max(72).optional(),                              // untuk reset_password
});
