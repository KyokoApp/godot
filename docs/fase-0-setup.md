# Fase 0 — Setup Project & Arsitektur Dasar

Status: **file project sudah dibuat, belum diuji di editor Godot maupun di HP.**
Binary Godot tidak tersedia di sandbox tempat agent bekerja, jadi yang sudah
diverifikasi baru sintaks dan referensi statis (lihat bagian "Yang sudah diverifikasi").

Fase 0.5 (Launcher & sistem update) **belum dimulai**. Tunggu konfirmasi sebelum lanjut.

## Identitas aplikasi

| Item | Nilai |
|---|---|
| Nama aplikasi | `vel magic` |
| Package Android | `vel.magic` |
| Versi Godot | **4.7.2** (rilis stabil terbaru, 18 Agustus 2026) |
| Renderer | **Mobile** |
| Target tes | HP Android |

## Yang dibuat

| File | Fungsi |
|---|---|
| `project.godot` | Konfigurasi project: nama `vel magic`, renderer Mobile, landscape, stretch `canvas_items`, scene utama `World.tscn`. |
| `export_presets.cfg` | Preset export **Android** dengan package `vel.magic`, nama `vel magic`, arsitektur arm64-v8a, permission internet. Output: `build/vel-magic.apk`. |
| `scenes/World.tscn` | Scene dunia kosong: WorldEnvironment dengan sky prosedural cerah, DirectionalLight3D, kamera preview setinggi mata (1.7 m), placeholder lantai abu-abu polos (hanya untuk tes layout), dan label FPS. |
| `scripts/camera/preview_camera.gd` | Kamera fly sementara (bukan gameplay). Kontrol sentuh untuk HP. |
| `scripts/debug/fps_overlay.gd` | Label FPS, jumlah draw call, dan renderer yang benar-benar aktif. |
| `skills/.gdignore` | Mencegah Godot meng-compile folder `skills/` yang berisi .gd dari pihak ketiga. |
| `.gitignore` | Mengabaikan `.godot/`, `build/`, hasil export (`.apk`, `.aab`, `.pck`), dan keystore. |
| Folder | `scenes/`, `scripts/`, `shaders/`, `assets/terrain|grass|road/`, `content_packs/` (dengan `.gitkeep`). |

Tidak ada karakter/player model dan tidak ada aset visual. Placeholder lantai hanya untuk tes layout,
sesuai aturan kebijakan aset.

## Kontrol kamera preview di HP

- **Satu jari geser**: melihat sekeliling.
- **Dua jari geser**: geser posisi (pan).
- **Dua jari cubit**: maju / mundur.

(Di PC: klik kanan + geser untuk melihat, WASD untuk bergerak, Q/E turun/naik, Shift lebih cepat.)

## Build APK otomatis (GitHub Actions) — BERHASIL

Workflow: `.github/workflows/android-build.yml`. Jalan otomatis saat push ke `main` atau
`arena/e8cd36e2-godot`, dan bisa dijalankan manual lewat tab **Actions → Android Build → Run workflow**.

- Run pertama yang sukses: https://github.com/KyokoApp/godot/actions/runs/43649591698
- Image: `barichello/godot-ci:4.7.2` (Godot 4.7.2.stable.official).
- Langkah: import project → export debug APK → verifikasi APK → ringkasan manifest → upload artifact.
- Artifact: **`vel-magic-debug-apk`** (berisi `vel-magic.apk`, 28,26 MB). Unduh dari halaman run di atas, bagian *Artifacts*.

Ringkasan APK dari manifest:

| Item | Nilai |
|---|---|
| Package | `vel.magic` |
| Nama aplikasi | `vel magic` |
| Versi | 0.1.0 (code 1) |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 36 (Android 16) |
| Izin | `INTERNET`, `ACCESS_NETWORK_STATE` |
| ABI | arm64-v8a |

Catatan penting:

