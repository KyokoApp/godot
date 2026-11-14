#!/usr/bin/env python3
"""Ekspor paket konten (.pck) dari content/packs.json dan buat manifest.json.

Dipakai oleh GitHub Actions (.github/workflows/content-packs.yml).

Contoh lokal (jika binary godot tersedia):
  python3 tools/build_content.py --godot godot --out build/packs \
      --base-url https://github.com/KyokoApp/godot/releases/download/content-latest/

Di CI: --docker-image barichello/godot-ci:4.7.2 (godot dijalankan di dalam container).
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import shutil
import subprocess
import sys


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def run_godot(args, godot, docker_image, project, out_dir):
    if docker_image:
        cmd = [
            "docker", "run", "--rm",
            "-v", f"{project}:/project",
            "-v", f"{out_dir}:/out",
            "-w", "/project",
            docker_image,
            "godot",
        ] + args
    else:
        cmd = [godot] + args
    print("+ " + " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default=".", help="folder project Godot")
    ap.add_argument("--packs-json", default="content/packs.json")
    ap.add_argument("--out", default="build/packs")
    ap.add_argument("--base-url", required=True, help="URL folder tempat file dipublikasikan (diakhiri /)")
    ap.add_argument("--godot", default="godot")
    ap.add_argument("--docker-image", default="")
    args = ap.parse_args()

    project = os.path.abspath(args.project)
    out_dir = os.path.abspath(args.out)
    shutil.rmtree(out_dir, ignore_errors=True)
    os.makedirs(out_dir, exist_ok=True)

    with open(os.path.join(project, args.packs_json), encoding="utf-8") as f:
        spec = json.load(f)

    # Impor sekali dulu supaya resource sudah siap untuk ekspor.
    run_godot(["--headless", "--path", "/project" if args.docker_image else project, "--import"],
              args.godot, args.docker_image, project, out_dir)

    base_url = args.base_url if args.base_url.endswith("/") else args.base_url + "/"
    entries = []
    for pack in spec["packs"]:
        name, version, preset = pack["name"], pack["version"], pack["preset"]
        tmp_name = f"{name}-tmp.pck"
        in_container = "/out/" + tmp_name if args.docker_image else os.path.join(out_dir, tmp_name)
        run_godot(["--headless", "--path", "/project" if args.docker_image else project,
                   "--export-pack", preset, in_container],
                  args.godot, args.docker_image, project, out_dir)

        tmp_path = os.path.join(out_dir, tmp_name)
        if not os.path.isfile(tmp_path):
            print(f"ERROR: paket '{name}' tidak terbentuk", file=sys.stderr)
            return 1
        digest = sha256_of(tmp_path)
        final_name = f"{name}-{version}-{digest[:12]}.pck"
        final_path = os.path.join(out_dir, final_name)
        os.replace(tmp_path, final_path)
        entries.append({
            "name": name,
            "version": version,
            "url": base_url + final_name,
            "sha256": digest,
            "size": os.path.getsize(final_path),
        })
        print(f"packed {final_name}: {os.path.getsize(final_path)} bytes", flush=True)

    manifest = {
        "manifest_version": 1,
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "packs": entries,
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
