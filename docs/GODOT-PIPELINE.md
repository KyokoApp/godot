# Pipeline Godot Engine (opsional)

Repo ini default-nya memakai **Phaser 3** karena sandbox Arena tidak punya binary
Godot dan tidak bisa mengunduh aset rilis GitHub. Struktur server/deploy tetap
sama kalau nanti kamu mau pakai Godot 4 — hanya folder `game/dist` yang isinya
berubah.

## Yang sudah disiapkan

- `godot/project.godot` — project Godot 4 minimal (tanpa aset binary).
- Backend + deploy tidak peduli engine: mereka cuma menyajikan folder statis.

## Langkah ekspor Godot 4 ke web

1. Pasang Godot 4.x + export template **Web** (Editor → Manage Export Templates).
2. Buka `godot/project.godot` di editor, atau buat project baru dan salin isinya.
3. Project → Export → Add… → **Web**.
   - Export Path: `../game/dist/index.html`
   - (opsional) matikan "Extensions Support" kalau tidak perlu
4. Klik **Export Project**. Hasilnya: `index.html`, `.wasm`, `.pck`, `.js`.

## Dua hal yang wajib diperhatikan

**a) Header HTTP.** Godot Web butuh `Cross-Origin-Opener-Policy: same-origin` dan
`Cross-Origin-Embedder-Policy: require-corp` hanya jika memakai thread/SharedArrayBuffer.
Kalau tidak, cukup MIME type yang benar. Server Node di repo ini sudah tahu
`.wasm` → `application/wasm`? **Belum** — tambahkan di `server/index.js`:

```js
'.wasm': 'application/wasm',
```

Kalau memakai nginx, tambahkan di blok `location`:

```nginx
add_header Cross-Origin-Opener-Policy same-origin;
add_header Cross-Origin-Embedder-Policy require-corp;
```

**b) Path base.** Kalau game dilayani dari sub-path, set *Export → Options → Variant →
Base Path* atau pakai `--path` di Vite kalau di-wrap.

## Komunikasi game ↔ backend

Dari GDScript (Godot 4, web export):

```gdscript
func kirim_skor(nama: String, skor: int) -> void:
    var body := JSON.stringify({"name": nama, "score": skor, "level": 3, "durationMs": 60000})
    var req := HTTPRequest.new()
    add_child(req)
    req.request_completed.connect(func(_r, code, _h, data):
        print("status ", code, " -> ", data.get_string_from_utf8()))
    req.request("/api/scores", ["Content-Type: application/json"], HTTPClient.METHOD_POST, body)
```

Pakai path **relatif** (`/api/...`) supaya jalan di preview proxy maupun VPS.

## Kalau nanti mau build Godot di CI

Simpan export template di cache CI, lalu:

```bash
godot --headless --export-release "Web" ../game/dist/index.html
```

Taruh langkah itu di GitHub Actions sebelum langkah `docker build` di
`deploy/Dockerfile` (ganti stage `web` yang sekarang memakai npm).

## Checklist migrasi

- [ ] `godot --headless --export-release` menghasilkan `game/dist/index.html`
- [ ] `.wasm` punya MIME `application/wasm` di server/nginx
- [ ] Ukuran build < 40 MB (kompresi gzip/brotli sudah aktif di `deploy/nginx.conf`)
- [ ] Panggilan API pakai path relatif, bukan `http://localhost:8080`
- [ ] `./scripts/smoke-test.sh https://domain` tetap lolos