- **Signing:** keystore debug dibuat sementara di setiap run. Artinya APK dari run yang berbeda
  punya tanda tangan berbeda. Jika APK baru tidak bisa menimpa APK lama di HP, uninstall dulu
  versi lama. Opsi permanen: simpan keystore debug di GitHub Secret (saya bisa siapkan bila Anda mau).
- **Min/Target SDK:** di build non-Gradle, Godot tidak mengizinkan override SDK di preset.
  Nilai 36 di atas berasal dari default template Godot 4.7.2. Override manual perlu *Use Gradle Build*.
- Pesan "Could not find version of build tools that matches Target SDK, using 33.0.2" adalah
  peringatan dan tidak menggagalkan build.

## Cara tes di HP Android

Langkah ini dikerjakan di komputer Anda.

1. **Pasang Godot 4.7.2** (versi standar, bukan .NET) dan buka folder repo ini (`project.godot`).
2. **Pasang komponen Android** (Editor → Manage Export Templates → unduh template 4.7.2):
   - JDK 17 dan Android SDK (Editor → Editor Settings → Export → Android, isi path SDK dan JDK).
   - Debug keystore bisa dibuat otomatis oleh Godot dari pengaturan yang sama.
3. **Aktifkan USB debugging** di HP Android (Pengaturan → Tentang ponsel → ketuk Nomor build 7 kali,
   lalu Opsi pengembang → USB debugging), colokkan HP, dan setujui pesan izin di layar HP.
4. **Jalankan di HP**: di Godot, pilih preset **Android** di kanan atas lalu klik *Remote Debug →
   One-Click Deploy*. Atau export APK ke `build/vel-magic.apk` lalu pasang manual.
5. **Catat FPS** dari label kiri atas saat diam dan saat digeser. Kirim angkanya ke saya.

## Keputusan teknis

- **Renderer Mobile.** Template 3D bawaan skill memakai Forward+. Sengaja tidak dipakai karena prompt meminta Mobile.
- **Fallback Compatibility untuk HP lama belum diatur.** Setting `rendering_method.mobile` hanya berlaku
  saat build dan tidak memilih renderer per perangkat. Perilaku Godot di HP tanpa Vulkan belum saya
  verifikasi, jadi perlu diuji di HP lama. Keputusan ini masih perlu dikonfirmasi.
- **Ikon aplikasi memakai ikon default Godot** sampai ada ikon sendiri (lihat "Aset yang masih dibutuhkan").

## Catatan performa

Belum ada data karena belum dijalankan di HP. Isi setelah tes:

| Perangkat (model, Android versi) | Renderer aktif | FPS diam | FPS bergerak | Catatan |
|---|---|---|---|---|
| Infinix Note 40 (MediaTek Helio G99, RAM 8 GB) | Mobile | ~60 (stabil, laporan user) | ~60 (stabil, laporan user) | Scene kosong: sky, lantai placeholder, kamera |

## Yang sudah diverifikasi

- Sintaks kedua file GDScript diperiksa dengan parser tree-sitter GDScript: **0 error**.
- Linter statis `lint_project.py` dari skill haxqer (tanpa Godot): **0 error, 0 warning**.
  Linter memeriksa `res://` path, referensi `ext_resource`, dan konfigurasi project.
- Versi 4.7.2 dicek dari daftar rilis resmi di GitHub (`godotengine/godot`).
- **APK berhasil di-export di CI** (run 43649591698). Manifest sudah dibaca dan sesuai.
- **Belum diverifikasi:** tampilan di HP, FPS, dan perilaku scene saat berjalan.

## Aset yang masih dibutuhkan

- **Ikon aplikasi** `vel magic` (192×192 untuk launcher, dan ikon adaptif 432×432 untuk Android). Belum ada.
  Aturan kebijakan aset melarang saya membuat ikon sendiri. Silakan tentukan sumbernya, atau saya cari
  kandidatnya dulu untuk Anda setujui.
