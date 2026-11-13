#!/usr/bin/env python3
"""Packages the art pass for the browser: JPEG textures, GLBs, light list and gameplay markers.

    python3 package.py <art dir> <texture dir> <r08 levelspec.json> <web out dir>
"""
import json
import os
import shutil
import sys
import time

from PIL import Image

art, textures, levelspec, out = sys.argv[1:5]
os.makedirs(os.path.join(out, "textures"), exist_ok=True)
for name in sorted(os.listdir(textures)):
    if name.endswith(".png"):
        image = Image.open(os.path.join(textures, name)).convert("RGB")
        image.save(os.path.join(out, "textures", name[:-4] + ".jpg"), quality=92, subsampling=0 if "normal" in name else 2)
for name in ("ninefold.glb", "ninefold.collision.glb"):
    shutil.copy(os.path.join(art, name), os.path.join(out, name))
source = json.load(open(levelspec))
y_up = lambda p: [p[0], p[2], -p[1]]  # noqa: E731 - LevelSpec Z-up to glTF Y-up
game = {
    "id": source["id"],
    "name": "Ninefold — Loft Street",
    "geometryHash": source["geometryHash"],
    "coordinateSystem": "glTF Y-up metres",
    "player": {"radius": 0.25, "height": 2.0, "step": 0.25, "slope": 42},
    "markers": [
        {"id": m["id"], "kind": m["kind"], "position": y_up(m["position"])}
        for m in source["markers"] if m["kind"] != "poi"
    ],
}
json.dump(game, open(os.path.join(out, "ninefold.game.json"), "w"), indent=1)
# The manifest goes last with a fresh stamp: an open preview reloads when it sees the stamp change.
manifest = json.load(open(os.path.join(art, "ninefold.art.json")))
manifest["build"] = int(time.time())
json.dump(manifest, open(os.path.join(out, "ninefold.art.json"), "w"), indent=1, ensure_ascii=False)
total = sum(os.path.getsize(os.path.join(root, f)) for root, _, files in os.walk(out) for f in files)
print(f"packaged {out}: {total / 1e6:.1f} MB")
