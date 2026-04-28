#!/usr/bin/env bash
# If npm/node are missing from PATH, download a portable Node.js into .tools/ (macOS only).
# Prints ONLY the bin directory path on stdout (for: export PATH="$(…):$PATH").
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCH="$(uname -m)"
VER="${NODE_PORTABLE_VERSION:-22.14.0}"

case "$ARCH" in
  arm64) PLATFORM="darwin-arm64" ;;
  x86_64) PLATFORM="darwin-x64" ;;
  *)
    echo "Unsupported CPU: $ARCH (need arm64 or x86_64)." >&2
    exit 1
    ;;
esac

NAME="node-v${VER}-${PLATFORM}"
DEST="$ROOT/.tools/${NAME}"
BIN="$DEST/bin"

if [[ -x "$BIN/node" && -x "$BIN/npm" ]]; then
  echo "$BIN"
  exit 0
fi

mkdir -p "$ROOT/.tools"
TMP="$ROOT/.tools/${NAME}.tar.gz"
URL="https://nodejs.org/dist/v${VER}/${NAME}.tar.gz"

echo "Downloading Node.js v${VER} (${PLATFORM}) — this is a one-time ~45MB download…" >&2
curl -fsSL "$URL" -o "$TMP"
tar -xzf "$TMP" -C "$ROOT/.tools"
rm -f "$TMP"
ln -sfn "$DEST" "$ROOT/.tools/node"

echo "$BIN"
