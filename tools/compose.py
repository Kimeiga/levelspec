#!/usr/bin/env python3
"""
Draw a map from scratch, out of rectangles.

The tracing path answers "what shape is this real place"; this one answers
"what shape should this place be". They need different tools. A trace starts
from a footprint nobody chose and needs seeds to say what the parts mean; a
composition starts from meaning — a hall here, a catwalk along there, a plant
deck below — and the footprint is whatever those add up to.

An area is a list of rectangles. Later areas paint over earlier ones, which is
how you carve a light well out of a floor plate or notch a corridor into a
hall: draw the big thing, then draw the small thing on top. Everything else —
legend, plan block, portals, directives — is the same plan format the tracer
emits, so both paths meet at the same compiler and the same gates.

    python3 compose.py authored/skydeck.py > maps/hand/skydeck.plan
"""
import argparse, importlib.util, sys

POOL = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz"
EXTRA_COVER = "0123456789+*=<>?!@$%&"
EXTRA_RAMP = "/\\~^|:;,"


def load(path):
    spec = importlib.util.spec_from_file_location("mapspec", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def paint(grid, rects, ch, w, h):
    for (x, y, rw, rh) in rects:
        for j in range(y, y + rh):
            for i in range(x, x + rw):
                if 0 <= i < w and 0 <= j < h:
                    grid[j][i] = ch


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--skip-portals", default="")
    args = ap.parse_args()
    mod = load(args.spec)

    W = getattr(mod, "WIDTH", 48)
    H = getattr(mod, "HEIGHT", 48)
    layers = getattr(mod, "LAYERS", None) or [
        {"id": "ground", "z": 0, "height": getattr(mod, "LAYER_HEIGHT", 6.0), "roof": False}
    ]

    chars = {}
    state = []
    for spec_layer in layers:
        mine = [a for a in mod.AREAS if a.get("layer", layers[0]["id"]) == spec_layer["id"]]
        for n, a in enumerate(mine):
            chars[a["id"]] = POOL[n]
        grid = [["." for _ in range(W)] for _ in range(H)]
        for a in mine:
            paint(grid, a["rects"], chars[a["id"]], W, H)
            # `holes` cut back out of what this area just drew — a light well,
            # an atrium, the gap a stair drops through. Cut here rather than
            # after every area, so an area declared later can fill one: a
            # courtyard with a pavilion in it is a hole and then a pavilion.
            paint(grid, a.get("holes", []), ".", W, H)
        state.append({"spec": spec_layer, "grid": grid, "areas": mine})

    extra = {}
    for n, c in enumerate(getattr(mod, "COVER", [])):
        extra[c["id"]] = EXTRA_COVER[n]
    for n, r in enumerate(getattr(mod, "RAMPS", [])):
        extra[r["id"]] = EXTRA_RAMP[n]

    def interior(grid, i, j, own):
        """A cell whose whole neighbourhood is one area — where cover may go."""
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                x, y = i + di, j + dj
                if not (0 <= x < W and 0 <= y < H) or grid[y][x] != own:
                    return False
        return True

    dropped = 0
    for st in state:
        grid = st["grid"]
        lid = st["spec"]["id"]
        for item in getattr(mod, "RAMPS", []):
            if item.get("layer", layers[0]["id"]) != lid:
                continue
            paint(grid, item["at"], extra[item["id"]], W, H)
        for item in getattr(mod, "COVER", []):
            if item.get("layer", layers[0]["id"]) != lid:
                continue
            for (x, y, rw, rh) in item["at"]:
                for j in range(y, y + rh):
                    for i in range(x, x + rw):
                        if not (0 <= i < W and 0 <= j < H) or grid[j][i] == ".":
                            continue
                        if interior(grid, i, j, grid[j][i]):
                            grid[j][i] = extra[item["id"]]
                        else:
                            dropped += 1

    L = []
    L.append(f"id: {mod.ID}")
    L.append(f"name: {mod.NAME}")
    L.append(f"description: {mod.DESCRIPTION}")
    L.append(f"grid: {getattr(mod, 'GRID', 1.6)}")
    L.append(f"wall_thickness: {getattr(mod, 'WALL_THICKNESS', 0.32)}")
    L.append("")
    for st in state:
        sl = st["spec"]
        roof = "yes" if sl.get("roof") else "no"
        L.append(
            f'layer {sl["id"]} z={sl.get("z", 0)} '
            f'height={sl.get("height", getattr(mod, "LAYER_HEIGHT", 6.0))} roof={roof}'
        )
        L.append("")
        L.append("legend")
        for a in st["areas"]:
            z = f'  {a["z"]:+.2f}' if a.get("z") else ""
            L.append(
                f'  {chars[a["id"]]}  {a["id"]:<17} "{a["label"]}"  '
                f'{a.get("role","lane")}{z}  h={a["ceiling"]}'
            )
        for r in getattr(mod, "RAMPS", []):
            if r.get("layer", layers[0]["id"]) != sl["id"]:
                continue
            L.append(f'  {extra[r["id"]]}  {r["id"]:<17} "{r["label"]}"  ramp')
        for c in getattr(mod, "COVER", []):
            if c.get("layer", layers[0]["id"]) != sl["id"]:
                continue
            L.append(
                f'  {extra[c["id"]]}  {c["id"]:<17} "{c["label"]}"  '
                f'cover={c["height"]} as={c.get("as","crate")}'
            )
        L.append("end")
        L.append("")
        L.append("plan")
        for j in range(H - 1, -1, -1):
            L.append("".join(st["grid"][j]).rstrip())
        L.append("end")
        L.append("")

    skip = {int(x) for x in args.skip_portals.split(",") if x.strip()}
    emitted = 0
    for n, pr in enumerate(getattr(mod, "PORTALS", [])):
        if n in skip:
            continue
        a, b = pr["between"]
        L.append(f"wall {a} {b}")
        L.append(f'{pr.get("kind", "door")} {a} {b} {pr.get("width", 2)}')
        emitted += 1
    if emitted:
        L.append("")

    for v in getattr(mod, "STAIRS", []):
        fx, fy = v["from_at"]
        tx, ty = v["to_at"]
        w_ = f' {v["width"]}' if v.get("width") else ""
        L.append(f'{v.get("kind", "stairs")} {v["from"]} {fx},{fy} -> {v["to"]} {tx},{ty}{w_}')
    if getattr(mod, "STAIRS", []):
        L.append("")

    for d in getattr(mod, "DIRECTIVES", []):
        L.append(d)
    print("\n".join(L))
    if dropped:
        print(f"// {dropped} cover cells dropped for sitting on a boundary", file=sys.stderr)


if __name__ == "__main__":
    main()
