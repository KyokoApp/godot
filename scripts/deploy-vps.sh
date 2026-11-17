#!/usr/bin/env bash
# Deploy Little Legions ke VPS lewat SSH (tanpa Docker).
#   VPS_HOST=user@1.2.3.4 ./scripts/deploy-vps.sh
# Opsional: VPS_PORT=22  VPS_DIR=/opt/little-legions
set -Eeuo pipefail

: "${VPS_HOST:?set VPS_HOST, contoh: VPS_HOST=root@203.0.113.10 ./scripts/deploy-vps.sh}"
VPS_PORT="${VPS_PORT:-22}"
VPS_DIR="${VPS_DIR:-/opt/little-legions}"
SSH=(ssh -p "$VPS_PORT" -o StrictHostKeyChecking=accept-new "$VPS_HOST")
say() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }

say "1/5 siapkan direktori & user di VPS ($VPS_DIR)"
"${SSH[@]}" "sudo mkdir -p '$VPS_DIR/game' '$VPS_DIR/server' \
  && sudo chown -R \$(id -u):\$(id -g) '$VPS_DIR' \
  && (id -u littlelegions >/dev/null 2>&1 || sudo useradd --system --home '$VPS_DIR' --shell /usr/sbin/nologin littlelegions)"

say "2/5 kirim build game (±98 MB, sekali saja — aset jarang berubah)"
if command -v rsync >/dev/null; then
  rsync -az --delete --info=progress2 -e "ssh -p $VPS_PORT" game/ "$VPS_HOST:$VPS_DIR/game/"
  rsync -az -e "ssh -p $VPS_PORT" server/ package.json "$VPS_HOST:$VPS_DIR/server_tmp/" 2>/dev/null || {
    rsync -az -e "ssh -p $VPS_PORT" server/ "$VPS_HOST:$VPS_DIR/server/"
    rsync -az -e "ssh -p $VPS_PORT" package.json "$VPS_HOST:$VPS_DIR/package.json"
  }
else
  tar -C game -czf - . | "${SSH[@]}" "tar -C '$VPS_DIR/game' -xzf -"
  tar -C . -czf - server package.json | "${SSH[@]}" "tar -C '$VPS_DIR' -xzf -"
fi

say "3/5 cek Node di VPS"
"${SSH[@]}" "node -v"

say "4/5 pasang service systemd"
scp -P "$VPS_PORT" -q deploy/little-legions.service "$VPS_HOST:/tmp/little-legions.service"
"${SSH[@]}" "sudo cp /tmp/little-legions.service /etc/systemd/system/ \
  && sudo systemctl daemon-reload \
  && sudo systemctl enable little-legions >/dev/null 2>&1; \
  sudo systemctl restart little-legions && sleep 1 \
  && systemctl --no-pager --lines=6 status little-legions | head -12"

say "5/5 tes health dari VPS"
"${SSH[@]}" "curl -fsS http://127.0.0.1:8080/api/health; echo"

say "selesai. Pasang nginx/TLS: lihat docs/DEPLOY-VPS.md"
