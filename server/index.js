/**
 * Sky Legion Live — server TikTok Live battle arena.
 * Satu proses: WebSocket (sinkron state) + HTTP statis (game) + REST ringan.
 *
 *   npm start                     -> http://localhost:8080  (mode simulasi)
 *   TIKTOK_USER=@nama npm start    -> sambung ke live TikTok asli
 *   TIKTOK_SIGN_KEY=xxx npm start  -> kalau TikTok minta API key Euler Stream
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Arena } from './arena.js';
import { connectTikTok, startMockChat } from './tiktok.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GAME_DIR = resolve(process.env.GAME_DIR || join(ROOT, 'dist'));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const TIKTOK_USER = (process.env.TIKTOK_USER || '').trim();
const MOCK = process.env.MOCK === '1' || !TIKTOK_USER;

const arena = new Arena();
arena.start();

/* ------------------------------- transport ------------------------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      uptimeSec: Math.round(process.uptime()),
      tiktok: { mode: MOCK ? 'mock' : 'live', user: TIKTOK_USER || null },
      arena: arena.summary(),
    });
  }

  if (url.pathname === '/api/state') return sendJson(res, 200, arena.summary());

  if (url.pathname === '/api/mock/chat' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let p = {};
    try { p = JSON.parse(body || '{}'); } catch {}
    const name = String(p.user || 'penonton').slice(0, 24);
    const text = String(p.text || 'join');
    const result = arena.onChat({ user: name, text, userId: name, avatar: null });
    return sendJson(res, 200, { ok: true, result });
  }

  if (url.pathname === '/api/control' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let p = {};
    try { p = JSON.parse(body || '{}'); } catch {}
    if (p.action === 'reset') arena.reset();
    else if (p.action === 'pause') arena.running = false;
    else if (p.action === 'resume') arena.running = true;
    else return sendJson(res, 400, { error: 'action: reset|pause|resume' });
    return sendJson(res, 200, { ok: true, arena: arena.summary() });
  }

  if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'tidak ada' });

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return res.writeHead(400).end(); }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = normalize(join(GAME_DIR, pathname));
  if (target !== GAME_DIR && !target.startsWith(GAME_DIR + sep)) return res.writeHead(403).end('forbidden');

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('bukan file');
    const ext = extname(target).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    createReadStream(target).pipe(res);
  } catch {
    try {
      const body = await readFile(join(GAME_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end('Belum di-build. Jalankan: npm run build');
    }
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket) => {
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });
  arena.addViewer(socket);
  socket.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === 'ping') socket.send(JSON.stringify({ type: 'pong', t: msg.t }));
  });
  socket.on('close', () => arena.removeViewer(socket));
  socket.on('error', () => arena.removeViewer(socket));
});

setInterval(() => {
  for (const s of wss.clients) {
    if (!s.isAlive) { s.terminate(); continue; }
    s.isAlive = false;
    try { s.ping(); } catch {}
  }
}, 30_000).unref();

/* -------------------------------- TikTok -------------------------------- */
const source = MOCK ? startMockChat(arena) : connectTikTok(TIKTOK_USER, arena);

server.listen(PORT, HOST, () => {
  console.log(`▶ Sky Legion Live — http://${HOST}:${PORT}`);
  console.log(`  tampilan : http://localhost:${PORT}${MOCK ? '  (mode simulasi)' : ''}`);
  console.log(`  overlay  : http://localhost:${PORT}/?overlay=1   (OBS, latar transparan)`);
  console.log(`  panel    : http://localhost:${PORT}/?panel=1     (reset / jeda)`);
  console.log(`  tiktok   : ${MOCK ? 'MOCK — set TIKTOK_USER=@akun untuk live asli' : TIKTOK_USER}`);
  console.log(`  game lama: npm run little-legions  -> http://localhost:8090 (Little Legions)`);
});

const shutdown = () => {
  console.log('\n⏻ mematikan…');
  try { source?.stop?.(); } catch {}
  arena.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
