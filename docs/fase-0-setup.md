# Fase 0 — Setup Project & Arsitektur Dasar

Status: **file project sudah dibuat, belum diuji di editor Godot maupun di HP.**
Binary Godot tidak tersedia di sandbox tempat agent bekerja (unduhan dari GitHub
Releases diblokir), jadi yang sudah diverifikasi baru sintaks dan referensi
statis. Lihat bagian "Yang sudah diverifikasi" di bawah.

Fase 0.5 (Launcher & sistem update) **belum dimulai**, sesuai instruksi:
tunggu konfirmasi sebelum lanjut.

## Yang dibuat

| File | Fungsi |
|---|---|
| `project.godot` | Konfigurasi project. Renderer **Mobile** (`rendering_method` dan `rendering_method.mobile`), orientasi landscape, stretch `canvas_items`. Scene utama: `World.tscn`. |
| `scenes/World.tscn` | Scene dunia kosong: `WorldEnvironment` dengan `ProceduralSkyMaterial` cerah, `DirectionalLight3D`, `Camera3D` preview di ketinggian mata (1.7 m), placeholder lantai abu-abu polos, dan overlay FPS. |
| `scripts/camera/preview_camera.gd` | Kamera fly sementara (bukan gameplay). Kontrol PC dan sentuhan HP, lihat di bawah. |
| `scripts/debug/fps_overlay.gd` | Label FPS, jumlah draw call, dan renderer yang aktif. Dipakai untuk mencatat performa di HP. |
| `skills/.gdignore` | Mencegah Godot meng-compile folder `skills/` (berisi .gd dari pihak ketiga). |
| `.gitignore` | Mengabaikan `.godot/`, hasil build (`.apk`, `.aab`, `.pck`), dan keystore. |
| Folder | `scenes/`, `scripts/`, `shaders/`, `assets/terrain/`, `assets/grass/`, `assets/road/`, `content_packs/` (sudah ada `.gitkeep`). |

Tidak ada karakter/player model, dan tidak ada aset visual. Placeholder lantai
hanya untuk tes layout, sesuai aturan KEBIJAKAN ASET.

## Kontrol kamera preview

- **PC:** tahan klik kanan + geser mouse untuk melihat; `W A S D` untuk bergerak datar;
  `Q` / `E` turun / naik; `Shift` untuk lebih cepat; scroll untuk ubah kecepatan dasar.
- **HP:** satu jari geser untuk melihat; dua jari geser untuk pan; dua jari cubit untuk maju/mundur.

## Keputusan teknis

- **Renderer Mobile.** Pengaturan default skill `scaffold_project.py` memakai
  Forward+ untuk preset 3D. Itu sengaja tidak dipakai di sini karena prompt meminta Mobile.
- **Fallback Compatibility untuk device lama.** Belum diatur di Fase 0. Pengaturan
  `rendering_method.mobile` hanya berlaku saat build dan tidak memilih renderer
  per device. Perilaku Godot saat Vulkan tidak tersedia di HP lama belum saya verifikasi,
  jadi perlu diuji langsung di HP lama.
  Keputusan ini perlu dikonfirmasi.
- **Versi Godot target 4.7** (tercatat di `config/features`). Jika memakai 4.x lain,
  Godot tetap bisa membuka project, tetapi editor akan menampilkan peringatan versi.

## Cara test (di komputer, lalu di HP)

1. Buka folder repo ini di **Godot 4.7** (Import → pilih `project.godot`).
2. Tekan **F5**. Scene `World.tscn` harus tampil: langit biru cerah, lantai abu-abu,
   dan label FPS di kiri atas.
3. Cek kontrol kamera PC (lihat di atas). Tinggi mata harus terasa sekitar 1.7 m.
4. **Export Android** (belum dicoba, perlu dikerjakan di mesin Anda):
   - Pasang *export templates* 4.7 (Editor → Manage Export Templates).
   - Siapkan JDK, Android SDK, dan *debug keystore* (Editor → Editor Settings → Export → Android).
   - Tambahkan preset Android (Project → Export → Add…). Isi *package name*, dan pastikan
     ikon sudah ada (lihat "Aset yang masih dibutuhkan").
   - Install APK ke HP, jalankan, lalu catat FPS dari overlay saat diam dan saat bergerak.
5. Untuk iOS, export hanya bisa dilakukan dari macOS dengan Xcode.

## Catatan performa

Belum ada data karena belum dijalankan di HP. Kolom ini diisi setelah tes di HP asli:

| Perangkat | Renderer aktif | FPS diam | FPS bergerak | Catatan |
|---|---|---|---|---|
| (isi) | (isi) | (isi) | (isi) | |

## Yang sudah diverifikasi

- Sintaks kedua file GDScript diperiksa dengan parser tree-sitter GDScript: **0 error**.
- Linter statis `lint_project.py` dari skill haxqer (tanpa Godot): **0 error, 0 warning**.
  Linter memeriksa `res://` path, referensi `ext_resource`, dan konfigurasi project.
- Yang **belum** diverifikasi: scene benar-benar termuat, shader (belum ada), tampilan,
  FPS, dan export Android/iOS.

## Aset yang masih dibutuhkan

- **Ikon aplikasi** (Android dan iOS) untuk export. Ini belum dibuat sama sekali, karena
  aturan KEBIJAKAN ASET melarang membuat aset visual sendiri. Silakan tentukan sumber
  ikon, atau saya carikan kandidatnya dulu untuk disetujui.
- Fase 0 tidak membutuhkan tekstur. Tekstur terrain, rumput, dan jalan mulai dibutuhkan
  di Fase 1, 3, dan 4. Saat tiba waktunya, saya akan mencari kandidat dan melaporkannya
  sebelum dipasang.

## Pertanyaan untuk Anda sebelum Fase 0.5

1. Versi Godot yang Anda pakai: 4.7, atau versi lain?
2. Nama package Android (misalnya `com.nama.perusahaan.openworld`)?
3. Apakah Compatibility sebagai fallback untuk device lama sudah cukup diatur lewat
   pengaturan build, atau perlu mekanisme pemilihan renderer saat runtime?
4. Apakah Anda punya perangkat Android untuk tes, dan apakah iOS perlu diuji juga?
