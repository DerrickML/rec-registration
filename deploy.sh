#!/usr/bin/env bash
set -euo pipefail

#############################################
# Config (edit if you need)
#############################################
APP="rec-portal"
DIR="/home/admin/apps/rec-registration"
BRANCH="${1:-main}"          # optionally pass branch: ./deploy.sh dev
PORT="${PORT:-3002}"         # keep in sync with ecosystem.config.js
LOGFILE="${DIR}/deploy.log"

#############################################
# Ensure directory & logging
#############################################
[ -d "$DIR" ] || { echo "❌ Directory $DIR does not exist"; exit 1; }
mkdir -p "$(dirname "$LOGFILE")"
touch "$LOGFILE" || { echo "❌ Could not create $LOGFILE"; exit 1; }

# Log everything to console AND file
exec > >(tee -a "$LOGFILE") 2>&1

#############################################
# Helpers
#############################################
log()  { printf "%s %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
fail() { printf "❌ %s\n" "$*" >&2; exit 1; }

#############################################
# PATH and runtime tools (add nvm if present)
#############################################
export PATH="$PATH:/usr/local/bin:$HOME/.npm-global/bin"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.nvm/nvm.sh"
fi

command -v node >/dev/null 2>&1 || fail "node not found on PATH"
command -v npm  >/dev/null 2>&1 || fail "npm not found on PATH"
command -v pm2  >/dev/null 2>&1 || fail "pm2 not found on PATH"

log "🧾 Versions: node $(node -v), npm $(npm -v), pm2 $(pm2 -v)"

#############################################
# Deploy
#############################################
cd "$DIR" || fail "Could not cd to $DIR"
log "📁 Working dir: $DIR"
log "🌿 Branch: $BRANCH  |  App: $APP  |  Port: $PORT"

# Git
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD || echo 'unknown')"
log "🔄 Git: on $CURRENT_BRANCH → pulling origin/$BRANCH"
git fetch origin || fail "git fetch failed"
git checkout "$BRANCH" || fail "git checkout $BRANCH failed"
git pull --ff-only origin "$BRANCH" || fail "git pull failed"

# Install deps (auto-detect pnpm)
if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
  log "📦 Using pnpm (frozen lockfile)"
  pnpm install --frozen-lockfile || fail "pnpm install failed"
  PKG_RUN="pnpm run"
else
  log "📦 Using npm ci (lockfile exact)"
  if ! npm ci; then
    log "⚠️ npm ci failed, retrying with npm install --legacy-peer-deps"
    npm install --legacy-peer-deps || fail "npm install failed"
  fi
  PKG_RUN="npm run"
fi

# Build
log "🏗️ Building production bundle"
$PKG_RUN build || fail "Build failed"

# PM2
if pm2 describe "$APP" >/dev/null 2>&1; then
  log "🚀 Restarting $APP via PM2"
  pm2 restart "$APP" || fail "PM2 restart failed"
else
  log "🚀 Starting $APP via ecosystem.config.js"
  pm2 start ecosystem.config.js --only "$APP" || fail "PM2 start failed"
fi
pm2 save || fail "PM2 save failed"

# Health check
log "🩺 Health check on port $PORT"
if command -v curl >/dev/null 2>&1; then
  if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    log "✅ HTTP check OK on 127.0.0.1:${PORT}"
  else
    log "ℹ️ HTTP check not definitive (custom routes?). Verifying port listener…"
  fi
fi

if command -v ss >/dev/null 2>&1; then
  if ss -ltn | grep -q ":${PORT}"; then
    log "✅ Port ${PORT} is listening"
  else
    log "⚠️ Port ${PORT} not detected as listening; check pm2 logs"
  fi
elif command -v lsof >/dev/null 2>&1; then
  if lsof -i :"${PORT}" | grep -q LISTEN; then
    log "✅ Port ${PORT} is listening"
  else
    log "⚠️ Port ${PORT} not detected as listening; check pm2 logs"
  fi
fi

log "📜 Tail last lines of PM2 logs for ${APP}:"
pm2 logs "$APP" --lines 20 || true

log "🎉 Deployment complete"
log "🌐 If proxied: https://rec.nrep.ug"
