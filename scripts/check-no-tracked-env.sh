#!/usr/bin/env bash
# REG-SEC-01 / TM-001 — fail if any .env (except .env.example) is tracked.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

tracked="$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$' || true)"

if [[ -n "$tracked" ]]; then
  echo "REG-SEC-01 FAIL: tracked env files must be untracked:" >&2
  echo "$tracked" >&2
  echo "Fix: git rm --cached <file>  (keep local copy)" >&2
  exit 1
fi

echo "REG-SEC-01 OK: no tracked .env files (except .env.example)"
