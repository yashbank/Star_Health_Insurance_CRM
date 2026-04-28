#!/usr/bin/env bash
# Open Star Health Insurance CRM in the browser — no global npm required (uses .tools/node when present).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ -x "$ROOT/.tools/node/bin/npm" ]]; then
  export PATH="$ROOT/.tools/node/bin:$PATH"
elif ! command -v npm >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
  export PATH="$(bash "$ROOT/scripts/ensure-portable-node.sh"):$PATH"
fi

exec bash "$ROOT/start-live.sh"
