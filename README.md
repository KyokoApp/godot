# Sky Runner — Godot Arena starter (game + server + deploy)

Repo ini sengaja dibuat sebagai **fondasi penuh** untuk project game: ada game yang
langsung jalan, backend API yang nyimpen skor, dan skrip deploy ke VPS supaya nanti
tinggal ganti isi game-nya, bukan bikin pipeline dari nol.

```
game/       # Sky Runner — Phaser 3 + Vite (dev server :5173, build ke game/dist)
server/     # backend Node 22 (http + node:sqlite, tanpa dependency) :8080
games/      # game siap-pakai lain, tiap folder punya server.js sendiri
  little-legions/   # build Unity WebGL resmi (Greenpine Studio) :8090
deploy/     # Dockerfile, compose, nginx, systemd, script deploy VPS
scripts/    # helper lokal (cek environment, build, smoke test)
docs/       # panduan arsitektur, deploy VPS, dan migrasi ke Godot Engine
godot/      # project Godot 4 minimal (jalur migrasi)
```

Port: **5173** Sky Runner (dev), **8080** API/papan skor, **8090** Little Legions.

## 1. Jalanin lokal

```bash
# terminal 1 — backend
cd server && npm start            # http://localhost:8080/api/health

# terminal 2 — game (hot reload)
cd game && npm install && npm run dev   # http://localhost:5173
```

`game/vite.config.js` mem-proxy semua `/api/*` ke `http://127.0.0.1:8080`, jadi
browser cukup memanggil URL relatif — aman untuk preview proxy (E2B) maupun VPS.

Build produksi (server sekaligus nyajiin file statis):

```bash
cd game && npm run build          # hasil di game/dist
cd ../server && SERVE_STATIC=1 PORT=8080 npm start
# buka http://localhost:8080  -> game + API satu port
```

## 2. API

| Method | Path                 | Keterangan                                        |
| ------ | -------------------- | ------------------------------------------------- |
| GET    | `/api/health`        | status server, versi, jumlah entri skor           |
| GET    | `/api/scores?limit=` | papan skor teratas (default 10, maks 100)         |
| POST   | `/api/scores`        | `{ name, score, level, durationMs }` → rank       |

Validasi: nama dibersihkan (maks 14 char), skor 0–10 juta, level 1–999, rate limit
30 request/menit/IP. Data disimpan di SQLite (`.data/skyrunner.db`, WAL mode).

## 2b. Little Legions (Unity WebGL)

```bash
cd games/little-legions && npm start      # http://localhost:8090
```

Build Unity WebGL dari repo `KyokoApp/animestudio` (impor apa adanya, satu blok
heartbeat berisi token GitHub hardcoded sudah dibuang). Detail, catatan lisensi, dan
contoh nginx: `games/little-legions/README.md`.

## 3. Deploy ke VPS

```bash
# dari mesin lokal, setelah repo ini di-push ke GitHub
VPS_HOST=user@ip-vps ./scripts/deploy-vps.sh
```

Atau manual dengan Docker:

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

Detail lengkap (nginx + TLS, systemd tanpa Docker, backup SQLite, firewall):
lihat `docs/DEPLOY-VPS.md`.

## 4. Kalau nanti pindah ke Godot Engine

`docs/GODOT-PIPELINE.md` menjelaskan cara: ekspor web Godot 4 → taruh di
`game/dist` (atau `STATIC_DIR` lain) → backend tetap sama. Folder `godot/` sudah
berisi `project.godot` minimal sebagai titik awal.

## Catatan environment Arena

- Sandbox ini **tidak** punya binary Godot dan **tidak** bisa unduh aset release
  GitHub (host `objects.githubusercontent.com` diblok). Jadi game playable di sini
  dibuat dengan Phaser 3 (npm, tersedia) — tetap sama-sama "game yang jalan".
- Yang tidak bisa dilakukan dari sandbox: SSH ke VPS, deploy produksi nyata.
  Skrip deploy disiapkan supaya tinggal dijalankan dari mesin kamu.
