# Little Legions (Unity WebGL)

Build **Little Legions v0.1.0** dari **Greenpine Studio** (game asli: *Small armies.
Clever formations.*). Diimpor ke repo ini sesuai permintaan, **tanpa** merge ke `main`.

| Item | Nilai |
| --- | --- |
| Asal | `KyokoApp/animestudio` → `games/little-legions/` |
| Posisi di repo ini | `game/` — game lama; produk utama sekarang **Sky Legion Live** (lihat README root) |
| Engine | Unity WebGL (`Build/WebBuild.*.unityweb`) |
| Ukuran | ± 98 MB (wasm 57 MB, data 42 MB) — sudah terkompresi gzip di dalam |
| Threads | tidak ada (tidak butuh `SharedArrayBuffer`) |
| Lisensi | milik Greenpine Studio — lihat catatan di bawah |

## Struktur

```
game/
├── index.html                     # player asli (hanya blok heartbeat yang dihapus)
├── Build/
│   ├── WebBuild.loader.js
│   ├── WebBuild.framework.js.unityweb
│   ├── WebBuild.wasm.unityweb     # 57 MB
│   └── WebBuild.data.unityweb     # 42 MB
└── TemplateData/Tiny5-Regular.ttf
```

Server-nya ada di root repo (`server/`), bukan di sini.

## Jalanin

```bash
# dari root repo
npm run little-legions    # http://localhost:8090
```

Atau tanpa Node:

```bash
npx serve -l 8090 game
```

## Perubahan yang dilakukan saat impor

1. **Blok heartbeat dihapus** dari `index.html`. Blok itu menyimpan **token GitHub
   hardcoded** (`ghp_…`) dan setiap 25 detik menulis ke sebuah Gist. Konsekuensinya:
   - Token itu sudah publik di repo asal → **anggap bocor, revoke sekarang** di
     GitHub → Settings → Developer settings → Tokens.
   - Menyalin apa adanya ke repo ini berarti menyebarkan kredensial lebih jauh, jadi
     blok tersebut dibuang. Game tetap jalan penuh tanpa blok itu (isinya hanya
     hitung pemain online).
2. Tag `<script defer src="https://static.itch.io/htmlgame.js">` ditinggal apa adanya.
   Kalau nanti tidak dipublikasikan ke itch.io, boleh dihapus supaya nol request pihak ketiga.
3. Server dipindah ke `server/` di root repo (satu port untuk game + health check).

## Deploy

Opsi termudah — satu port, game + API:

```bash
# lokal / VPS
npm run little-legions             # port 8090
PORT=9001 npm run little-legions   # port lain
```

Untuk VPS produksi, tambahkan blok nginx (lihat `deploy/nginx.conf`)
yang mem-proxy `location /` ke `127.0.0.1:8090`. Karena `.unityweb` sudah
terkompresi, **jangan** aktifkan `gzip`/`brotli` untuk path `/Build/` — akan
memakan CPU tanpa manfaat. Contoh:

```nginx
location /Build/ {
    proxy_pass http://127.0.0.1:8090;
    gzip off;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Catatan ukuran & Git

Total ± 98 MB masuk sebagai file biasa (repo ini belum memakai Git LFS). Kalau nanti
build-nya membesar atau repo terasa berat, pindahkan `Build/*.unityweb` ke Git LFS:

```bash
git lfs install
git lfs track "game/Build/*.unityweb"
```

Hosting alternatif untuk aset besar: object storage / CDN, lalu ubah `dataUrl`,
`frameworkUrl`, `codeUrl` di `index.html` ke URL absolut.

## Prosedur Unity asli (opsional)

Game ini hasil build; **project Unity-nya tidak ada di repo asal**. Untuk mengubah
perilaku game (mis. kirim skor ke API repo ini), kamu butuh project sumber Unity-nya
dari Greenpine Studio. Yang bisa dilakukan tanpa source: ganti teks/UI di
`index.html`, dan host build di sini.
