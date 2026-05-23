#!/usr/bin/env bash
set -euo pipefail

BIN_DIR="${OBS_DEPLOY_BIN_DIR:-$HOME/.local/bin}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$BIN_DIR"
cp "$REPO_ROOT/bin/obs-deploy.mjs" "$BIN_DIR/obs-deploy"
chmod +x "$BIN_DIR/obs-deploy"
echo "Updated $BIN_DIR/obs-deploy"
