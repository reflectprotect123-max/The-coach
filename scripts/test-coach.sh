#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for test in coach-*.smoke.mjs; do
  node "$test"
done
node strength-builder.smoke.mjs
node log-columns.smoke.mjs
node exercise-search.smoke.mjs
