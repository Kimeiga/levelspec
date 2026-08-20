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
    args = ap.parse_args()

    grid, w, h, header = read_plan(args.traced)
    # The plan is written north-first; the spec places seeds with y counting up
    # from the south, matching how a radar is read.
    floor = [[grid[h - 1 - j][i] != "." for i in range(w)] for j in range(h)]

    spec = importlib.util.spec_from_file_location("mapspec", args.spec)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    owner = assign(floor, w, h, [(a["id"], a["seeds"]) for a in mod.AREAS])
    unassigned = sum(
        1 for j in range(h) for i in range(w) if floor[j][i] and owner[j][i] is None
    )

    by_id = {a["id"]: a for a in mod.AREAS}
    chars = {}
    pool = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz"
    for n, a in enumerate(mod.AREAS):
        chars[a["id"]] = pool[n]

    def interior(i, j, own):
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

    out = [[("." if not floor[j][i] else chars[owner[j][i]]) for i in range(w)] for j in range(h)]
    # Ramps are meant to cross a boundary, so they are painted as written.
    for item in getattr(mod, "RAMPS", []):
        for (x, y, rw, rh) in item["at"]:
            for j in range(y, y + rh):
                for i in range(x, x + rw):
                    if 0 <= i < w and 0 <= j < h and floor[j][i]:
                        out[j][i] = extra[item["id"]]

    dropped = 0
    for item in getattr(mod, "COVER", []):
        for (x, y, rw, rh) in item["at"]:
            for j in range(y, y + rh):
                for i in range(x, x + rw):
                    if not (0 <= i < w and 0 <= j < h) or not floor[j][i]:
                        continue
                    if interior(i, j, owner[j][i]):
                        out[j][i] = extra[item["id"]]
                    else:
                        dropped += 1

    L = []
    L.append(f"id: {mod.ID}")
    L.append(f"name: {mod.NAME}")
    L.append(f"description: {mod.DESCRIPTION}")
    L.append(f"grid: {header.get('grid', '2.0')}")
    L.append(f"wall_thickness: {getattr(mod, 'WALL_THICKNESS', 0.34)}")
    L.append("")
    L.append(f"layer ground z=0 height={getattr(mod, 'LAYER_HEIGHT', 6.0)} roof=no")
    L.append("")
    L.append("legend")
    for a in mod.AREAS:
        z = f'  {a["z"]:+.2f}' if a.get("z") else ""
        L.append(f'  {chars[a["id"]]}  {a["id"]:<17} "{a["label"]}"  {a.get("role","lane")}{z}  h={a["ceiling"]}')
    for r in getattr(mod, "RAMPS", []):
        L.append(f'  {extra[r["id"]]}  {r["id"]:<17} "{r["label"]}"  ramp')
    for c in getattr(mod, "COVER", []):
        L.append(f'  {extra[c["id"]]}  {c["id"]:<17} "{c["label"]}"  cover={c["height"]} as={c.get("as","crate")}')
    L.append("end")
    L.append("")
    L.append("plan")
    for j in range(h - 1, -1, -1):
        L.append("".join(out[j]).rstrip())
    L.append("end")
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
