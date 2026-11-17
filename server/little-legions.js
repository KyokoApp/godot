/**
 * Server Little Legions (game lama) — statis saja, port terpisah.
 *   npm run little-legions          -> http://localhost:8090
 *
 * Buildnya ada di folder game/ (Unity WebGL). Aturan penting:
 *   - .unityweb sudah gzip di dalamnya: JANGAN tambah Content-Encoding / gzip ulang
 *   - dukung Range (206) untuk file 57 MB
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GAME_DIR = resolve(process.env.GAME_DIR || join(ROOT, 'game'));
const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
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

const sendJson = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  res.end(body);
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health') {
    let gameReady = false;
    try {
      await stat(join(GAME_DIR, 'Build', 'WebBuild.wasm.unityweb'));
      gameReady = true;
    } catch {}
    return sendJson(res, 200, { ok: true, game: 'little-legions', gameReady, uptimeSec: Math.round(process.uptime()) });
  }
  if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'tidak ada' });

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return res.writeHead(400).end(); }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = normalize(join(GAME_DIR, pathname));
  if (target !== GAME_DIR && !target.startsWith(GAME_DIR + sep)) return res.writeHead(403).end('forbidden');

  const serve = async (path) => {
    const info = await stat(path);
    if (!info.isFile()) throw new Error('bukan file');
    const longCache = /\.(unityweb|wasm|data|ttf|woff2|png|jpg|webp|svg)$/i.test(path);
    const headers = {
      'Content-Type': MIME[extname(path).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': longCache ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Accept-Ranges': 'bytes',
    };
    const m = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range.trim());
    if (m && (m[1] || m[2])) {
      const size = info.size;
      const start = m[1] ? Number(m[1]) : size - Number(m[2]);
      let end = m[1] && m[2] ? Number(m[2]) : size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
        return;
      }
      end = Math.min(end, size - 1);
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      createReadStream(path, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, 'Content-Length': info.size });
    createReadStream(path).pipe(res);
  };

  try {
    await serve(target);
  } catch {
    try {
      await serve(join(GAME_DIR, 'index.html'));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Build Little Legions tidak ada di game/');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`▶ Little Legions — http://${HOST}:${PORT}  (folder: ${GAME_DIR})`);
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
