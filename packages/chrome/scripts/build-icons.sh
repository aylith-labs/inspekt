#!/usr/bin/env bash
# Generate greyscale variants of the toolbar icon.
# Run once after updating the source icons; commit the outputs.
#
# Requires ImageMagick (`magick` or `convert`). On Ubuntu/Debian:
#   sudo apt-get install imagemagick
#
# Usage:
#   cd packages/chrome
#   ./scripts/build-icons.sh

set -euo pipefail

cd "$(dirname "$0")/../public/icons"

if command -v magick >/dev/null 2>&1; then
  CONVERT="magick"
elif command -v convert >/dev/null 2>&1; then
  CONVERT="convert"
else
  echo "Error: ImageMagick not found. Install with: sudo apt-get install imagemagick" >&2
  exit 1
fi

for size in 16 48 128; do
  src="icon-${size}.png"
  out="icon-grey-${size}.png"
  if [[ ! -f "$src" ]]; then
    echo "Skipping $size — source $src missing" >&2
    continue
  fi
  $CONVERT "$src" -colorspace Gray -modulate 100,0,100 "$out"
  echo "Wrote $out"
done

echo "Done. Commit the new icon-grey-*.png files."
