#!/usr/bin/env python3
"""
Hand-author a map on top of a traced footprint.

Measuring a from-memory Dust II against its radar settled an argument: the
trace reproduced the footprint at 91% IoU and the hand-placed rectangles
managed 49%. Drawing rooms from memory gets the topology right and the geometry
badly wrong — rooms in roughly the right relation to each other, almost none of
them the right shape or in the right place.

So the labour divides the other way round. The radar supplies the shape, which
it is far better at than anyone's recollection, and a person supplies
everything the radar cannot carry: which area is Catwalk, that the Pit is sunk
below Long, that Mid Doors is a low corridor and A Site is a tall open square.

An area is specified by a *seed* — a rough rectangle somewhere inside it — and
every floor cell is then assigned to whichever seed is nearest by walking
distance through the map. Regions grow along corridors and stop at walls
without anyone tracing an outline, so a seed only has to be roughly right.

    python3 annotate.py maps/cs/dust_ii.plan authored/dust2.py > maps/hand/dust2.plan
"""
import argparse, importlib.util, os, sys
from collections import deque

VOID = set("#. \t")


def read_plan(path):
    lines = open(path).read().split("\n")
    i = lines.index("plan")
    j = lines.index("end", i)
    rows = lines[i + 1 : j]
    w = max(len(r) for r in rows)
    grid = [[(ch if ch not in VOID else ".") for ch in row.ljust(w, ".")] for row in rows]
    header = {}
    for line in lines[:i]:
        if ":" in line and not line.startswith("//"):
            k, _, v = line.partition(":")
            if k.strip().isidentifier():
                header[k.strip()] = v.strip()
    return grid, w, len(rows), header


