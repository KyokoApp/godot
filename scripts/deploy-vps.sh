#!/usr/bin/env bash
# Deploy Sky Runner ke VPS lewat SSH (tanpa Docker).
# Pakai:  VPS_HOST=user@1.2.3.4 ./scripts/deploy-vps.sh
# Opsional: VPS_DIR=/opt/skyrunner  VPS_PORT=22
set -Eeuo pipefail

: "${VPS_HOST:?set VPS_HOST, contoh: VPS_HOST=root@203.0.113.10 ./scripts/deploy-vps.sh}"
VPS_PORT="${VPS_PORT:-22}"
VPS_DIR="${VPS_DIR:-/opt/skyrunner}"
SSH=(ssh -p "$VPS_PORT" -o StrictHostKeyChecking=accept-new "$VPS_HOST")

say() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }

say "1/5 build game di lokal"
( cd "$(dirname "$0")/../game" && npm install --no-audit --no-fund && npm run build )

say "2/5 siapkan direktori di VPS ($VPS_DIR)"
"${SSH[@]}" "sudo mkdir -p '$VPS_DIR/game/dist' '$VPS_DIR/server' && sudo chown -R \$(id -u):\$(id -g) '$VPS_DIR'"

say "3/5 kirim artefak"
if command -v rsync >/dev/null; then
  rsync -az --delete -e "ssh -p $VPS_PORT" game/dist/ "$VPS_HOST:$VPS_DIR/game/dist/"
  rsync -az -e "ssh -p $VPS_PORT" server/ "$VPS_HOST:$VPS_DIR/server/"
else
  tar -C game/dist -czf - . | "${SSH[@]}" "tar -C '$VPS_DIR/game/dist' -xzf -"
  tar -C server -czf - . | "${SSH[@]}" "tar -C '$VPS_DIR/server' -xzf -"
fi

say "4/5 pastikan Node >= 22 & user service di VPS"
"${SSH[@]}" "node -v; id -u skyrunner >/dev/null 2>&1 || (sudo useradd --system --home '$VPS_DIR' --shell /usr/sbin/nologin skyrunner && sudo mkdir -p /var/lib/skyrunner && sudo chown skyrunner:skyrunner /var/lib/skyrunner)"

say "5/5 pasang & restart systemd"
scp -P "$VPS_PORT" -q deploy/skyrunner.service "$VPS_HOST:/tmp/skyrunner.service"
"${SSH[@]}" "sudo cp /tmp/skyrunner.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable skyrunner >/dev/null 2>&1; sudo systemctl restart skyrunner && sleep 1 && systemctl --no-pager --lines=8 status skyrunner | head -14"

say "selesai — cek: curl -s http://<ip-vps>:8080/api/health"
