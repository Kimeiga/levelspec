#!/bin/sh
# Rebuilds the Ninefold art pass end to end: textures, Blender modeling pass, web package.
# An open preview (play/) reloads itself when this finishes.
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
HERE=$ROOT/projects/ninefold-reboot/production
G=$ROOT/generated/ninefold-reboot-production
BLENDER=${BLENDER_PATH:-/Applications/Blender.app/Contents/MacOS/Blender}
mkdir -p "$G"
"$BLENDER" -b --python "$HERE/blender/textures.py" -- "$G/textures" 1024 > "$G/textures.log" 2>&1
"$BLENDER" -b --python "$HERE/blender/build.py" -- \
  --src "$ROOT/generated/ninefold-reboot-r08-build/ninefold-reboot.glb" \
  --tex "$G/textures" --out "$G/art" "$@" > "$G/build.log" 2>&1 || true
# Blender exits 0 even when the script raises, so the log decides.
if grep -q "Traceback" "$G/build.log" || ! grep -q "exported" "$G/build.log"; then
  grep -E "Error|Traceback|line [0-9]+" "$G/build.log" | tail -12
  exit 1
fi
grep -E "^\[" "$G/build.log" | grep -v "preview " | cut -c1-600
python3 "$HERE/package.py" "$G/art" "$G/textures" "$ROOT/generated/ninefold-reboot-r08-build/ninefold-reboot.levelspec.json" "$G/web"
