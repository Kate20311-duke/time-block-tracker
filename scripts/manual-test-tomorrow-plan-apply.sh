#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0

assert_status() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  local body="$4"

  if [[ "$actual" == "$expected" ]]; then
    echo "✅ $name — HTTP $actual"
    PASS=$((PASS + 1))
  else
    echo "❌ $name — expected HTTP $expected, got $actual"
    echo "   body: $body"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== HTTP tests: POST $BASE_URL/api/assistant/tomorrow-plan/apply ==="

# 1. Unauthenticated — middleware redirects to /login (307), route itself returns 401 when reached
RESP=$(curl -sS -w "\n%{http_code}" -X POST "$BASE_URL/api/assistant/tomorrow-plan/apply" \
  -H "Content-Type: application/json" \
  -d '{"blocks":[{"title":"x","categoryId":null,"startTime":"2026-06-11T01:00:00.000Z","endTime":"2026-06-11T02:00:00.000Z"}]}')
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)
if [[ "$CODE" == "307" || "$CODE" == "401" ]] && [[ "$BODY" == *"login"* || "$CODE" == "401" ]]; then
  echo "✅ 未登录无法调用 apply — HTTP $CODE（middleware 重定向或 route 401）"
  PASS=$((PASS + 1))
else
  echo "❌ 未登录无法调用 apply — expected HTTP 307/401, got $CODE"
  echo "   body: $BODY"
  FAIL=$((FAIL + 1))
fi

echo "ℹ️  400/登录后场景由 vitest route + integration 测试覆盖（curl 无 session cookie）"

echo ""
echo "HTTP summary: $PASS passed, $FAIL failed"
exit "$FAIL"
