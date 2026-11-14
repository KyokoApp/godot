#!/usr/bin/env python3
"""Server file statis dengan dukungan HTTP Range (206), untuk tes download bertahap.

Dipakai oleh CI (.github/workflows/content-packs.yml). Mencatat setiap request ke stdout.
"""
import argparse
import os
import re
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

ROOT = "."


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        rel = self.path.split("?", 1)[0].lstrip("/")
        path = os.path.join(ROOT, rel)
        if not os.path.isfile(path):
            self.send_error(404)
            print(f"GET {self.path} -> 404", flush=True)
            return
        size = os.path.getsize(path)
        start, end, code = 0, size - 1, 200
        rng = self.headers.get("Range")
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)$", rng.strip())
            if m:
                start = int(m.group(1)) if m.group(1) else 0
                end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
                if start >= size:
                    self.send_error(416)
                    print(f"GET {self.path} range={rng} -> 416", flush=True)
                    return
                code = 206
        length = end - start + 1
        self.send_response(code)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        if code == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        with open(path, "rb") as f:
            f.seek(start)
            self.wfile.write(f.read(length))
        print(f"GET {self.path} range={rng} -> {code} ({length} bytes)", flush=True)

    def log_message(self, fmt, *args):
        pass


def main() -> None:
    global ROOT
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--dir", required=True)
    args = ap.parse_args()
    ROOT = args.dir
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"serving {ROOT} on 127.0.0.1:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
