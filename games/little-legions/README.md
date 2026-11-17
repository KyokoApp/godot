# Little Legions (Unity WebGL)

Build **Little Legions v0.1.0** dari **Greenpine Studio** (game asli: *Small armies.
Clever formations.*). Diimpor ke repo ini sesuai permintaan, **tanpa** merge ke `main`.

| Item | Nilai |
| --- | --- |
| Asal | `KyokoApp/animestudio` → `games/little-legions/` (commit terakhir repo tersebut) |
| Engine | Unity WebGL (`Build/WebBuild.*.unityweb`) |
| Ukuran | ± 98 MB (wasm 57 MB, data 42 MB) — sudah terkompresi gzip di dalam |
| Threads | tidak ada (tidak butuh `SharedArrayBuffer`) |
| Lisensi | milik Greenpine Studio — lihat catatan di bawah |

## Struktur

```
games/little-legions/
├── index.html                     # player asli (hanya blok heartbeat yang dihapus)
├── Build/
│   ├── WebBuild.loader.js
│   ├── WebBuild.framework.js.unityweb
│   ├── WebBuild.wasm.unityweb     # 57 MB
│   └── WebBuild.data.unityweb     # 42 MB
├── TemplateData/Tiny5-Regular.ttf
├── server.js                      # server statis + /api/health (Node 22, tanpa dependency)
└── package.json
```

## Jalanin

```bash
cd games/little-legions
npm start                 # http://localhost:8090
```

Atau pakai server Node biasa:

```bash
npx serve -l 8090 .
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
3. `server.js` + `package.json` ditambahkan supaya bisa jalan tanpa dependency, sama
   seperti folder `server/` di root repo.

## Deploy

Opsi termudah — satu port, game + API:

```bash
# lokal / VPS
cd games/little-legions && PORT=8090 node server.js
```

Untuk VPS produksi, tambahkan blok nginx (lihat `deploy/nginx.conf` sebagai contoh)
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
git lfs track "games/**/Build/*.unityweb"
```

Hosting alternatif untuk aset besar: object storage / CDN, lalu ubah `dataUrl`,
`frameworkUrl`, `codeUrl` di `index.html` ke URL absolut.

## Prosedur Unity asli (opsional)

Game ini hasil build; **project Unity-nya tidak ada di repo asal**. Untuk mengubah
perilaku game (mis. kirim skor ke API repo ini), kamu butuh project sumber Unity-nya
dari Greenpine Studio. Yang bisa dilakukan tanpa source: ganti teks/UI di
`index.html`, dan host build di sini.
