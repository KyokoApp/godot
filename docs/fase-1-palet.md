# Fase 1 — Palet warna acuan

**Tujuan:** warna terrain, rumput, jalan, dan langit harus mengikuti warna in-game, bukan tebakan.

**Yang TIDAK dipakai sebagai acuan:** palet dari situs wallpaper dan ilustrasi fans (misalnya ColorsWall). Palet itu buatan orang lain, bukan hasil ukur dari game.

## Cara mengukur (dengan screenshot milik user)
1. User mengambil screenshot dari game di HP sendiri, di lokasi dan jam yang sama. Catat lokasi dan jam in-game.
2. Screenshot disimpan di luar repo (mis. `/tmp/palet/`). Gambar game tidak di-commit.
3. Jalankan `python3 tools/sample_palette.py <file> --colors 8 --label <nama>`. Hasilnya hanya angka hex dan persentase.
4. Angka hex dicatat di `docs/fase-1-palet.md` lalu dipakai untuk shader dan material.

Alat ini sudah diuji dengan gambar uji buatan sendiri: warna `#468c3c` dan `#78b4e6` terbaca tepat.

## Daftar screenshot yang dibutuhkan
| # | Objek | Lokasi/jam yang disarankan | Catatan |
|---|-------|----------------------------|---------|
| 1 | Rumput lapang | siang, cuaca cerah | isi layar penuh rumput, tanpa karakter |
| 2 | Langit | siang dan sore | arahkan ke langit biru tanpa awan tebal |
| 3 | Jalan tanah atau batu | siang | |
| 4 | Batu/tebing | siang | |
| 5 | Daun pohon | siang | |
| 6 | Bayangan di tanah | siang | untuk menilai warna shadow |

Sebaiknya ambil juga sekali di sore hari, karena warna in-game berubah sesuai jam.

## Catatan batas
- Warna screenshot sudah terkena post-processing game (tone mapping, bloom). Angka ini adalah warna tampilan, bukan warna albedo asli. Itu tetap yang dibutuhkan untuk meniru tampilan.
- Tidak ada aset dari game (tekstur, model) yang diambil. Hanya warna yang diukur.

## Hasil ukur #1 (2 screenshot yang dikirim user, perkiraan awal)
Gambar sumber tidak disalin ke repo. Angka di bawah dari potongan area tertentu (karakter dan UI dikecualikan), 5 warna dominan per area.

**Foto A: adegan siang/sore, tepi laut dan rumput.** Ini acuan paling relevan untuk siang hari.
| Area | Warna dominan (persentase) |
|------|----------------------------|
| Langit dekat matahari | `#fdebb1` (25%), `#f4dcad` (24%), `#dac7aa` (22%), `#fefaae` (18%) |
| Laut | `#70959c` (29%), `#5d848e` (22%), `#87a5a5` (21%), `#a3b9af` (17%) |
| Rumput depan | `#8dc032` (34%), `#a0d03b` (22%), `#b5d83f` (18%), `#66962b` (15%) |
| Batu/tebing | `#628b86` (30%), `#42616b` (22%), `#96ad7b` (20%) |

**Foto B: adegan malam, tidak mewakili siang.** Dipakai hanya untuk referensi warna malam. Ada filter biru dan kemungkinan diambil dari layar, jadi angkanya belum bisa dipercaya penuh.
| Area | Warna dominan |
|------|---------------|
| Langit malam | `#021a6d`, `#032076`, `#042982`, `#378acf` |
| Rumput | `#03796d` (42%), `#066c7d`, `#073d93`, `#16919f` |
| Bukit | `#055193`, `#0444a0`, `#023699`, `#126ec5` |

**Status:** perkiraan awal. Belum final. Akurasi akan naik kalau user mengirim screenshot langsung dari HP, dengan jam in-game yang dicatat (lihat daftar di atas).

## Aset dunia dari user: Stylized Nature MegaKit Standard (Quaternius)
- **Lisensi:** CC0 1.0 (file `License_Standard.txt` di dalam zip). Bebas dipakai, termasuk komersial.
- **Isi versi gratis:** 68 dari 116 model. Termasuk rumput (`Grass_Common_*`, `Grass_Wispy_*`), jalur batu (`RockPath_*`), dan batu. Format FBX, glTF, OBJ.
- **Status unduhan:** zip dari Google Drive (104.088.529 byte) **rusak**. 16 file gagal CRC atau header tidak valid, termasuk `Textures/Grass.png` (tekstur rumput utama). File yang lolos CRC (`PathRocks_Diffuse.png`, `Rocks_Diffuse.png`, `Rocks_Desert_Diffuse.png`, preview) utuh. Zip tidak disimpan di repo.

