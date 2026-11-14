# Agent Skills Library (Godot / Game Dev)

Kumpulan skill (format `SKILL.md`) yang diambil dari GitHub untuk membantu agent
membuat game 3D di Godot dengan akurat. Semua sumber di bawah berlisensi MIT
(kecuali `skill-creator` yang Apache 2.0). Setiap folder sumber menyertakan
file `LICENSE` dan `README.md` asli.

## Sumber

| Folder | Repo asal | Commit | Versi Godot | Isi utama |
|---|---|---|---|---|
| `haxqer-godot-skill/godot/` | haxqer/godot-skill (MIT) | `037c03e` | 4.7 | Skill paling lengkap: playbook membuat game 3D (FPS, third-person), template GDScript (`player_third_person_3d.gd`, `player_fps_3d.gd`, state machine, health, inventory, save, dialog), 30+ shader termasuk `outline_3d`, `water_3d`, `triplanar`, `dissolve_3d`, verifikasi spasial 2D/3D, tooling headless, lint, export |
| `vl4dt-godot-skills/` | vl4dt/godot-skills (MIT) | `1ae280d` | 4.7 | 22 skill terfokus: `godot-physics`, `godot-animation`, `godot-performance`, `godot-shaders-vfx`, `godot-architecture`, `godot-gdscript-patterns`, `godot-input`, `godot-networking`, `godot-save-systems`, `godot-ui`, `godot-audio`, `godot-debugging`, `godot-headless-workflow`, `godot-47-migration`, dll. |
| `fetasty-godot-skills/` | fetasty/godot-skills (MIT) | `d52b934` | 4.6 | Skill inti `godot`, plus `godot-gdscript`, `godot-csharp`, `godot-gdextension`, `godot-shader`. Referensi modul: `physics`, `rendering`, `navigation`, `animation`, `input`, `networking`, `audio`, `ui`, dan catatan breaking changes 4.4 → 4.6 |
| `anthropics-skills/skill-creator/` | anthropics/skills (Apache 2.0) | `1780c5e` | - | Skill meta untuk membuat dan mengevaluasi skill baru |

## Rute Tugas (3D)

| Tugas | Baca lebih dulu |
|---|---|
| Proyek 3D baru | `haxqer-godot-skill/godot/SKILL.md` → `scripts/project/scaffold_project.py --preset 3d`, `references/playbooks.md` §12 (3D FPS) |
| Karakter 3D (third-person / FPS) | `templates/gdscript/player_third_person_3d.gd`, `player_fps_3d.gd`, playbook §21, `vl4dt-godot-skills/godot-physics` |
| Fisika (CharacterBody3D, gravity, collision layer) | `vl4dt-godot-skills/godot-physics`, `fetasty-godot-skills/godot/references/modules/physics.md` |
| Animasi (AnimationTree, skeleton) | `vl4dt-godot-skills/godot-animation`, `fetasty-godot-skills/godot/references/modules/animation.md` |
| Navigasi / AI musuh | `fetasty-godot-skills/godot/references/modules/navigation.md`, template `enemy_chase_nav_2d.gd` (pola sama untuk 3D) |
| Shader & VFX 3D | `haxqer-godot-skill/godot/references/shaders.md`, `templates/shaders/*_3d.gdshader`, `vl4dt-godot-skills/godot-shaders-vfx`, `fetasty-godot-skills/godot-shader` |
| Rendering / lighting | `fetasty-godot-skills/godot/references/modules/rendering.md` |
| Performa | `vl4dt-godot-skills/godot-performance` |
| Verifikasi tanpa melihat layar | `haxqer-godot-skill/godot/references/spatial_verification.md`, `automation_api.md` |
| Arsitektur & pola kode | `vl4dt-godot-skills/godot-architecture`, `godot-gdscript-patterns`, `haxqer-godot-skill/godot/references/gdscript_conventions.md` |
| Migrasi Godot 3 → 4 | `haxqer-godot-skill/godot/references/godot3_to_4.md`, `vl4dt-godot-skills/godot-47-migration` |
| Export build | `haxqer-godot-skill/godot/references/export_targets.md` |
| Membuat skill baru | `anthropics-skills/skill-creator/SKILL.md` |

## Catatan Penggunaan

- Versi target utama adalah **Godot 4.7** (haxqer, vl4dt). Jika proyek memakai 4.6,
  rujuk `fetasty-godot-skills` dan cek API dengan `api_lookup.py`.
- Skill ini adalah **dokumentasi dan template**. Skrip Python/GDScript di dalamnya
  hanya dijalankan jika diminta, dan membutuhkan binary `godot` lokal.
- Skrip sudah ditinjau: tidak ada pemanggilan jaringan keluar selain pengecekan
  server lokal (`serve_web.py`), dan tidak ada pola `curl | sh` atau sejenisnya.
- Sengaja **tidak** disertakan: `willnationsdev/godot-skills` (addon Godot 3 2019
  untuk sistem skill RPG, bukan skill agent), `mcp-bridge` dan `.beads` dari vl4dt
  (server MCP dan data issue, di luar cakupan), `examples/` vl4dt (2D), serta
  skill non-game dari anthropics (dokumen, PDF, Excel, frontend) karena tidak relevan
  untuk pembuatan game 3D.
