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
| (isi) | (isi) | (isi) | (isi) | |

## Yang sudah diverifikasi

- Sintaks kedua file GDScript diperiksa dengan parser tree-sitter GDScript: **0 error**.
- Linter statis `lint_project.py` dari skill haxqer (tanpa Godot): **0 error, 0 warning**.
  Linter memeriksa `res://` path, referensi `ext_resource`, dan konfigurasi project.
- Versi 4.7.2 dicek dari daftar rilis resmi di GitHub (`godotengine/godot`).
- **Belum diverifikasi:** scene termuat di editor, tampilan, FPS, dan export APK.

## Aset yang masih dibutuhkan

- **Ikon aplikasi** `vel magic` (192×192 untuk launcher, dan ikon adaptif 432×432 untuk Android). Belum ada.
  Aturan kebijakan aset melarang saya membuat ikon sendiri. Silakan tentukan sumbernya, atau saya cari
  kandidatnya dulu untuk Anda setujui.
- Tekstur terrain, rumput, dan jalan dibutuhkan mulai Fase 1, 3, dan 4. Saat tiba waktunya, saya akan
  mencari kandidat dan melaporkannya sebelum dipasang.

## Pertanyaan yang masih terbuka

1. Fallback Compatibility untuk HP lama: cukup lewat setting build, atau perlu pemilihan renderer saat runtime?
