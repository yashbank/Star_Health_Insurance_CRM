#!/usr/bin/env bash
# Start backend + frontend for local browser use. Adds portable Node (npm) if missing.
# If Postgres is not on :5432, tries Docker Compose (install Docker Desktop), then seeds DB.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Prefer repo portable Node/npm first (fixes "node works but npm: command not found").
if [[ -x "$ROOT/.tools/node/bin/npm" ]]; then
  export PATH="$ROOT/.tools/node/bin:$PATH"
elif ! command -v npm >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
  NODE_BIN="$(bash "$ROOT/scripts/ensure-portable-node.sh")"
  export PATH="$NODE_BIN:$PATH"
fi
export PATH="/usr/local/bin:/opt/homebrew/bin:${HOME}/.docker/bin:/Applications/Docker.app/Contents/Resources/bin:${HOME}/.bun/bin:${PATH}"

free_port() {
  local p="$1"
  local pids
  pids="$(lsof -ti "tcp:${p}" 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "Stopping process on port ${p} so the dev servers can bind…" >&2
    kill -9 ${pids} 2>/dev/null || true
    sleep 1
  fi
}
free_port 4000
free_port 5173

echo "Using node: $(command -v node)" >&2
echo "Using npm:  $(command -v npm)" >&2

cd "$ROOT/backend"
if [[ ! -d node_modules ]]; then
  echo "Installing backend dependencies…" >&2
  npm install
fi

cd "$ROOT/frontend"
if [[ ! -d node_modules ]]; then
  echo "Installing frontend dependencies…" >&2
  npm install
fi

pglite_on_in_env() {
  grep -qE '^[[:space:]]*USE_PGLITE[[:space:]]*=[[:space:]]*(1|true|yes|on)' "$ROOT/backend/.env" 2>/dev/null
}
pglite_off_in_env() {
  grep -qE '^[[:space:]]*USE_PGLITE[[:space:]]*=[[:space:]]*(0|false|no|off)' "$ROOT/backend/.env" 2>/dev/null
}

if pglite_on_in_env; then
  echo "USE_PGLITE enabled in backend/.env — embedded Postgres when the API starts." >&2
elif nc -z 127.0.0.1 5432 >/dev/null 2>&1; then
  echo "Postgres already listening on 127.0.0.1:5432 — applying schema / seed if needed…" >&2
  bash "$ROOT/scripts/bootstrap-db.sh" || echo "Database bootstrap failed — check DATABASE_URL in backend/.env" >&2
else
  echo "No Postgres on 127.0.0.1:5432 — starting it with Docker when possible…" >&2
  if bash "$ROOT/scripts/ensure-postgres.sh"; then
    echo "Applying schema and demo users…" >&2
    bash "$ROOT/scripts/bootstrap-db.sh" || echo "Database bootstrap failed." >&2
  fi
  if ! nc -z 127.0.0.1 5432 >/dev/null 2>&1; then
    if pglite_off_in_env; then
      echo "" >&2
      echo "Postgres is not reachable and USE_PGLITE is disabled in backend/.env." >&2
      echo "Either start Postgres, or set USE_PGLITE=1 (or remove USE_PGLITE=0)." >&2
      echo "" >&2
    else
      export USE_PGLITE=1
      echo "Postgres still unavailable — exported USE_PGLITE=1 for this shell so the API uses embedded PGlite." >&2
    fi
  fi
fi

echo "Starting backend http://localhost:4000 …" >&2
(cd "$ROOT/backend" && npm run dev:simple) &
BACK_PID=$!

echo "Starting frontend on port 5173 (all interfaces — use localhost or 127.0.0.1) …" >&2
(cd "$ROOT/frontend" && npm run dev) &
FRONT_PID=$!

cleanup() {
  kill "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

BACKEND_OK=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://localhost:4000/health" >/dev/null 2>&1; then
    BACKEND_OK=1
    echo "Backend health: OK" >&2
    break
  fi
  sleep 1
done
if [[ "$BACKEND_OK" -ne 1 ]]; then
  echo "Backend did not respond on :4000 after ~10s. Check the API log above (PGlite vs Postgres)." >&2
fi

echo "" >&2
echo "Open in your browser:" >&2
echo "  http://localhost:5173/   or   http://127.0.0.1:5173/" >&2
echo "Login: admin@crm.local / admin123" >&2
echo "In a second terminal, smoke-test login:" >&2
echo "  source \"$ROOT/env-local.sh\"" >&2
echo "  cd \"$ROOT/backend\" && npm run test:login" >&2
echo "Press Ctrl+C here to stop both servers." >&2

wait
