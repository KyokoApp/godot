# Deploy Sky Legion Live ke VPS

Satu proses Node 22: **WebSocket arena + koneksi TikTok + file statis**, port 8080.

## 0. Prasyarat

- VPS Ubuntu 22.04/24.04 atau Debian 12, RAM ≥ 1 GB (arena ini ringan: ±80 MB).
- Node **22+**:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

- Firewall: buka 80/443 saja.

```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 1A. Docker (paling cepat)

```bash
git clone https://github.com/<user>/<repo>.git sky-legion && cd sky-legion
export TIKTOK_USER=@akunmu
export TIKTOK_SIGN_KEY=xxxxx      # kalau diminta TikTok
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml logs -f
```

Tanpa `TIKTOK_USER` container jalan di mode simulasi (`MOCK=1`).

## 1B. systemd (tanpa Docker)

```bash
# dari lokal
VPS_HOST=user@ip TIKTOK_USER=@akunmu TIKTOK_SIGN_KEY=xxxx ./scripts/deploy-vps.sh

# di VPS
sudo journalctl -u sky-legion-live -f
curl -s http://127.0.0.1:8080/api/health
```

Skrip menulis `/opt/sky-legion-live/.env` (dibaca `EnvironmentFile` di unit systemd),
jadi rahasia tidak masuk repo.

## 2. Nginx + HTTPS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/sky-legion-live
sudo sed -i 's/live.contoh.com/DOMAIN_KAMU/g' /etc/nginx/sites-available/sky-legion-live
sudo ln -sf /etc/nginx/sites-available/sky-legion-live /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d DOMAIN_KAMU
```

### ⚠️ Wajib untuk WebSocket

```nginx
location /ws {
    proxy_pass http://sky_legion;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;   # live 3 jam tanpa putus
    proxy_send_timeout 3600s;
}
```

Tanpa blok ini arena tetap tampil tapi **beku** (tidak ada tick). Ini kesalahan
paling umum saat deploy.

Kalau ada Cloudflare di depan: WebSocket jalan di paket gratis, tapi jangan aktifkan
"Under Attack Mode" saat live.

## 3. Verifikasi

```bash
./scripts/smoke-test.sh https://DOMAIN_KAMU
```

Cek isi: health OK, judul halaman benar, `join` menambah petarung, ganti senjata
bekerja, WebSocket mengirim tick, 404 untuk path aneh.

## 4. Checklist sebelum live

- [ ] `curl /api/health` → `tiktok.mode` = `live` (bukan `mock`)
- [ ] Status di pojok kiri bawah UI **hijau**
- [ ] Buka `?overlay=1` di OBS, latar transparan, posisi pas
- [ ] Tes dari HP: ketik `join` di live, karakter muncul < 2 detik
- [ ] `?panel=1` bisa reset arena di tengah siaran
- [ ] `ss -lntp | grep 8080` → hanya `127.0.0.1`
- [ ] `Restart=always` / `restart: unless-stopped` aktif → tes `sudo reboot`

## 5. Skala

| Kebutuhan | Solusi |
| --- | --- |
| Penonton banyak (overlay viewer) | WebSocket sudah broadcast hemat (10 pesan/detik, ±2–4 KB) — 1 VPS kecil cukup |
| Beberapa akun TikTok sekaligus | jalankan instance per akun, beda port, satu nginx per domain |
| Statistik live (kill terbanyak, dll.) | tambah SQLite/Postgres di `server/`, atau Supabase |
| Aset/overlay di CDN | taruh `dist/` di CDN, WebSocket tetap ke VPS |
| Tanpa urus server | Vercel tidak cocok (butuh WebSocket panjang) — pakai Fly.io / Railway / VPS kecil |
