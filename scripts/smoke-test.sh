#!/usr/bin/env bash
# Uji cepat server Little Legions: health, index, loader, potongan wasm.
# Pakai: ./scripts/smoke-test.sh [BASE_URL]   (default http://127.0.0.1:8080)
set -Eeuo pipefail
BASE="${1:-http://127.0.0.1:8080}"
say() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m  GAGAL: %s\033[0m\n' "$*"; exit 1; }

say "health"
curl -fsS "$BASE/api/health" || fail "health tidak merespons"
echo
curl -fsS "$BASE/api/health" | grep -q '"gameReady":true' || fail "build game tidak terdeteksi (gameReady=false)"

say "halaman game"
title=$(curl -fsS "$BASE/" | grep -o '<title>[^<]*</title>' || true)
[ "$title" = "<title>Little Legions</title>" ] || fail "index.html tidak sesuai: $title"
echo "  $title"

say "unity loader"
curl -fsS -o /dev/null -w "  loader %{http_code} %{content_type}\n" "$BASE/Build/WebBuild.loader.js"

say "wasm (harus utuh, byte pertama \\0asm)"
first=$(curl -fsS -r 0-3 "$BASE/Build/WebBuild.wasm.unityweb" | head -c 4 | od -An -tx1 | tr -d ' \n')
[ "$first" = "0061736d" ] || fail "wasm tidak utuh (awal: $first)"
echo "  header wasm ok ($first)"

say "range request (206)"
code=$(curl -s -o /dev/null -w '%{http_code}' -r 0-1023 "$BASE/Build/WebBuild.wasm.unityweb")
[ "$code" = "206" ] || fail "range tidak didukung (dapat $code)"
echo "  ok (206)"

say "tidak ada kredensial bocor di html"
if curl -fsS "$BASE/" | grep -qE 'ghp_|GIST_ID'; then fail "masih ada token/gist di index.html"; fi
echo "  bersih"

say "404 untuk endpoint API tak dikenal"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/nope")
[ "$code" = "404" ] || fail "dapat $code"
echo "  ok (404)"

say "semua tes lolos"
