#!/usr/bin/env bash
# Run a JS file with node if available, else Bun (common when Node is not on PATH yet).
set -e
if command -v node >/dev/null 2>&1; then
  exec node "$@"
elif [[ -x "${HOME}/.bun/bin/bun" ]]; then
  exec "${HOME}/.bun/bin/bun" "$@"
else
  echo "Neither 'node' nor ~/.bun/bin/bun was found." >&2
  echo "Install Node.js LTS: https://nodejs.org (includes npm)" >&2
  echo "Or install Bun: https://bun.sh and ensure ~/.bun/bin is on your PATH." >&2
  exit 127
fi
