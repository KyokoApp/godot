#!/usr/bin/env python3
"""Ukur palet warna dari screenshot referensi (mis. screenshot game milik user).

Hanya menulis angka hex + persentase ke stdout / JSON. Gambar sumber TIDAK
disalin ke repo. Gunakan screenshot sendiri, simpan di luar repo (mis. /tmp).

Contoh:
  python3 tools/sample_palette.py shot_rumput_siang.png --colors 8 --label rumput_siang
"""
import argparse
import json
import sys

from PIL import Image


def sample(path: str, colors: int, label: str, sample_size: int) -> dict:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    scale = min(1.0, sample_size / max(w, h))
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    q = img.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[: colors * 3]
    counts = sorted(q.getcolors(), reverse=True)  # (count, index)
    total = sum(c for c, _ in counts)
    out = []
    for count, idx in counts:
        r, g, b = pal[idx * 3: idx * 3 + 3]
        out.append({"hex": "#%02x%02x%02x" % (r, g, b), "percent": round(100.0 * count / total, 1)})
    return {"label": label, "source_size": [w, h], "colors": out}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--colors", type=int, default=8)
    ap.add_argument("--label", default="")
    ap.add_argument("--sample-size", type=int, default=800)
    a = ap.parse_args()
    res = sample(a.image, a.colors, a.label or a.image, a.sample_size)
    json.dump(res, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
