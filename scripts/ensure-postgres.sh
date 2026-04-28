#!/usr/bin/env bash
# Start local Postgres on :5432 via Docker Compose when nothing is listening yet.
# Exits 0 when 127.0.0.1:5432 accepts connections; non-zero if Docker cannot be used.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if grep -qE '^USE_PGLITE=(1|true|yes)$' "$ROOT/backend/.env" 2>/dev/null; then
  echo "USE_PGLITE is enabled — embedded database in use; Docker Postgres not required." >&2
  exit 0
fi

# Docker Desktop on macOS often installs the CLI outside a minimal PATH (e.g. Cursor terminal).
export PATH="/usr/local/bin:/opt/homebrew/bin:${HOME}/.docker/bin:/Applications/Docker.app/Contents/Resources/bin:/usr/bin:${PATH}"

if nc -z 127.0.0.1 5432 >/dev/null 2>&1; then
  exit 0
fi

resolve_docker() {
  if command -v docker >/dev/null 2>&1; then
    command -v docker
    return 0
  fi
  local p
  for p in \
    "/usr/local/bin/docker" \
    "/opt/homebrew/bin/docker" \
    "/Applications/Docker.app/Contents/Resources/bin/docker"; do
    if [[ -x "$p" ]]; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

DOCKER_BIN="$(resolve_docker)" || {
  echo "Docker is not installed (no 'docker' CLI found)." >&2
  echo "Install Docker Desktop: https://www.docker.com/products/docker-desktop/" >&2
  exit 1
}

if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  echo "Docker is installed but the daemon is not running." >&2
  echo "Open Docker Desktop and wait until it shows “Running”, then run this script again." >&2
  exit 1
fi

cd "$ROOT"

compose() {
  if "$DOCKER_BIN" compose version >/dev/null 2>&1; then
    "$DOCKER_BIN" compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Neither 'docker compose' nor 'docker-compose' is available." >&2
    exit 1
  fi
}

echo "Starting Postgres container (postgres:16, user/db from docker-compose.yml)…" >&2
if ! compose up -d db; then
  echo "docker compose up failed. If port 5432 is already taken, stop the other Postgres or change the host port in docker-compose.yml." >&2
  exit 1
fi

echo "Waiting for Postgres to accept connections…" >&2
for _ in $(seq 1 90); do
  if compose exec -T db pg_isready -U yashbankar -d insurance_crm >/dev/null 2>&1; then
    echo "Postgres is ready on 127.0.0.1:5432" >&2
    exit 0
  fi
  sleep 1
done

echo "Postgres container is running but did not become ready in time." >&2
compose logs --tail 30 db >&2 || true
exit 1
