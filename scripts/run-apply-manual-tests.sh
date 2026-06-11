#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

start_server_if_needed() {
  if curl --max-time 2 -sS "$BASE_URL/api/auth/session" >/dev/null 2>&1; then
    echo "ℹ️  Server already running at $BASE_URL"
    return
  fi

  echo "▶ Starting production server..."
  (cd "$ROOT" && pnpm start > /tmp/tbt-apply-test-server.log 2>&1) &
  SERVER_PID=$!

  for _ in $(seq 1 30); do
    if curl --max-time 2 -sS "$BASE_URL/api/auth/session" >/dev/null 2>&1; then
      echo "✅ Server ready at $BASE_URL"
      return
    fi
    sleep 1
  done

  echo "❌ Server failed to start. Log:"
  tail -20 /tmp/tbt-apply-test-server.log || true
  exit 1
}

start_server_if_needed
echo ""
bash "$ROOT/scripts/manual-test-tomorrow-plan-apply.sh"
echo ""
(cd "$ROOT" && pnpm vitest run \
  src/lib/assistant/tomorrow-plan-apply.integration.test.ts \
  src/app/api/assistant/tomorrow-plan/apply/route.test.ts)
