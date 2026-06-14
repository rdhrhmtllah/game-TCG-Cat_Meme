/**
 * Local development server untuk Vercel serverless functions.
 * Meniru routing Vercel: /api/<path> → api/<path>.js
 *
 * Jalankan: node api/dev-server.js
 *
 * Di production, Vercel otomatis routing berdasarkan struktur folder.
 * Server ini hanya untuk development lokal.
 */

import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PORT = process.env.PORT || 3000;
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// MIME types untuk static file serving (opsional)
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  // Parse body untuk POST/PATCH
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    req.body = await parseBody(req);
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Route /api/* ke handler file yang sesuai
  if (pathname.startsWith('/api/')) {
    // Tambahkan query string ke req untuk kompatibilitas
    req.query = Object.fromEntries(url.searchParams);

    // Mapping path ke file handler
    // /api/auth/register → api/auth/register.js
    // /api/inventory     → api/inventory.js ATAU api/inventory/index.js
    // /api/admin/cards/5 → api/admin/cards.js (parameterized, fallback)
    const handlerPath = pathname.replace('/api/', '');
    const segments = handlerPath.split('/');

    // Bangun candidate paths: coba dari yang paling spesifik ke paling umum
    const candidates = [
      join(__dirname, `${handlerPath}.js`),
      join(__dirname, handlerPath, 'index.js'),
    ];

    // Untuk parameterized routes: /api/admin/cards/5 → coba api/admin/cards.js
    if (segments.length > 1) {
      const parentDir = segments.slice(0, -1).join('/');
      candidates.push(join(__dirname, `${parentDir}.js`));
    }

    let handler = null;
    let loaded = false;

    for (const candidatePath of candidates) {
      try {
        // Cache-busting query string untuk development (hindari stale module cache)
        const moduleUrl = pathToFileURL(candidatePath).href + '?t=' + Date.now();
        const mod = await import(moduleUrl);
        handler = mod.default;
        loaded = true;
        break;
      } catch (err) {
        if (err.code !== 'ERR_MODULE_NOT_FOUND') {
          console.error(`[dev-server] Error loading ${pathname}:`, err.message);
          sendJson(res, 500, { message: 'Internal server error', code: 'INTERNAL_ERROR' });
          return;
        }
      }
    }

    if (!loaded || !handler) {
      sendJson(res, 404, { message: `Endpoint tidak ditemukan: ${pathname}`, code: 'NOT_FOUND' });
      return;
    }

    // Wrap res.status dan res.json untuk kompatibilitas
    res.status = function (code) {
      this.statusCode = code;
      return this;
    };
    res.json = function (data) {
      sendJson(res, this.statusCode || 200, data);
    };

    await handler(req, res);
    return;
  }

  // Fallback: 404
  sendJson(res, 404, { message: 'Not found', code: 'NOT_FOUND' });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Dev API server running at http://localhost:${PORT}`);
  console.log(`   Proxying /api/* → api/*.js handlers\n`);
});
