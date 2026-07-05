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
import { logRequest, logInfo, logError as logServerError } from './_lib/logger.js';

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
  const startTime = Date.now();

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    logRequest(req.method, req.url, 204, Date.now() - startTime);
    return;
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
          logServerError('dev-server', err);
          sendJson(res, 500, { message: 'Internal server error', code: 'INTERNAL_ERROR' });
          logRequest(req.method, pathname, 500, Date.now() - startTime);
          return;
        }
      }
    }

    if (!loaded || !handler) {
      sendJson(res, 404, { message: `Endpoint tidak ditemukan: ${pathname}`, code: 'NOT_FOUND' });
      logRequest(req.method, pathname, 404, Date.now() - startTime);
      return;
    }

    // Wrap res.status dan res.json untuk kompatibilitas + capture status
    let responseStatus = 200;
    const originalSendJson = sendJson;
    res.status = function (code) {
      responseStatus = code;
      this.statusCode = code;
      return this;
    };
    res.json = function (data) {
      originalSendJson(res, this.statusCode || 200, data);
      logRequest(req.method, pathname, this.statusCode || 200, Date.now() - startTime);
    };

    await handler(req, res);
    return;
  }

  // Fallback: 404
  sendJson(res, 404, { message: 'Not found', code: 'NOT_FOUND' });
  logRequest(req.method, pathname, 404, Date.now() - startTime);
});

// Validasi env vars kritis sebelum start
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missing = requiredEnvVars.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Pastikan file .env sudah diisi dengan benar.\n');
  console.error('   Copy .env.example ke .env dan isi nilai yang diperlukan.\n');
  process.exit(1);
}

server.listen(PORT, () => {
  logInfo('dev-server', `🚀 Dev API server running at http://localhost:${PORT}`);
  logInfo('dev-server', `📋 Proxying /api/* → api/*.js handlers`);
  logInfo('dev-server', `📊 Log viewer aktif — lihat terminal ini untuk monitoring`);
  console.log(''); // spacer setelah pino-pretty output
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('dev-server', 'SIGTERM received, closing server...');
  server.close(() => {
    logInfo('dev-server', 'Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logInfo('dev-server', 'SIGINT received, closing server...');
  server.close(() => {
    logInfo('dev-server', 'Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logServerError('dev-server', 'Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logServerError('dev-server', 'Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
