# Deploy Little Legions ke VPS

Satu proses Node 22 menyajikan **game Unity WebGL + API** di port 8080.
Dua jalur: Docker (cepat) atau systemd + nginx (tanpa Docker).

## 0. Prasyarat VPS

- Ubuntu 22.04/24.04 atau Debian 12. Build Unity butuh RAM besar saat loading di
  browser pemain, tapi **di server RAM tidak banyak dipakai** — 1 GB cukup.
- Node **22+**:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

- Disk: build ±98 MB, sisakan ≥2 GB.
- Firewall: buka 80/443 saja. Port 8080 tetap lokal.

```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 1A. Jalur Docker

```bash
git clone https://github.com/<user>/<repo>.git little-legions && cd little-legions
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml logs -f
```

Container hanya bind ke `127.0.0.1:8080`. Update: `git pull && docker compose -f deploy/docker-compose.yml up -d --build`.

## 1B. Jalur systemd (tanpa Docker)

```bash
# dari mesin lokal
VPS_HOST=user@ip ./scripts/deploy-vps.sh

# hasil di VPS
sudo journalctl -u little-legions -f
curl -s http://127.0.0.1:8080/api/health
```

Skrip mengirim `game/` (aset build) + `server/` + `package.json`, lalu memasang
`deploy/little-legions.service`. Karena asetnya besar, kirim ulang hanya kalau build berubah.

## 2. Nginx + HTTPS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/little-legions
sudo sed -i 's/littlelegions.contoh.com/DOMAIN_KAMU/g' /etc/nginx/sites-available/little-legions
sudo ln -sf /etc/nginx/sites-available/little-legions /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d DOMAIN_KAMU
```

### ⚠️ Aturan khusus Unity WebGL

1. **Jangan gzip `.unityweb`.** File itu sudah gzip/brotli di dalamnya. `deploy/nginx.conf`
   sudah mematikan gzip untuk `location /Build/`. Kalau dipaksa gzip, CPU habis dan
   transfer malah bisa lebih besar.
2. **`Content-Encoding` jangan dipasang** untuk `.unityweb` — loader Unity yang mengurus
   dekompresi. Server Node di repo ini tidak menambahkannya.
3. **Cache panjang** untuk `/Build/` (immutable 1 tahun) supaya pemain tidak mengunduh
   ulang 98 MB tiap main.
4. Kalau nanti build Unity memakai **threads** (SharedArrayBuffer), tambahkan header:

```nginx
add_header Cross-Origin-Opener-Policy same-origin;
add_header Cross-Origin-Embedder-Policy require-corp;
```
Build saat ini **tanpa** pthread, jadi header ini belum diperlukan.

## 3. Verifikasi

```bash
./scripts/smoke-test.sh https://DOMAIN_KAMU
```

Cek isi: health `gameReady:true`, `<title>Little Legions</title>`, loader 200,
byte awal wasm `0061736d`, tidak ada token di HTML, API 404 untuk path aneh.

## 4. Checklist go-live

- [ ] `curl /api/health` → `gameReady: true`
- [ ] Game kebuka di HP (landscape) dan di desktop
- [ ] DevTools → Network: `WebBuild.wasm.unityweb` 200, **bukan** `content-encoding: gzip`
- [ ] Reload kedua: aset dari cache (disk cache), bukan unduh ulang
- [ ] HTTPS aktif, HTTP redirect 301
- [ ] `ss -lntp | grep 8080` → hanya `127.0.0.1`
- [ ] `Restart=always` / `restart: unless-stopped` aktif

## 5. Skala & biaya bandwidth

98 MB per pemain baru itu besar. Kalau mulai ramai:

| Masalah | Solusi |
| --- | --- |
| Bandwidth boros | Taruh `game/Build/` di CDN / object storage (R2, S3, Bunny), ubah `dataUrl`/`codeUrl`/`frameworkUrl` di `game/index.html` ke URL CDN |
| Loading lama | Aktifkan brotli di CDN (bukan di origin) — build sudah gzip, CDN bisa simpan versi brotli |
| Skor online | Tambah tabel SQLite/Postgres di `server/index.js`, atau pakai Supabase |
| Tanpa urus server | Frontend statis di Vercel + aset di CDN |

## 6. Backup

Saat ini server tidak menyimpan data pemain (semua progres di `localStorage` /
IndexedDB browser via Unity). Kalau nanti ada skor server-side, backup file DB-nya
seperti pola SQLite biasa (`.backup` saat jalan, atau stop → copy).
