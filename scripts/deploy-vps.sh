#!/usr/bin/env bash
# Deploy Sky Legion Live ke VPS lewat SSH (tanpa Docker).
#   VPS_HOST=user@1.2.3.4 TIKTOK_USER=@akun ./scripts/deploy-vps.sh
# Opsional: VPS_PORT=22  VPS_DIR=/opt/sky-legion-live
set -Eeuo pipefail

: "${VPS_HOST:?set VPS_HOST, contoh: VPS_HOST=root@203.0.113.10 ./scripts/deploy-vps.sh}"
VPS_PORT="${VPS_PORT:-22}"
VPS_DIR="${VPS_DIR:-/opt/sky-legion-live}"
SSH=(ssh -p "$VPS_PORT" -o StrictHostKeyChecking=accept-new "$VPS_HOST")
say() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }

say "1/6 build tampilan di lokal"
( cd "$(dirname "$0")/.." && npm install --no-audit --no-fund && npm run build )

say "2/6 siapkan direktori & user di VPS"
"${SSH[@]}" "sudo mkdir -p '$VPS_DIR' && sudo chown -R \$(id -u):\$(id -g) '$VPS_DIR' \
  && (id -u legion >/dev/null 2>&1 || sudo useradd --system --home '$VPS_DIR' --shell /usr/sbin/nologin legion)"

say "3/6 kirim file (dist, server, package.json)"
if command -v rsync >/dev/null; then
  rsync -az --delete dist/ "$VPS_HOST:$VPS_DIR/dist/"
  rsync -az --delete server/ "$VPS_HOST:$VPS_DIR/server/"
  rsync -az package.json package-lock.json "$VPS_HOST:$VPS_DIR/"
else
  tar -C . -czf - dist server package.json package-lock.json | "${SSH[@]}" "tar -C '$VPS_DIR' -xzf -"
fi

say "4/6 pasang dependency produksi di VPS"
"${SSH[@]}" "cd '$VPS_DIR' && npm install --omit=dev --no-audit --no-fund"

say "5/6 tulis .env (TIKTOK_USER / TIKTOK_SIGN_KEY)"
"${SSH[@]}" "cd '$VPS_DIR' && printf 'TIKTOK_USER=%s\nTIKTOK_SIGN_KEY=%s\nMOCK=%s\n' '${TIKTOK_USER:-}' '${TIKTOK_SIGN_KEY:-}' '${MOCK:-0}' > .env && cat .env | sed 's/_SIGN_KEY=.*/_SIGN_KEY=***/'"

say "6/6 pasang service systemd"
scp -P "$VPS_PORT" -q deploy/sky-legion-live.service "$VPS_HOST:/tmp/sky-legion-live.service"
"${SSH[@]}" "sudo cp /tmp/sky-legion-live.service /etc/systemd/system/ \
  && sudo chown -R legion:legion '$VPS_DIR' \
  && sudo systemctl daemon-reload && sudo systemctl enable sky-legion-live >/dev/null 2>&1; \
  sudo systemctl restart sky-legion-live && sleep 2 \
  && systemctl --no-pager --lines=15 status sky-legion-live | head -20"

say "selesai — cek: ssh $VPS_HOST 'curl -s http://127.0.0.1:8080/api/health'"
say "jangan lupa nginx + TLS: lihat docs/DEPLOY-VPS.md"
