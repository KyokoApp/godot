#!/usr/bin/env python3
"""Pasang addon Terrain3D (MIT) dari GitHub Release resmi ke addons/terrain_3d/.

Addon TIDAK di-commit ke Git (binary besar). Skrip ini dijalankan:
- di CI sebelum import/export Godot, dan
- di mesin lokal sebelum membuka project di editor.

Versi dikunci (pinned) beserta SHA256 dari GitHub Release API, supaya
binary yang dipasang selalu sama dan bisa diverifikasi.
"""
import argparse
import hashlib
import os
import shutil
import sys
import tempfile
import urllib.request
import zipfile

VERSION = "1.1.0-stable"
ASSET = f"Terrain3D_v{VERSION}.zip"
URL = f"https://github.com/TokisanGames/Terrain3D/releases/download/v{VERSION}/{ASSET}"
SHA256 = "51b78bc758f5759cbc8eaaab14e5cf4e8661717e265fdd760f5abf945f15b243"
MARKER = ".terrain3d_version"


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dest", default="addons/terrain_3d")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    marker_path = os.path.join(args.dest, MARKER)
    if not args.force and os.path.isfile(marker_path):
        with open(marker_path, encoding="utf-8") as f:
            if f.read().strip() == VERSION:
                print(f"Terrain3D {VERSION} sudah terpasang di {args.dest}")
                return 0

    with tempfile.TemporaryDirectory() as tmp:
        zip_path = os.path.join(tmp, ASSET)
        print(f"Mengunduh {URL}")
        urllib.request.urlretrieve(URL, zip_path)
        got = sha256_of(zip_path)
        if got != SHA256:
            print(f"ERROR: SHA256 tidak cocok. Diharapkan {SHA256}, dapat {got}", file=sys.stderr)
            return 1
        print("SHA256 cocok")

        extract_dir = os.path.join(tmp, "x")
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(extract_dir)

        # Cari folder yang berisi terrain.gdextension (lokasi layout zip bisa berbeda).
        found = None
        for root, _dirs, files in os.walk(extract_dir):
            if "terrain.gdextension" in files:
                found = root
                break
        if found is None:
            print("ERROR: terrain.gdextension tidak ditemukan di dalam zip", file=sys.stderr)
            return 1

        if os.path.isdir(args.dest):
            shutil.rmtree(args.dest)
        os.makedirs(os.path.dirname(args.dest) or ".", exist_ok=True)
        shutil.copytree(found, args.dest)

    with open(marker_path, "w", encoding="utf-8") as f:
        f.write(VERSION + "\n")

    libs = []
    for root, _d, files in os.walk(os.path.join(args.dest, "bin")):
        libs += [os.path.join(root, x) for x in files]
    android = [x for x in libs if "android" in os.path.basename(x)]
    print(f"Terrain3D {VERSION} terpasang: {len(libs)} library, {len(android)} untuk Android")
    if not android:
        print("ERROR: tidak ada library Android di bin/", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
