# Little Legions — hosting + deploy

Repo ini sekarang **fokus ke satu game: Little Legions** (Unity WebGL, Greenpine
Studio). Isinya build game yang siap disajikan, server minimal, dan pipeline deploy
ke VPS. Demo-demo lama yang tidak dipakai dipindah ke `labs/`.

```
game/      # build Unity WebGL Little Legions (index.html, Build/*.unityweb, font)
server/    # Node 22: server statis + /api/health, tanpa dependency
deploy/    # Dockerfile, docker-compose, nginx.conf (gzip off utk /Build/), systemd unit
scripts/   # deploy-vps.sh, smoke-test.sh
docs/      # DEPLOY-VPS.md (panduan lengkap)
labs/      # arsip eksperimen (Sky Runner Phaser, Godot starter) — bukan produk
```

## Jalanin

```bash
npm start                 # http://localhost:8080  (game + /api/health)
```

Atau tanpa Node:

```bash
npx serve -l 8080 game
```

## API

| Method | Path          | Isi |
| ------ | ------------- | --- |
| GET    | `/api/health` | `{ ok, version, game, gameReady, uptimeSec, node }` |

`gameReady` bernilai `true` kalau `game/Build/WebBuild.wasm.unityweb` ada — berguna
untuk health check Docker/uptime monitor.

## Deploy VPS

```bash
docker compose -f deploy/docker-compose.yml up -d --build     # jalur Docker
VPS_HOST=user@ip ./scripts/deploy-vps.sh                      # jalur systemd
./scripts/smoke-test.sh https://domain-kamu                   # verifikasi
```

Panduan lengkap (nginx, TLS, aturan gzip Unity, cache, checklist, CDN):
**`docs/DEPLOY-VPS.md`**.

## Tiga hal yang mudah bikin game ini gagal tampil

1. **`.unityweb` jangan di-gzip lagi.** Sudah terkompresi; `deploy/nginx.conf`
   mematikan gzip untuk `/Build/`.
2. **Jangan tambah `Content-Encoding`** untuk `.unityweb`. Loader Unity yang urus.
3. **Path relatif.** `index.html` memanggil `Build/…`, jadi sajikan dari root folder
   `game/`, bukan dari sub-path tanpa penyesuaian.

## Catatan

- Build ini hasil kompilasi; project Unity sumbernya tidak disertakan. Detail + catatan
  lisensi: `game/README.md`.
- Blok heartbeat berisi token GitHub hardcoded dari repo asal sudah **dihapus**
  saat impor. Token itu publik → revoke di GitHub kalau belum.
