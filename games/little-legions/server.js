/**
 * Server Little Legions — satu port untuk game Unity WebGL + API skor.
 * Mengikuti gaya repo ini: Node 22 murni, tanpa dependency.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = process.env.GAME_DIR || join(__dirname);
const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || '0.0.0.0';
const VERSION = '0.1.0';

// Unity WebGL: .unityweb sudah terkompresi gzip/brotli, jadi harus disajikan apa adanya
// (tanpa Content-Encoding ganda) dan dengan tipe yang benar.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.unityweb': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
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

async function serveFile(res, path) {
  const info = await stat(path);
  if (!info.isFile()) throw new Error('bukan file');
  const body = await readFile(path);
  const ext = extname(path).toLowerCase();
  const immutable = /\.(unityweb|wasm|data|js|css|ttf|woff2)$/.test(path) && !path.endsWith('loader.js');
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...CORS,
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();

  if (url.pathname === '/api/health') {
    let gameReady = false;
    try {
      await stat(join(GAME_DIR, 'Build', 'WebBuild.wasm.unityweb'));
      gameReady = true;
    } catch {}
    return sendJson(res, 200, { ok: true, version: VERSION, game: 'little-legions', gameReady, uptimeSec: Math.round(process.uptime()) });
  }

  if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'endpoint tidak ditemukan' });

  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = normalize(join(GAME_DIR, pathname));
  if (!target.startsWith(GAME_DIR)) return res.writeHead(403).end('forbidden');

  try {
    await serveFile(res, target);
  } catch {
    try {
      await serveFile(res, join(GAME_DIR, 'index.html'));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end('Build Little Legions tidak ditemukan di games/little-legions');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`▶ Little Legions di http://${HOST}:${PORT}`);
  console.log(`  folder game: ${GAME_DIR}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
