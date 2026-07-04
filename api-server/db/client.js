import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema.js';

// Neon WebSocket (Pool) driver — mendukung interactive transactions
// (db.transaction(async (tx) => { ... })). Driver neon-http TIDAK mendukung
// transaction sama sekali ("No transactions support in neon-http driver"),
// padahal gacha/market/dll bergantung pada transaction. Pool bekerja baik di
// Vercel Serverless maupun di dev-server lokal.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Drizzle ORM instance dengan schema
export const db = drizzle(pool, { schema });

export { pool, schema };


