#!/usr/bin/env bash
# Собирает ZIP для загрузки в Chrome Web Store: dist/site-redirect-rules-<версия>.zip
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./extension/manifest.json').version")
out="dist/site-redirect-rules-${version}.zip"

mkdir -p dist
rm -f "$out"
(cd extension && zip -qr -X "../$out" . -x '.*' -x '*/.*')
echo "$out"
