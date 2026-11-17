#!/usr/bin/env bash
# Uji cepat Sky Legion Live: health, halaman game, join lewat chat, WebSocket.
# Pakai: ./scripts/smoke-test.sh [BASE_URL]   (default http://127.0.0.1:8080)
set -Eeuo pipefail
BASE="${1:-http://127.0.0.1:8080}"
say() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m  GAGAL: %s\033[0m\n' "$*"; exit 1; }

say "health"
curl -fsS "$BASE/api/health" || fail "server tidak merespons"
echo

say "halaman game"
title=$(curl -fsS "$BASE/" | grep -o '<title>[^<]*</title>' || true)
[ "$title" = "<title>Sky Legion Live — arena TikTok</title>" ] || fail "index.html tidak sesuai: $title"
echo "  $title"

say "komentar join -> petarung baru"
before=$(curl -fsS "$BASE/api/state" | grep -o '"fighters":[0-9]*' | head -1 | cut -d: -f2)
curl -fsS -X POST "$BASE/api/mock/chat" -H 'Content-Type: application/json' \
  -d '{"user":"smoke","text":"join"}' >/dev/null
after=$(curl -fsS "$BASE/api/state" | grep -o '"fighters":[0-9]*' | head -1 | cut -d: -f2)
[ "$after" -gt "$before" ] 2>/dev/null || fail "join tidak menambah petarung ($before -> $after)"
echo "  petarung: $before -> $after"

say "ganti senjata"
curl -fsS -X POST "$BASE/api/mock/chat" -H 'Content-Type: application/json' \
  -d '{"user":"smoke","text":"tombak"}' | grep -q '"weapon":"tombak"' || fail "ganti senjata gagal"
echo "  ok"

say "websocket mengirim tick"
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('${BASE}'.replace('http','ws') + '/ws');
let ticks = 0, hits = 0;
ws.on('message', (d) => { const m = JSON.parse(d); if (m.type==='tick') ticks++; if (m.type==='hit') hits++; });
ws.on('error', (e) => { console.error(e.message); process.exit(1); });
setTimeout(() => { ws.close(); if (ticks < 3) { console.error('tick terlalu sedikit: ' + ticks); process.exit(1); } console.log('  tick ' + ticks + ', hit ' + hits); process.exit(0); }, 3000);
" || fail "websocket tidak jalan"

say "404 untuk endpoint tak dikenal"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/nope")
[ "$code" = "404" ] || fail "dapat $code"
echo "  ok (404)"

say "semua tes lolos"
