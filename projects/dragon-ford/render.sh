#!/bin/sh
# Render layout drawings to SVG+PNG: sh projects/dragon-ford/render.sh <outdir>
set -e
cd "$(dirname "$0")/../.."
uv run --quiet --with shapely python projects/dragon-ford/layout.py "$1"
args=""
for f in "$1"/*.svg; do args="$args $f ${f%.svg}.png"; done
node projects/dragon-ford/svg2png.mjs $args 1500
