#!/usr/bin/env bash
# Integration test for the running Docker stack (frontend -> backend -> MySQL).
# Usage:  ./scripts/integration-test.sh            # CRUD + MySQL checks
#         ./scripts/integration-test.sh --persistence   # also recreates containers
# Requires: stack already running (`docker compose up -d`), curl, and a .env file.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; [ -f .env ] && . ./.env; set +a
BASE="http://localhost:${FRONTEND_PORT:-8080}"
PASS=0; FAIL=0
ok()   { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad()  { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
check() { # check "<description>" "<expected>" "<actual>"
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', got '$3')"; fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
mysql_count() {
  docker compose exec -T db sh -c \
    "MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" mysql -uroot \"\$MYSQL_DATABASE\" -N -e \"SELECT COUNT(*) FROM employees WHERE email='$1'\""
}
wait_for_api() {
  for _ in $(seq 1 60); do
    [ "$(code "$BASE/api/health")" = "200" ] && return 0
    sleep 2
  done
  return 1
}

echo "== 1. Frontend serves the SPA and proxies /api to Flask"
check "GET / returns 200" 200 "$(code "$BASE/")"
check "GET /api/health through nginx returns 200" 200 "$(code "$BASE/api/health")"

echo "== 2. Backend ports are not published on the host"
check "backend :5000 not reachable from host" 000 "$(code --max-time 3 http://localhost:5000/api/health || true)"
check "MySQL :3306 not reachable from host" 0 "$( (exec 3<>/dev/tcp/127.0.0.1/3306) 2>/dev/null && echo 1 || echo 0 )"

echo "== 3. CRUD through the frontend proxy"
EMAIL="integration.$(date +%s)@example.com"
BODY='{"first_name":"Test","last_name":"Runner","email":"'"$EMAIL"'","phone":"+1 555 0199","department":"Engineering","job_title":"QA Engineer","salary":70000,"hire_date":"2024-01-15"}'
CREATED=$(curl -s -w '\n%{http_code}' -X POST -H 'Content-Type: application/json' -d "$BODY" "$BASE/api/employees")
check "POST /api/employees returns 201" 201 "$(echo "$CREATED" | tail -n1)"
ID=$(echo "$CREATED" | head -n1 | sed -n 's/.*"id": *\([0-9][0-9]*\).*/\1/p' | head -n1)
[ -n "$ID" ] && ok "created employee id=$ID" || { bad "could not read new id"; exit 1; }
check "GET /api/employees/$ID returns 200" 200 "$(code "$BASE/api/employees/$ID")"
check "duplicate email returns 409" 409 "$(code -X POST -H 'Content-Type: application/json' -d "$BODY" "$BASE/api/employees")"
check "invalid payload returns 400" 400 "$(code -X POST -H 'Content-Type: application/json' -d '{"email":"x"}' "$BASE/api/employees")"
check "PUT /api/employees/$ID returns 200" 200 "$(code -X PUT -H 'Content-Type: application/json' -d '{"job_title":"Senior QA Engineer"}' "$BASE/api/employees/$ID")"
check "search by email finds the record" 1 "$(curl -s "$BASE/api/employees?q=$EMAIL" | grep -o '"count": *[0-9]*' | grep -o '[0-9]*$')"
check "GET /api/stats returns 200" 200 "$(code "$BASE/api/stats")"

echo "== 4. Backend -> MySQL (row visible inside the db container)"
check "row exists in MySQL" 1 "$(mysql_count "$EMAIL")"

if [ "${1:-}" = "--persistence" ]; then
  echo "== 5. Persistence across container recreation (volume kept)"
  docker compose down            # NOTE: no -v, the named volume survives
  docker compose up -d
  wait_for_api && ok "stack healthy again" || bad "stack did not become healthy"
  check "record survived recreation" 1 "$(mysql_count "$EMAIL")"
fi

echo "== 6. Delete"
check "DELETE /api/employees/$ID returns 200" 200 "$(code -X DELETE "$BASE/api/employees/$ID")"
check "deleted record returns 404" 404 "$(code "$BASE/api/employees/$ID")"
check "row removed from MySQL" 0 "$(mysql_count "$EMAIL")"

echo; echo "Passed: $PASS  Failed: $FAIL"
[ "$FAIL" -eq 0 ]
