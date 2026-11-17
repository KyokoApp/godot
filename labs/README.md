# labs/ — eksperimen, bukan produk

Folder ini **bukan** fokus project. Disimpan hanya sebagai referensi/eksperimen awal.
Produk yang dikerjakan sekarang: **Little Legions** di `game/` + `server/`.

| Folder | Isi | Status |
| --- | --- | --- |
| `sky-runner-game/` | Demo Phaser 3 + Vite (flappy-style arcade) | arsip, tidak dipakai |
| `sky-runner-server/` | Backend Node + `node:sqlite` untuk demo itu | arsip, tidak dipakai |
| `godot-starter/` | `project.godot` minimal + `PIPELINE.md` (cara ekspor Godot 4 ke web) | referensi |

Menjalankan arsip (kalau perlu):

```bash
cd labs/sky-runner-server && npm start        # set PORT=8081 kalau bentrok
cd labs/sky-runner-game && npm install && npm run dev
```

Kalau tidak dibutuhkan lagi, hapus saja seluruh folder `labs/`:

```bash
git rm -r labs && git commit -m "chore: buang eksperimen yang tidak dipakai"
```
