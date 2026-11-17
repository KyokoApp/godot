/**
 * Server Little Legions — satu proses, satu port: menyajikan build Unity WebGL
 * di ../game plus API kecil. Node 22 murni, tanpa dependency.
 *
 *   PORT=8080 node server/index.js       -> http://localhost:8080
 *   GAME_DIR=/path/ke/build node ...     -> pakai build lain
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GAME_DIR = resolve(process.env.GAME_DIR || join(ROOT, 'game'));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const VERSION = '0.1.0';

/* File Unity WebGL (.unityweb) SUDAH terkompresi gzip/brotli di dalamnya.
   Kirim apa adanya — jangan tambah Content-Encoding, jangan aktifkan gzip/brotli
   untuk folder /Build/ (CPU terbuang, ukuran tidak berkurang). */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.unityweb': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.pck': 'application/octet-stream',
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

async function sendFile(res, path, req) {
  const info = await stat(path);
  if (!info.isFile()) throw new Error('bukan file');
  const ext = extname(path).toLowerCase();
  // aset build besar boleh cache panjang; html & loader tidak
  const longCache = /\.(unityweb|wasm|data|ttf|woff2|png|jpg|webp|svg)$/i.test(path);
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': longCache ? 'public, max-age=31536000, immutable' : 'no-cache',
    'Accept-Ranges': 'bytes',
    ...CORS,
  };

  // Range request: browser Unity butuh ini untuk file besar / resume unduhan.
  const range = req.headers.range;
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (m && (m[1] || m[2])) {
    const size = info.size;
    let start = m[1] ? Number(m[1]) : size - Number(m[2]);
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}`, ...CORS }).end();
      return;
    }
    end = Math.min(end, size - 1);
    const { createReadStream } = await import('node:fs');
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    });
    createReadStream(path, { start, end }).pipe(res);
    return;
  }

  const body = await readFile(path);
  res.writeHead(200, { ...headers, 'Content-Length': body.length });
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
    return sendJson(res, 200, {
      ok: true,
      version: VERSION,
      game: 'little-legions',
      gameReady,
      uptimeSec: Math.round(process.uptime()),
      node: process.version,
    });
  }

  if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'endpoint tidak ditemukan' });

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return res.writeHead(400).end('bad request');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const target = normalize(join(GAME_DIR, pathname));
  if (target !== GAME_DIR && !target.startsWith(GAME_DIR + sep)) {
    return res.writeHead(403).end('forbidden');
  }

  try {
    await sendFile(res, target, req);
  } catch {
    try {
      await sendFile(res, join(GAME_DIR, 'index.html'), req);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end('Build Little Legions tidak ditemukan. Taruh Build/, TemplateData/, index.html di folder game/.');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`▶ Little Legions — http://${HOST}:${PORT}`);
  console.log(`  folder game : ${GAME_DIR}`);
  console.log(`  health      : http://${HOST}:${PORT}/api/health`);
});

const shutdown = () => {
  console.log('\n⏻ mematikan server…');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
