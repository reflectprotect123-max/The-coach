#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT"
DEST="$SRC/capacitor/www"
mkdir -p "$DEST"
cp "$SRC/coach.html" "$DEST/index.html"
for f in \
  whoop.js \
  exercise-search-index.js \
  exercise-search.js \
  coach-exercise-catalog.js \
  coach-loop.js \
  log-columns.js \
  coach-nutrition.js \
  coach-bridge.js \
  coach-cloud.js \
  coach-views.js \
  coach-management.js \
  coach-tools.js \
  coach-layout.css \
  strength-builder.js \
  strength-builder.css \
  strength-builder-frame.html \
  strength-builder-frame.js \
  coach-native-bridge.js
do
  cp "$SRC/$f" "$DEST/$f"
done
mkdir -p "$DEST/athlete-runtime"
cp "$SRC"/athlete-runtime/*.js "$SRC"/athlete-runtime/*.css "$DEST/athlete-runtime/"
echo "Coach APK www ready at $DEST"
