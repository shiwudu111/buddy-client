#!/usr/bin/env sh
set -eu

SOURCE_DIR="${SOURCE_DIR:-/mnt/e/buddy/buddy-client}"
TARGET_DIR="${TARGET_DIR:-/home/openclaw/.openclaw/workspace-cipher/buddy-client}"
LOG_DIR="${LOG_DIR:-/tmp/buddy-client-sync}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/sync-windows-to-wsl.log}"

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

fail() {
  log "ERROR: $*"
  exit 1
}

if [ ! -d "$SOURCE_DIR" ]; then
  fail "Source directory not found: $SOURCE_DIR"
fi

mkdir -p "$TARGET_DIR"

log "Syncing client workspace"
log "  from: $SOURCE_DIR"
log "  to:   $TARGET_DIR"
log "  log:  $LOG_FILE"

if command -v rsync >/dev/null 2>&1; then
  log "Using rsync."
  rsync -a --delete --stats \
    --exclude '.git/' \
    --exclude 'node_modules/' \
    --exclude '.tmp/' \
    --exclude 'temp/' \
    --exclude 'library/' \
    --exclude 'local/' \
    --exclude 'build/' \
    --exclude 'dist/' \
    --exclude '*.log' \
    "$SOURCE_DIR/" "$TARGET_DIR/" 2>&1 | tee -a "$LOG_FILE"
else
  log "rsync not found; using cp fallback."
  cp -a "$SOURCE_DIR"/. "$TARGET_DIR"/
  rm -rf \
    "$TARGET_DIR/.git" \
    "$TARGET_DIR/node_modules" \
    "$TARGET_DIR/.tmp" \
    "$TARGET_DIR/temp" \
    "$TARGET_DIR/library" \
    "$TARGET_DIR/local" \
    "$TARGET_DIR/build" \
    "$TARGET_DIR/dist"
  find "$TARGET_DIR" -maxdepth 1 -type f -name '*.log' -delete
fi

log "Client sync complete."
