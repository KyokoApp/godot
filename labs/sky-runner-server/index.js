/**
 * Backend Sky Runner — tanpa dependency eksternal.
 *  - Node 22 built-in http + node:sqlite (tidak butuh npm install untuk server)
 *  - Sajikan file statis build game (game/dist) saat NODE_ENV=production
 *  - API: GET /api/health, GET /api/scores, POST /api/scores
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || join(ROOT, '.data', 'skyrunner.db');
const STATIC_DIR = process.env.STATIC_DIR || join(ROOT, 'game', 'dist');
const SERVE_STATIC = process.env.SERVE_STATIC !== '0';
const VERSION = '1.0.0';

/* ------------------------------- database -------------------------------- */
let db;
async function openDb() {
  if (DB_PATH !== ':memory:') {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(dirname(DB_PATH), { recursive: true });
  }
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS scores (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      score       INTEGER NOT NULL,
      level       INTEGER NOT NULL DEFAULT 1,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scores_rank ON scores(score DESC, created_at ASC);
  `);
}

const stmt = {
  insert: () => db.prepare('INSERT INTO scores (name, score, level, duration_ms) VALUES (?, ?, ?, ?)'),
  top: () => db.prepare('SELECT id, name, score, level, duration_ms, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT ?'),
  better: () => db.prepare('SELECT COUNT(*) AS c FROM scores WHERE score > ?'),
  total: () => db.prepare('SELECT COUNT(*) AS c FROM scores'),
};

/* -------------------------------- helpers -------------------------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.pck': 'application/octet-stream',
  '.map': 'application/json; charset=utf-8',
};

const CORS = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...CORS,
  });
  res.end(body);
}

function readBody(req, limit = 8 * 1024) {
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('payload terlalu besar'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// rate limit sederhana per IP (sliding window 60 detik)
const hits = new Map();
function rateLimited(ip, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const bucket = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  bucket.push(now);
  hits.set(ip, bucket);
  if (hits.size > 5_000) hits.clear();
  return bucket.length > max;
}

function cleanName(raw) {
  const name = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14);
  return name || 'anonim';
}

function toInt(v, fallback = 0, min = 0, max = 10_000_000) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}

/* --------------------------------- routes -------------------------------- */
async function handleApi(req, res, url) {
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  if (url.pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      version: VERSION,
      uptimeSec: Math.round(process.uptime()),
      node: process.version,
      scores: stmt.total().get().c,
    });
  }

  if (parts[0] === 'scores') {
    if (req.method === 'GET') {
      const limit = toInt(url.searchParams.get('limit') ?? 10, 10, 1, 100);
      return sendJson(res, 200, { scores: stmt.top().all(limit) });
    }

    if (req.method === 'POST') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (rateLimited(ip)) return sendJson(res, 429, { error: 'terlalu banyak permintaan, coba lagi nanti' });

      let payload;
      try {
        payload = JSON.parse(await readBody(req));
      } catch (err) {
        return sendJson(res, err.status || 400, { error: 'JSON tidak valid' });
      }
      if (!payload || typeof payload !== 'object') return sendJson(res, 400, { error: 'body harus objek' });

      const row = {
        name: cleanName(payload.name),
        score: toInt(payload.score, 0, 0, 10_000_000),
        level: toInt(payload.level, 1, 1, 999),
        duration_ms: toInt(payload.durationMs, 0, 0, 86_400_000),
      };
      if (row.score <= 0) return sendJson(res, 400, { error: 'skor harus lebih dari 0' });

      const info = stmt.insert().run(row.name, row.score, row.level, row.duration_ms);
      const rank = stmt.better().get(row.score).c + 1;
      const total = stmt.total().get().c;
      return sendJson(res, 201, { ok: true, id: Number(info.lastInsertRowid), rank, total });
    }

    return sendJson(res, 405, { error: 'metode tidak didukung' });
  }

  return sendJson(res, 404, { error: 'endpoint tidak ditemukan' });
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  // cegah path traversal
  const target = normalize(join(STATIC_DIR, pathname));
  if (!target.startsWith(STATIC_DIR)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(target);
    const type = MIME[extname(target).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.length,
      'Cache-Control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(body);
  } catch {
    // SPA fallback
    try {
      const body = await readFile(join(STATIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end(
        'Game belum di-build. Jalankan: cd game && npm run build'
      );
    }
  }
}

/* --------------------------------- server -------------------------------- */
await openDb();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS).end();
    return;
  }

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    if (!SERVE_STATIC) return sendJson(res, 404, { error: 'static serving dimatikan' });
    await serveStatic(req, res, url);
  } catch (err) {
    console.error('[error]', err);
    if (!res.headersSent) sendJson(res, 500, { error: 'kesalahan server' });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`▶ Sky Runner server di http://${HOST}:${PORT}`);
  console.log(`  db      : ${DB_PATH}`);
  console.log(`  statis  : ${SERVE_STATIC ? STATIC_DIR : 'nonaktif'}`);
});

const shutdown = () => {
  console.log('\n⏻ mematikan server…');
  server.close(() => { try { db.close(); } catch {} process.exit(0); });
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
