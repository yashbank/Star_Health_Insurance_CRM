#!/usr/bin/env bash
# Apply schema + seed demo users if the users table is empty. Requires Postgres on 5432.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -x "$ROOT/.tools/node/bin/npm" ]]; then
  export PATH="$ROOT/.tools/node/bin:$PATH"
fi
export PATH="${HOME}/.bun/bin:$PATH"

cd "$ROOT/backend"
npm run db:init
bash scripts/with-runtime.sh scripts/ensure-seed.mjs