### Palet dari kit (perkiraan, sudah dipengaruhi cahaya di preview)
Dari `Preview_1.jpg` (render resmi kit):
| Area | Warna dominan |
|------|---------------|
| Tanah jalan (terang) | `#c7b84e`, `#cac151`, `#ddcb75` |
| Tanah jalan (bayangan) | `#968935` |
| Rumput depan | `#8bb602`, `#a2c806`, `#618a02` |
| Rumput tengah | `#9ac32c`, `#bccc49` |

Dari tekstur asli (warna albedo, lebih akurat):
| Tekstur | Warna dominan |
|---------|---------------|
| `Rocks_Desert_Diffuse.png` (batu cokelat) | `#a76f33`, `#965f2a`, `#bf8945`, `#cd9c52` |
| `PathRocks_Diffuse.png` (jalur batu) | `#2c371a`, `#374817`, `#4f5d39`, `#687452`, `#8c8e8c` |
| `Rocks_Diffuse.png` (batu abu) | `#33401a`, `#3f4d28`, `#515b47`, `#606856` |

**Status:** belum final. Tekstur `Grass.png` belum bisa dibaca karena rusak, jadi warna rumput masih berasal dari preview. Perlu file zip yang utuh untuk pengukuran albedo rumput.

## Update: zip kit versi utuh (Drive ID berbeda: `1tW_D9…`)
- **Integritas:** MD5 cocok dengan checksum Drive (`a49a8b80d12f72b2d7f3082fba566c8d`). Semua 454 file lolos CRC. Zip sebelumnya rusak karena salah unduh, sedangkan file ini utuh.
- **Lisensi:** CC0 1.0 (`License_Standard.txt`).
- Zip tidak disimpan di repo.

### Palet dari tekstur asli kit
**`Textures/Grass.png`** (512×512, alpha penuh; latar putih ~78% diabaikan). Warna dari piksel non-putih:
| Warna | Persentase | Peran |
|-------|-----------|-------|
| `#589808`, `#58a808`, `#68a808`, `#087808` | ~20% | hijau rumput utama |
| `#c85808`, `#a85808`, `#b85808` | ~25% | cokelat-oranye (ujung rumput kering) |
| `#a88808`, `#b8a808`, `#b89808` | ~17% | kuning-zaitun |

**`Textures/Rocks_Desert_Diffuse.png`** (batu cokelat): `#a76f33`, `#965f2a`, `#bf8945`, `#cd9c52`.

### Arah warna tanah (usulan, belum divalidasi di HP)
Tanah harus sedikit lebih redup dan kurang jenuh dibanding rumput, supaya helai rumput tetap terbaca di atasnya. Usulan awal, dipilih dari rentang di atas:
- Tanah dasar (olive): sekitar `#7a7a2e` sampai `#8f8a3e`
- Tanah jalan/cokelat: sekitar `#a88a4a` sampai `#b08c50`, diambil dari rentang batu cokelat yang diredupkan
- Area dekat rumput: campuran dengan `#589808` tipis, sekitar 10–15%

Angka ini belum diuji di layar. Validasinya dilakukan dengan screenshot di HP.

## Aset terpasang (tahap 1: rumput + satu pohon)
Dari Stylized Nature MegaKit Standard (Quaternius, CC0 1.0). Lisensi: `assets/LICENSE_stylized_nature_megakit.txt`.
- **Rumput:** `assets/grass/Grass_Common_Short.gltf` (+ `.bin`, `Grass.png`). Tekstur rumput kit, disalin dari `glTF/Grass.png`.
- **Pohon:** `assets/trees/CommonTree_1.gltf` (+ `.bin`, tiga tekstur: bark, bark normal, daun). Sekitar 8,7 MB, sebagian besar dari tekstur bark.

Belum dipasang ke scene. Penempatan (rumput di terrain, pohon sebagai objek) dikerjakan setelah terrain siap. Pohon lain dan batu menunggu keputusan user.

Catatan: `.import` dibuat oleh Godot saat import pertama dan tidak di-commit. CI (`--import`) akan membuatnya di runner.
