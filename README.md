# Sky Legion Live — arena battle TikTok Live

Game battle royale mini untuk siaran **TikTok Live**. Penonton mengetik **`join`** di
komentar → karakter mereka langsung muncul di arena → semua karakter saling serang
otomatis sampai tumbang, lalu respawn. Gratis hadiah = karakter jadi lebih kuat.

```
index.html, src/     # tampilan arena (Phaser 3 + Vite)
server/              # Node 22: WebSocket arena + koneksi TikTok Live + server statis
deploy/              # Dockerfile, docker-compose, nginx (WebSocket), systemd
scripts/             # deploy-vps.sh, smoke-test.sh
docs/                # TUTORIAL-LIVE.md (setup OBS + TikTok), DEPLOY-VPS.md
game/                # Game lama Little Legions (Unity WebGL) — masih bisa dijalankan
labs/                # arsip eksperimen, bukan produk
```

## Jalanin (mode simulasi, tanpa TikTok)

```bash
npm install
npm run build      # build tampilan ke dist/
npm start          # http://localhost:8080
```

Mode simulasi membuat komentar palsu tiap ±2,6 detik, jadi kamu bisa langsung lihat
arenanya hidup. Klik di mana pun (atau tekan **J**) untuk mengirim `join` sendiri.

| URL | Guna |
| --- | --- |
| `http://localhost:8080` | tampilan utama |
| `http://localhost:8080/?overlay=1` | **overlay OBS** — latar transparan, tanpa panel |
| `http://localhost:8080/?panel=1` | tombol admin: reset / jeda / lanjut |

## Sambung ke live TikTok asli

```bash
TIKTOK_USER=@akunmu npm start
```

Kalau TikTok menolak dengan pesan soal *signature / API key / premium*, daftar API key
gratis di **eulerstream.com** lalu:

```bash
TIKTOK_USER=@akunmu TIKTOK_SIGN_KEY=xxxxx npm start
```

Syarat: akun harus **sedang live**. Detail + setup OBS: **`docs/TUTORIAL-LIVE.md`**.

## Perintah komentar

| Komentar | Efek |
| --- | --- |
| `join`, `masuk`, `gabung`, `+` | spawn karakter (cooldown 8 detik per orang) |
| `join merah` / `biru` / `kuning` / `ungu` / `hijau` | join dengan warna tim |
| `pedang`, `tombak`, `kapak`, `panah` | ganti senjata (jarak & damage beda) |
| hadiah/gift | +HP & +damage permanen untuk pengirim |

Kapasitas 40 petarung sekaligus; yang paling lemah digeser saat arena penuh.
Setelah tumbang, karakter respawn otomatis 6 detik kemudian.

## API

| Method | Path | Isi |
| --- | --- | --- |
| GET | `/api/health` | status server + mode TikTok + ringkasan arena |
| GET | `/api/state` | jumlah petarung, feed terbaru |
| POST | `/api/mock/chat` | `{ user, text }` — simulasi komentar |
| POST | `/api/control` | `{ action: "reset" \| "pause" \| "resume" }` |
| WS | `/ws` | `init`, `tick` (10/detik), `join`, `hit`, `kill`, `boost`, `feed` |

## Tes & deploy

```bash
./scripts/smoke-test.sh                      # health, join, ganti senjata, websocket
docker compose -f deploy/docker-compose.yml up -d --build
VPS_HOST=user@ip TIKTOK_USER=@akun ./scripts/deploy-vps.sh
```

Panduan VPS + nginx (penting: blok `location /ws` dengan `Upgrade` dan
`proxy_read_timeout 3600s`): **`docs/DEPLOY-VPS.md`**.

## Game lama

Little Legions (Unity WebGL) masih tersimpan di `game/` dan bisa dijalankan:

```bash
npm run little-legions      # http://localhost:8090
```