def assign(floor, w, h, seeds):
    """
    Multi-source BFS: every floor cell takes the label of the nearest seed,
    measured by steps through walkable cells rather than straight-line, so a
    region cannot leak through a wall into the room behind it.
    """
    owner = [[None] * w for _ in range(h)]
    q = deque()
    for label, rects in seeds:
        for (x, y, rw, rh) in rects:
            for j in range(y, y + rh):
                for i in range(x, x + rw):
                    if 0 <= i < w and 0 <= j < h and floor[j][i] and owner[j][i] is None:
                        owner[j][i] = label
                        q.append((i, j))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and floor[ny][nx] and owner[ny][nx] is None:
                owner[ny][nx] = owner[y][x]
                q.append((nx, ny))
    return owner


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("traced", help="the traced plan supplying the footprint")
    ap.add_argument("spec", help="python file describing the areas")
    ap.add_argument("--skip-portals", default="",
                    help="comma-separated indices of PORTALS to leave out")
    args = ap.parse_args()

    spec = importlib.util.spec_from_file_location("mapspec", args.spec)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    # A map is one layer unless it says otherwise. A multi-storey spec lists
    # its layers, each naming the traced plan that supplies its footprint —
    # Nuke's two radars are two separate traces of the same building.
    layers = getattr(mod, "LAYERS", None) or [
        {"id": "ground", "traced": None, "z": 0,
         "height": getattr(mod, "LAYER_HEIGHT", 6.0), "roof": False}
    ]
    base_dir = os.path.dirname(os.path.abspath(args.traced))

    def traced_for(spec_layer):
        if not spec_layer.get("traced"):
            return args.traced
        return os.path.join(base_dir, spec_layer["traced"] + ".plan")

    grid, w, h, header = read_plan(traced_for(layers[0]))

    # Everything below is done once per layer. `state` carries what each layer
    # produced so the legend, the plan block and the portal checks can all be
    # written out together at the end.
    state = []
    for spec_layer in layers:
        lgrid, lw, lh, lheader = read_plan(traced_for(spec_layer))
        # The plan is written north-first; the spec places seeds with y counting
        # up from the south, matching how a radar is read.
        lfloor = [[lgrid[lh - 1 - j][i] != "." for i in range(lw)] for j in range(lh)]
        mine = [a for a in mod.AREAS if a.get("layer", layers[0]["id"]) == spec_layer["id"]]
        lowner = assign(lfloor, lw, lh, [(a["id"], a["seeds"]) for a in mine])
        state.append({
            "spec": spec_layer, "grid": lgrid, "w": lw, "h": lh,
            "floor": lfloor, "owner": lowner, "areas": mine,
        })

    floor, owner = state[0]["floor"], state[0]["owner"]
    w, h = state[0]["w"], state[0]["h"]
    unassigned = sum(
        1 for st in state
        for j in range(st["h"]) for i in range(st["w"])
        if st["floor"][j][i] and st["owner"][j][i] is None
    )

    # A seed that lands on void claims nothing, and the area silently vanishes
    # — which then surfaces as an incomprehensible error about an unknown area
    # in some directive that mentions it. Say so here instead.
    got = {}
    for st in state:
        for j in range(st["h"]):
            for i in range(st["w"]):
                if st["owner"][j][i]:
                    got[st["owner"][j][i]] = got.get(st["owner"][j][i], 0) + 1
    missing = [a["id"] for a in mod.AREAS if a["id"] not in got]
    if missing:
        print(
            f"seed missed the floor entirely for: {', '.join(missing)}",
            file=sys.stderr,
        )
        for a in mod.AREAS:
            if a["id"] not in missing:
                continue
            st = next(
                (t for t in state
                 if a.get("layer", layers[0]["id"]) == t["spec"]["id"]),
                state[0],
            )
            for (x, y, rw, rh) in a["seeds"]:
                near = [
                    (i, j)
                    for j in range(max(0, y - 6), min(st["h"], y + rh + 6))
                    for i in range(max(0, x - 6), min(st["w"], x + rw + 6))
                    if st["floor"][j][i]
                ]
                hint = f"nearest floor around ({x},{y}): {near[:4]}" if near else "no floor within six cells"
                print(f"  {a['id']} seed ({x},{y},{rw},{rh}) — {hint}", file=sys.stderr)
        sys.exit(1)

    pool = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz"
    chars = {}
    for st in state:
        for n, a in enumerate(st["areas"]):
            chars[a["id"]] = pool[n]

    def interior(i, j, own, floor=None, owner=None, w=None, h=None):
        """
        True when a cell and all eight of its neighbours belong to one area.

        Cover has to clear the wall band, and a crate straddling a boundary is
        a crate inside a wall — the compiler rejects it, correctly. Requiring
        the whole neighbourhood to agree is the same guard the generator uses,
        and it means a cover rectangle can be placed roughly without having to
        know where the walls ended up.
        """
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                x, y = i + di, j + dj
                if not (0 <= x < w and 0 <= y < h) or not floor[y][x] or owner[y][x] != own:
                    return False
        return True

    # Cover and ramps are painted over the assignment, so they sit inside
    # whichever area the flood gave them.
    extra = {}
    for n, c in enumerate(getattr(mod, "COVER", [])):
        extra[c["id"]] = "0123456789+*=<>?!@$%&"[n]
    for n, r in enumerate(getattr(mod, "RAMPS", [])):
        extra[r["id"]] = "/\\~^|:;,"[n]

    dropped = 0
    for st in state:
        lw, lh, lfloor, lowner = st["w"], st["h"], st["floor"], st["owner"]
        lid = st["spec"]["id"]
        out = [
            [("." if not lfloor[j][i] else chars[lowner[j][i]]) for i in range(lw)]
            for j in range(lh)
        ]
        # Ramps are meant to cross a boundary, so they are painted as written.
        for item in getattr(mod, "RAMPS", []):
            if item.get("layer", layers[0]["id"]) != lid:
                continue
            for (x, y, rw, rh) in item["at"]:
                for j in range(y, y + rh):
                    for i in range(x, x + rw):
                        if 0 <= i < lw and 0 <= j < lh and lfloor[j][i]:
                            out[j][i] = extra[item["id"]]
        for item in getattr(mod, "COVER", []):
            if item.get("layer", layers[0]["id"]) != lid:
                continue
            for (x, y, rw, rh) in item["at"]:
                for j in range(y, y + rh):
                    for i in range(x, x + rw):
                        if not (0 <= i < lw and 0 <= j < lh) or not lfloor[j][i]:
                            continue
                        if interior(i, j, lowner[j][i], lfloor, lowner, lw, lh):
                            out[j][i] = extra[item["id"]]
                        else:
                            dropped += 1
        st["out"] = out

    L = []
    L.append(f"id: {mod.ID}")
    L.append(f"name: {mod.NAME}")
    L.append(f"description: {mod.DESCRIPTION}")
    L.append(f"grid: {header.get('grid', '2.0')}")
    L.append(f"wall_thickness: {getattr(mod, 'WALL_THICKNESS', 0.34)}")
    L.append("")

    for st in state:
        sl = st["spec"]
        roof = "yes" if sl.get("roof") else "no"
        height = sl.get("height", getattr(mod, "LAYER_HEIGHT", 6.0))
        L.append(f'layer {sl["id"]} z={sl.get("z", 0)} height={height} roof={roof}')
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
        for j in range(st["h"] - 1, -1, -1):
            L.append("".join(st["out"][j]).rstrip())
        L.append("end")
        L.append("")

    # Openings.
    #
    # Two areas that touch are open to each other along the whole run where
    # they touch, which is right for a lane widening into a square and wrong
    # for a doorway. A portal is two statements: close the boundary, then cut
    # a hole of a stated width in it. That is what puts a lintel over your head
    # walking through Long Doors instead of a gap in a slab.
    # Where pairs of areas touch, and in how many separate runs.
    #
    # A portal is "close this boundary, then cut one hole in it", which is only
    # safe when the boundary is a single run. Two areas that meet in two places
    # — around a pillar, either side of a block — get one hole and one sealed
    # pocket, which turns up as a three-cell island in the navmesh bake. The
    # flood decides where regions meet, and it does not always meet where a
    # seed layout implies.
    edges = {}
    for st in state:
        lw, lh, lfloor, lowner = st["w"], st["h"], st["floor"], st["owner"]
        for j in range(lh):
            for i in range(lw):
                if not lfloor[j][i]:
                    continue
                for di, dj in ((1, 0), (0, 1)):
                    x, y = i + di, j + dj
                    if (
                        0 <= x < lw and 0 <= y < lh and lfloor[y][x]
                        and lowner[y][x] != lowner[j][i]
                    ):
                        edges.setdefault(
                            frozenset((lowner[j][i], lowner[y][x])), set()
                        ).add((i, j))

    def runs(cells):
        """How many connected pieces a boundary is made of."""
        seen, n = set(), 0
        for c in cells:
            if c in seen:
                continue
            n += 1
            stack = [c]
            seen.add(c)
            while stack:
                cx, cy = stack.pop()
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nb = (cx + dx, cy + dy)
                        if nb in cells and nb not in seen:
                            seen.add(nb)
                            stack.append(nb)
        return n

    touching = set(edges)

    skip = {int(x) for x in args.skip_portals.split(",") if x.strip()}
    emitted = 0
    for n, pr in enumerate(getattr(mod, "PORTALS", [])):
        if n in skip:
            continue
        a, b = pr["between"]
        pair = frozenset((a, b))
        if pair not in touching:
            print(f"// no boundary between {a} and {b}; portal skipped", file=sys.stderr)
            continue
        pieces = runs(edges[pair])
        if pieces > 1:
            print(
                f"// {a}/{b} meet in {pieces} places; portal skipped so the "
                f"others are not sealed off",
                file=sys.stderr,
            )
            continue
        # A cut narrower than the boundary leaves a strip of floor either side
        # of it, walled off behind the rest of the closure — three cells of
        # unreachable map, which the navmesh bake correctly refuses. When there
        # is not enough boundary to spare, the opening takes all of it.
        span = len(edges[pair])
        want = pr.get("width", 2)
        width = want if span - want >= 3 else "full"
        L.append(f"wall {a} {b}")
        L.append(f'{pr.get("kind", "door")} {a} {b} {width}')
        emitted += 1
    if emitted:
        L.append("")

    for v in getattr(mod, "STAIRS", []):
        fx, fy = v["from_at"]
        tx, ty = v["to_at"]
        w_ = f' {v["width"]}' if v.get("width") else ""
        L.append(
            f'{v.get("kind", "stairs")} {v["from"]} {fx},{fy} -> '
            f'{v["to"]} {tx},{ty}{w_}'
        )
    if getattr(mod, "STAIRS", []):
        L.append("")

    for d in getattr(mod, "DIRECTIVES", []):
        L.append(d)
    print("\n".join(L))
    if unassigned:
        print(f"// {unassigned} floor cells unreachable from any seed", file=sys.stderr)
    if dropped:
        print(f"// {dropped} cover cells dropped for sitting on a boundary", file=sys.stderr)


if __name__ == "__main__":
    main()
