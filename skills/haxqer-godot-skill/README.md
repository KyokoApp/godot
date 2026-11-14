# Godot Skill

Portable Godot project development, debugging, architecture, content-integration, and export skill for Codex-style skill loaders. Designed for Godot 4.7 and compatible with Godot 4.x.

The distributable skill payload lives in [`skill/godot/`](skill/godot/). That folder is kept minimal on purpose so it can be copied directly into a skills directory or packaged for release without GitHub-specific files.

## Repository Layout

- `skill/godot/`: the actual skill payload
- `scripts/package_skill.sh`: builds a release zip with a top-level `godot/` folder
- `scripts/run_tests.sh`: runs every module in `tests/`, exiting non-zero if any fails
- `scripts/run_tests_linux.sh`: runs that same suite inside the CI image, for Linux parity from a Mac
- `ci/Dockerfile`: the Ubuntu + python 3.12 + Xvfb + Godot image the Linux runner uses
- `.github/workflows/ci.yml`: installs Godot, runs the suite, and attaches `godot.zip` to a tagged release
- `README.md`: repository documentation for GitHub users

## Build A Release Package

```bash
./scripts/package_skill.sh
```

This writes:

- `dist/godot/`: staged skill payload
- `dist/godot.zip`: release archive ready to install

`dist/` is a build output and is deliberately not tracked in git — it would
duplicate every byte of `skill/godot/` and add a binary that churns on each edit.
The archive is published as a GitHub Release asset instead.

## Continuous Integration

`.github/workflows/ci.yml` runs on pushes to `main`, on pull requests, and on
`v*` tags:

- **test** — installs the pinned Godot build (`GODOT_VERSION` in the workflow)
  plus Xvfb and a software GL stack, confirms both that the binary runs and that
  it can render a non-blank frame, then runs `./scripts/run_tests.sh`. The
  Godot-backed tests skip themselves when the binary is missing, and the
  real-render ones skip when no frame can be produced, so those two checks are
  what keep a broken environment from turning the suite into a silent pass.
- **package** — builds the archive and verifies its contents (expected entries
  present, no `__pycache__`/`.pyc`/`.DS_Store`), then uploads it as a workflow
  artifact so a pull request can be checked before tagging.
- **release** — on a `v*` tag only, attaches `dist/godot.zip` to the matching
  GitHub Release, creating the release if it does not exist yet.

To cut a release: push a `v*` tag. Keep `GODOT_VERSION` in step with the version
the skill is verified against.

Run the same checks locally with:

```bash
./scripts/run_tests.sh
```

## Run The Suite On Linux Locally

`./scripts/run_tests.sh` runs on whatever host you are on; CI runs it on Ubuntu
with python 3.12 under Xvfb. `scripts/run_tests_linux.sh` reproduces that second
environment on any machine with Docker, so a case-sensitive-filesystem or
software-GL failure is found before it reaches CI:

```bash
./scripts/run_tests_linux.sh                                  # the whole suite
./scripts/run_tests_linux.sh tests/test_move_resource.py      # one test
./scripts/run_tests_linux.sh --rebuild                        # force an image rebuild
./scripts/run_tests_linux.sh --shell                          # poke around inside the image
./scripts/run_tests_linux.sh --platform linux/amd64           # x86_64 pass on an arm64 host
```

It builds `ci/Dockerfile` (Ubuntu 24.04, python 3.12, Mesa software GL so the
Compatibility renderer works without a GPU, and the Godot editor build pinned by
the `GODOT_VERSION` build arg), then runs the exact CI command:
`xvfb-run -a --server-args="-screen 0 1280x720x24" ./scripts/run_tests.sh`.
Before that, again exactly as CI does, it runs `scripts/confirm_framebuffer.sh`
under the same Xvfb, so an image that cannot render says so instead of reporting
a green suite in which every real-render test skipped itself. The image is
cached after the first build. Your checkout is mounted read-only and
copied inside the container, and `PYTHONDONTWRITEBYTECODE=1` is set, so a run
cannot leave anything behind in your working tree. The script exits with the
suite's status. The checkout has to live on a path your Docker VM shares (colima
shares only your home directory by default); anywhere else mounts as an empty
directory, and the script stops with a message saying so instead of failing
with "not found".

## Install

### From Source

Copy [`skill/godot/`](skill/godot/) into your skills directory so the final installed folder name is `godot`.

### From A Release Zip

Unzip `dist/godot.zip` into your skills directory. The archive already contains a top-level `godot/` folder.

## Notes

