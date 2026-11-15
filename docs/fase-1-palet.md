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
