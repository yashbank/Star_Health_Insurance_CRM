# Usage: source ./env-local.sh   (from /Users/yashbankar/Self, or use absolute path)
SELF="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
if [[ -x "$SELF/.tools/node/bin/npm" ]]; then
  export PATH="$SELF/.tools/node/bin:$PATH"
fi
if [[ -x "${HOME}/.bun/bin/bun" ]]; then
  export PATH="${HOME}/.bun/bin:$PATH"
fi