- Tekstur terrain, rumput, dan jalan dibutuhkan mulai Fase 1, 3, dan 4. Saat tiba waktunya, saya akan
  mencari kandidat dan melaporkannya sebelum dipasang.

## Pertanyaan yang masih terbuka

1. Fallback Compatibility untuk HP lama: cukup lewat setting build (sesuai jawaban prompt tambahan, renderer dipilih di build settings, bukan saat runtime).
2. Keystore debug: tetap sementara per run, atau dibuat permanen lewat GitHub Secret supaya APK bisa saling menimpa?

## Fase 0.5 — Launcher & sistem update (GitHub Releases)

Base APK hanya berisi kode. Konten dikemas sebagai `.pck` dan diunduh saat runtime.

**Alur app:** `Launcher.tscn` (scene utama) → ambil `manifest.json` → bandingkan SHA256 dengan paket terpasang → unduh paket berubah (chunk 4 MB dengan `Range`, lanjut dari `.part`) → validasi SHA256 → `load_resource_pack` → hapus versi lama setelah versi baru termuat → pindah ke dunia. Jika jaringan gagal, tombol "Coba lagi" dan "Main offline" (memakai paket terpasang).

**Komponen:**
- `scripts/update/update_logic.gd` — validasi manifest, diff paket, format MB (logika murni, teruji).
- `scripts/update/update_manager.gd` — autoload `UpdateManager`.
- `scripts/launcher/launcher.gd`, `scenes/Launcher.tscn` — splash, tips, progress, konfirmasi jika unduhan > 50 MB, cek ruang penyimpanan.
- `content/packs.json` — daftar paket (sumber). `tools/build_content.py` — ekspor `.pck` + `manifest.json`.
- Preset `Content World` di `export_presets.cfg` → `build/packs/world.pck`. Preset `Android` mengecualikan `World.tscn`, `tests/*`, `tools/*`, `content/*`, `docs/*`.

**URL manifest:** `https://github.com/KyokoApp/godot/releases/download/content-latest/manifest.json`

**CI:** `.github/workflows/content-packs.yml`
- Job `update-tests`: menjalankan `tests/update_tests.gd` headless terhadap `tests/range_server.py` (127.0.0.1:8080). Hasil terakhir: **34 passed, 0 failed** (run `43650888018`).
- Job `publish-content`: hanya jika tes lolos. Ekspor paket, lalu upload ke release pre-release `content-latest` (`--clobber`). Asset terakhir: `manifest.json` dan `world-0.1.0-45fc79dcb218.pck` (8.856 byte).

**Catatan versi:** setiap perubahan konten wajib menaikkan `version` di `content/packs.json`. Paket dengan SHA256 sama tidak diunduh ulang.

### Tes wajib di HP (dilakukan user)
1. **Install awal:** pasang APK baru, buka app saat internet aktif. Launcher harus mengunduh `world` lalu masuk ke dunia.
2. **Update satu paket:** naikkan versi `world` di `content/packs.json`, push, tunggu job `publish-content`. Buka app lagi, progress harus menampilkan unduhan dan dunia termuat dengan versi baru.
3. **Putus koneksi di tengah download:** matikan Wi-Fi/data saat progress berjalan. Harus muncul pesan gagal dengan tombol "Coba lagi". Nyalakan koneksi lalu tekan "Coba lagi": unduhan harus lanjut, bukan mulai dari nol. Opsional: tekan "Main offline" dan pastikan dunia terpasang tetap bisa dibuka.

### Status verifikasi Fase 0.5
- Parser GDScript (tree-sitter): 0 error.
- `lint_project.py`: 0 error, 0 warning.
- Tes headless di CI: 34/34 lolos (diff, install, resume, hash rusak, offline, manifest hilang).
- Export APK (`43650888022`) dan publish release: sukses.
- Belum diuji di HP.
