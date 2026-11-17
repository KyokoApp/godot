# Tutorial: TikTok Live → Arena (OBS)

Target akhir: kamu siaran di TikTok, penonton mengetik `join`, karakter mereka
muncul dan bertarung di layar. Semua jalan di satu VPS.

```
TikTok Live ──(komentar/gift)──> server Node (tiktok-live-connector)
                                      │  WebSocket /ws
                                      ▼
                             tampilan arena (Phaser)
                                      │  Browser Source
                                      ▼
                                   OBS Studio ──> TikTok Live
```

---

## 1. Uji dulu tanpa TikTok (5 menit)

```bash
npm install && npm run build && npm start
```

Buka `http://localhost:8080` → komentar palsu mulai masuk, karakter bertarung.
Klik di layar / tekan `J` = mengirim `join` sendiri.

Kalau ini sudah jalan, 90% sistem sudah beres.

---

## 2. Sambung ke akun TikTok

```bash
TIKTOK_USER=@akunmu npm start
```

Yang terjadi:
1. Server cari room live akun itu.
2. Kalau tidak live → error `UserOfflineError`. Mulai siaran dulu.
3. Kalau minta signature:

```bash
TIKTOK_USER=@akunmu TIKTOK_SIGN_KEY=xxxx npm start
```

Daftar API key gratis di **eulerstream.com** (tiktok-live-connector memakai layanan
mereka untuk menandatangani koneksi WebSocket). Tanpa key, TikTok sering menolak.

> Status koneksi kelihatan di pojok kiri bawah halaman: hijau = tersambung,
> merah = terputus (server mencoba ulang otomatis dengan jeda makin panjang).

---

## 3. Masukkan ke OBS

1. OBS → **Sources** → **+** → **Browser**.
2. Properties:
   - **URL**: `http://IP-VPS:8080/?overlay=1`
   - **Width** 1280, **Height** 720 (sesuaikan scene)
   - Centang **Shutdown source when not visible**, **Refresh browser when scene becomes active**
3. Overlay memakai latar transparan: scene OBS-mu yang menambah background/webcam.
4. Urutan layer yang enak: webcam (bawah) → overlay arena (atas) → teks/alerts.

Tips: jalankan OBS di PC yang sama dengan browser preview untuk mengecek latar
transparan (klik kanan source → Interact).

---

## 4. Alur siaran yang terbukti rame

| Waktu | Yang dilakukan |
| --- | --- |
| 0–2 menit | pancing: "ketik **join** buat masuk arena, nanti auto-war" |
| 2–10 menit | bacakan feed kill: "si budi barusan nge-KO sari" |
| tiap 5 menit | umumkan top 3 leaderboard di pojok kiri atas |
| saat sepi | reset arena (`?panel=1` → reset) supaya mulai dari bersih |
| akhir sesi | sebut juara (kill terbanyak) + pemenang hadiah |

Komentar yang perlu dipandu (taruh di deskripsi/judul live):

```
KETIK: join          -> masuk arena
KETIK: pedang/tombak/kapak/panah -> ganti senjata
GIFT                 -> karakter kamu makin kuat
```

---

## 5. Kalau ada masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| `UserOfflineError` | akun belum live, atau username salah (`@nama`) |
| `SignatureMissingTokensError` / pesan premium | butuh `TIKTOK_SIGN_KEY` dari eulerstream |
| Komentar masuk tapi karakter tidak muncul | cek feed di UI; kalau tidak ada, teks tidak cocok dengan regex join |
| Layar OBS hitam | URL salah, atau server belum `npm run build` |
| Overlay tidak transparan | pastikan `?overlay=1` (tanpa spasi), dan OBS pakai Browser Source (bukan Window Capture) |
| Putus tiap beberapa menit | nginx belum pasang `location /ws` + `proxy_read_timeout 3600s` |
| Lag / FPS drop di OBS | set FPS Browser Source OBS ke 30, tutup preview OBS |

---

## 6. Batasan yang jujur

- **Bukan API resmi TikTok.** `tiktok-live-connector` membaca WebSocket publik TikTok.
  Kalau TikTok mengubah protokolnya, library perlu update (`npm i tiktok-live-connector@latest`).
- **Koneksi bisa putus** saat live panjang; server sudah auto-reconnect, tapi pantau
  status di UI.
- **Tidak ada moderasi**: semua yang mengetik `join` ikut masuk. Filter nama/ban list
  belum ada — bilang kalau mau ditambahkan.
- **Bukan game Unity.** Little Legions hanya build jadi, tanpa source; arena ini
  dibangun baru dengan Phaser dan gaya visual geometris (bukan aset Little Legions).