- The skill payload itself intentionally excludes a `README.md` so it stays aligned with skill packaging guidance.
- The bundled dispatcher fallback now supports full scene editing workflows: batch scene transactions, node configuration, `Control` layout and theme overrides, script attachment, signal wiring, hierarchy refactors, and `build_sprite_frames` for `AnimatedSprite2D` frame animation, in addition to the original skeleton-building helpers.
- The skill can run a project headlessly and turn the Godot debugger's runtime errors into structured, fixable diagnostics (`scripts/debug/run_project.py` + `godot_log_parser.py`), plus a `check_project` operation that statically validates every script, scene, shader, and resource. See `skill/godot/references/debugging.md`.
- The skill includes content-integration and architecture guidance: an art/asset pipeline with a chroma-key cutout helper (`scripts/assets/chroma_key_cutout.py`, see `references/asset_pipeline.md`) and QFramework-style architecture references (`references/architecture_qframework_lite.md`, `references/architecture_templates.md`).
- The skill includes structured project/scene/resource inspection, transactional Resource and ProjectSettings editing (including builder-method calls for method-driven resources), import/reimport auditing, and environment capability probes.
- Content authoring ops cover `TileSet` building plus `TileMapLayer` cell painting, spritesheet-sliced `SpriteFrames` with per-frame durations, declarative `AnimationPlayer` keyframe clips, and `AudioBusLayout` routing; `scripts/test/run_tests.py` runs GUT/GdUnit4 suites headlessly.
- Validation covers GDScript, C#, GDExtension, and editor plugins; deterministic scenarios can inject input, assert node state and logs, capture screenshots, and enforce performance thresholds.
- The export wrapper includes preset/environment preflight, pack and patch modes, plus guidance for Android, iOS, Web, Windows, Linux, macOS, dedicated server, and visionOS builds.
- The scene editing, runtime, and diagnostics APIs are designed against the current stable Godot docs and verified locally on Godot `4.7` (compatible with Godot 4.x).
- Built for weak models and models without vision: `scripts/debug/lint_project.py` is a Godot-free static linter (Godot 3 → 4 API renames with the exact replacement, `:=` reads that will not parse, `$Path`/`%Name`/`[connection]` references that do not resolve in the attached scene, missing `ext_resource`/autoload files) with a matching `references/godot3_to_4.md` table; a `help` dispatcher operation prints every operation's curated parameter schema, example, and runnable command; `paint_tilemap`/`paint_gridmap` accept ASCII maps and `inspect_tilemap` reads them back; `inspect_image` and scenario `screenshot` steps describe images as numbers and ASCII with pass/fail `expect` gates; scenario `dump_tree` and `ui_report` `ascii` make runtime state and layout readable as text; `templates/gdscript/` holds twenty warning-free GDScript templates and `references/playbooks.md` twelve literal, verified step-by-step recipes; and `resource_batch`/typed JSON `__script` author a project's own `class_name X extends Resource` data.
- The Godot-free linter now also covers Godot 3 shader names (each rule verified by compiling before and after on 4.7), undefined input actions, groups nothing joins, `res://` literals that are not on disk (case-sensitively) and unknown animation names, with `# lint:ignore <category>` suppressions and `.gdignore` support; `run_scenario.py` fails a scenario whose log carries a script or engine error even when every assertion passed.
- Closes the silent-failure loop: `check_project` re-derives the editor's node configuration warnings (a body with no shape, a sprite with no frames, a `PathFollow2D` under the wrong parent, …) over every instantiated scene, each with a runnable fix, surveys physics layers and masks project-wide, and fails a shader that does not compile; the dispatcher rejects a parameter that belongs to a different operation, an inline resource property written outside `properties`, and a colour string that is not a colour; engine shutdown bookkeeping (`resources still in use at exit` from looping music) is filed as `info`, so a game with a soundtrack no longer fails its runs.
- Look the API up instead of remembering it: `scripts/docs/api_lookup.py` answers from the installed engine's own `--doctool` dump (classes, inherited members, Variant types, globals, theme items, Godot 3 → 4 hints), and the `run_gdscript` operation runs a snippet, an expression or one project function inside the engine.
- Make assets from nothing: `draw_image` turns ASCII rows and shapes into sprites, frame sheets, tilesets and 9-patch panels and reads them back character for character; `process_image` cleans generated art (`remove_background`, `pixelate`, `quantize`, `pack_frames`, …); `scripts/assets/make_sfx.py` (20 sfxr-style presets) and `scripts/assets/make_music.py` (looping chiptune tracker) synthesize audio with the python standard library; `inspect_audio` verifies sound as numbers, an ASCII envelope and `expect` gates; `templates/shaders/` holds 24 `.gdshader` templates whose effects are proven by pixels in the test suite.
- Test and explore without eyes: a zero-install unit-test framework (`scripts/test/run_tests.py --init-mini`) in which a test killed by a runtime error can never read as green; `scripts/debug/smoke_scenes.py` boots every scene in its own process with seeded input fuzzing and leak/hang/crash findings; the scenario step `spatial_report` reports 2D/3D world placement, camera visibility, bodies embedded in the floor and missing cameras/lights, with a top-down ASCII map.
- Both ends of the lifecycle: `scripts/project/scaffold_project.py` writes a project that validates with zero warnings; `add_export_preset` + `scripts/export/export_project.py` + `scripts/export/serve_web.py --check` produce and check real Web/Windows/Linux/macOS builds without ever opening the editor; `scripts/project/move_resource.py` moves or renames files and rewrites every reference.
- `templates/gdscript/` now holds 42 templates (inventory, loot, branching dialogue, settings and input remap, collectibles, checkpoints, moving platforms, projectiles, wave spawner, nav-agent chaser, sokoban grid movement, third-person 3D, …) and `references/playbooks.md` 22 literal recipes, including four complete small games; `tests/test_playbooks_replay.py` replays every recipe in a fresh project. `help '{}'` lists every operation and every python tool with a runnable command.
- The bundled dispatcher fallback and runtime runner require a local `godot` CLI with shell access.
