import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema.js';

// Neon serverless Pool (WebSocket-based) — mendukung transaksi.
// Di Vercel Serverless Functions (Node.js runtime), WebSocket ke Neon proxy.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Drizzle ORM instance dengan schema
export const db = drizzle(pool, { schema });

export { schema };
