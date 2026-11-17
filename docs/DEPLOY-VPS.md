# Deploy ke VPS — panduan lengkap

Dua jalur: **Docker** (paling cepat) atau **systemd + nginx** (tanpa Docker).
Keduanya menjalankan satu proses Node 22 yang melayani API **dan** file game
sekaligus di port 8080.

## 0. Prasyarat VPS

- Ubuntu 22.04/24.04 atau Debian 12, RAM ≥ 1 GB, swap 1 GB kalau RAM kecil.
- Node **22+** (`node -v`). Kalau belum:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

- Domain A-record → IP VPS (opsional tapi disarankan untuk HTTPS).
- Buka port 80 & 443. Port 8080 **jangan** diekspos ke publik.

```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 1A. Jalur Docker (disarankan)

```bash
git clone https://github.com/<user>/<repo>.git skyrunner && cd skyrunner
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml logs -f
```

Container bind ke `127.0.0.1:8080` saja; data SQLite di volume `skyrunner-data`.
Update rilis berikutnya: `git pull && docker compose -f deploy/docker-compose.yml up -d --build`.

## 1B. Jalur systemd (tanpa Docker)

```bash
# di VPS
sudo useradd --system --home /opt/skyrunner --shell /usr/sbin/nologin skyrunner
sudo mkdir -p /opt/skyrunner /var/lib/skyrunner
sudo chown -R skyrunner:skyrunner /opt/skyrunner /var/lib/skyrunner

# dari lokal
VPS_HOST=user@ip ./scripts/deploy-vps.sh
```

Skrip itu build game di lokal, kirim `game/dist` + `server/`, lalu memasang
`deploy/skyrunner.service`. Cek log:

```bash
sudo journalctl -u skyrunner -f
```

## 2. Nginx + HTTPS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/skyrunner
sudo sed -i 's/game.contoh.com/DOMAIN_KAMU/g' /etc/nginx/sites-available/skyrunner
sudo ln -sf /etc/nginx/sites-available/skyrunner /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d DOMAIN_KAMU      # isi email, pilih redirect
```

Verifikasi:

```bash
curl -s https://DOMAIN_KAMU/api/health
./scripts/smoke-test.sh https://DOMAIN_KAMU
```

## 3. Backup & restore SQLite

Data ada di satu file (mode WAL). Backup aman walau server jalan:

```bash
# di VPS / cron harian 03:00
sudo -u skyrunner sqlite3 /var/lib/skyrunner/skyrunner.db \
  ".backup '/var/backups/skyrunner-$(date +%F).db'"
```

Kalau `sqlite3` tidak ada, cukup stop service sebentar dan copy `.db` + `-wal` + `-shm`.
Restore: hentikan service, ganti file db, hapus `-wal`/`-shm`, start lagi.

## 4. Checklist go-live

- [ ] `curl /api/health` → `{"ok":true,...}`
- [ ] Skor tersimpan setelah reload halaman (bukan cuma di browser)
- [ ] HTTPS aktif, HTTP redirect 301
- [ ] Port 8080 tertutup dari internet (`ss -lntp | grep 8080` harus 127.0.0.1)
- [ ] `Restart=always` / `restart: unless-stopped` aktif → tes `sudo reboot`
- [ ] Backup harian terjadwal
- [ ] `CORS_ORIGIN` diset ke domain kamu kalau frontend dipisah dari API

## 5. Skala berikutnya (kalau sudah ramai)

| Kebutuhan            | Ganti dengan                                        |
| -------------------- | --------------------------------------------------- |
| Banyak penulis skor  | Postgres + pool koneksi, atau pindah ke Supabase    |
| Cache papan skor     | Redis, TTL 10–30 detik                              |
| Aset game besar      | CDN / object storage (S3, R2)                       |
| Multi-region         | Docker image yang sama + load balancer              |
| Tanpa urus server    | Vercel (frontend) + Fly.io/Railway (API + volume)   |
