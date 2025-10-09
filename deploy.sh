#!/usr/bin/env bash
set -euo pipefail

#############################################
# Config (edit if you need)
#############################################
APP="rec-portal"
DIR="/srv/rec-registration"
BRANCH="${1:-main}"          # optionally pass branch: ./deploy.sh dev
PORT="${PORT:-3001}"         # keep in sync with ecosystem.config.js
LOGFILE="${DIR}/deploy.log"

#############################################
# Helpers
#############################################
log()  { printf "%s %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
fail() { printf "❌ %s\n" "$*" >&2; exit 1; }

#############################################
# Ensure PATH has node/npm/pm2 (adjust if using nvm)
#############################################
export PATH="$PATH:/usr/local/bin:$HOME/.npm-global/bin"
# Load nvm if present (common on servers)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.nvm/nvm.sh"
fi

command -v node >/dev/null 2>&1 || fail "node not found on PATH"
command -v npm  >/dev/null 2>&1 || fail "npm not found on PATH"
command -v pm2  >/dev/null 2>&1 || fail "pm2 not found on PATH"

log "🧾 Versions: node $(node -v), npm $(npm -v), pm2 $(pm2 -v)"

#############################################
# Prepare directory & log
#############################################
[ -d "$DIR" ] || fail "Directory $DIR does not exist"
cd "$DIR" || fail "Could not cd to $DIR"

# Create log file if missing
touch "$LOGFILE" || fail "Could not create $LOGFILE"

{
  log "📁 Working dir: $DIR"
  log "🌿 Branch: $BRANCH  |  App: $APP  |  Port: $PORT"

  ###########################################
  # Git pull
  ###########################################
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD || echo 'unknown')"
  log "🔄 Git: on $CURRENT_BRANCH → pulling origin/$BRANCH"
  git fetch origin || fail "git fetch failed"
  git checkout "$BRANCH" || fail "git checkout $BRANCH failed"
  git pull --ff-only origin "$BRANCH" || fail "git pull failed"

  ###########################################
  # Install deps (auto-detect npm or pnpm)
  ###########################################
  if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
    log "📦 Using pnpm (frozen lockfile)"
    pnpm install --frozen-lockfile || fail "pnpm install failed"
    PKG_RUN="pnpm run"
  else
    log "📦 Using npm ci (lockfile exact)"
    # npm ci is strict—fallback to npm install in case of peer issues
    if ! npm ci; then
      log "⚠️ npm ci