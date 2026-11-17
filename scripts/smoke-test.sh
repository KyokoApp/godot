#!/usr/bin/env bash
# Uji cepat API: health + tulis skor + baca papan skor.
# Pakai: ./scripts/smoke-test.sh [BASE_URL]   (default http://127.0.0.1:8080)
set -Eeuo pipefail
BASE="${1:-http://127.0.0.1:8080}"
say() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }

say "health"
curl -fsS "$BASE/api/health" | tee /tmp/health.json; echo

say "post skor"
curl -fsS -X POST "$BASE/api/scores" \
  -H 'Content-Type: application/json' \
  -d '{"name":"tester","score":1234,"level":4,"durationMs":41234}' | tee /tmp/post.json; echo

say "papan skor"
curl -fsS "$BASE/api/scores?limit=5" | tee /tmp/scores.json; echo

say "validasi: skor negatif harus ditolak (400)"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/scores" \
  -H 'Content-Type: application/json' -d '{"name":"x","score":-5}')
[ "$code" = "400" ] && echo "  ok (400)" || { echo "  GAGAL: dapat $code"; exit 1; }

say "404 untuk endpoint tidak dikenal"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/nope")
[ "$code" = "404" ] && echo "  ok (404)" || { echo "  GAGAL: dapat $code"; exit 1; }

say "semua tes lolos"
