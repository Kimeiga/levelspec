#!/usr/bin/env python3
"""
Where a staircase between two layers can legally go.

A flight is a physical run of treads with a stringer down each side, and the
compiler bands every wall across the boundary it sits on — half its thickness
into each of the two cells it separates. So a flight whose footprint touches a
wall does not merely look wrong, it intersects it, and the geometry gate
rejects the map. That makes flight placement a search problem rather than
something to eyeball off a plan: the run has to be interior to one space on the
layer it leaves, interior to one space on the layer it arrives at, clear of
cover on both, and clear of the wall band all the way round.

This enumerates every rectangle that satisfies all of that and prints the ones
worth using, longest first, so the run is shallow.

    python3 find_flights.py maps/hand/nuke.plan lower main
"""
import argparse, sys

VOID = set("#. \t")


def layers(path):
    """Each layer's id, its cell grid (y counting up), and its cover chars."""
    lines = open(path).read().split("\n")
    grid = 2.0
    for line in lines:
        if line.startswith("grid:"):
            grid = float(line.split(":", 1)[1])
    out = []
    i = 0
    while i < len(lines):
        if lines[i].startswith("layer "):
            lid = lines[i].split()[1]
            z = 0.0
            for tok in lines[i].split()[2:]:
                if tok.startswith("z="):
                    z = float(tok[2:])
            li = lines.index("legend", i)
            le = lines.index("end", li)
            names, cover = {}, set()
            for entry in lines[li + 1 : le]:
                parts = entry.split()
                if len(parts) >= 2:
                    names[parts[0]] = parts[1]
                    if any(p.startswith("cover=") for p in parts):
                        cover.add(parts[0])
            pi = lines.index("plan", le)
            pe = lines.index("end", pi)
            rows = lines[pi + 1 : pe]
            h = len(rows)
            w = max(len(r) for r in rows)
            cell = {}
            for j, row in enumerate(rows):
                for x, ch in enumerate(row.ljust(w, ".")):
                    if ch not in VOID:
                        cell[(x, h - 1 - j)] = (names.get(ch, ch), ch in cover)
            out.append({"id": lid, "z": z, "cell": cell, "w": w, "h": h})
            i = pe
        i += 1
    return grid, out


def legal(a, b, x0, y0, w, h, dirn):
    """
    True when this rectangle can hold a flight without meeting a wall.

    The run itself has to be one space on the layer it leaves and one space on
    the layer it arrives at — a flight that crosses a boundary crosses the wall
    standing on it. Its two *ends* need a cell of the same space beyond them as
    well, because the top and bottom treads run the full length of their cell
    and have nowhere to give. Its two long *sides* need nothing: the compiler
    insets a tread that finds a wall beside it and leaves the parapet to
    whatever already stands there.
    """
    sa = sb = None
    for x in range(x0, x0 + w):
        for y in range(y0, y0 + h):
            ca, cb = a["cell"].get((x, y)), b["cell"].get((x, y))
            if ca is None or cb is None or ca[1] or cb[1]:
                return None
            sa = sa or ca[0]
            sb = sb or cb[0]
            if ca[0] != sa or cb[0] != sb:
                return None
    ends = (
        [(x, y0 - 1) for x in range(x0, x0 + w)] + [(x, y0 + h) for x in range(x0, x0 + w)]
        if dirn == "N"
        else [(x0 - 1, y) for y in range(y0, y0 + h)] + [(x0 + w, y) for y in range(y0, y0 + h)]
    )
    for c in ends:
        ca, cb = a["cell"].get(c), b["cell"].get(c)
        if ca is None or cb is None or ca[0] != sa or cb[0] != sb:
            return None
    return sa, sb


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("frm")
    ap.add_argument("to")
    ap.add_argument("--rise", type=float, default=0.0, help="drop between the layers")
    ap.add_argument("--max-gradient", type=float, default=0.8)
    ap.add_argument("--widths", default="2,3")
    ap.add_argument("--top", type=int, default=40)
    args = ap.parse_args()

    grid, ls = layers(args.plan)
    by = {l["id"]: l for l in ls}
    a, b = by[args.frm], by[args.to]
    rise = args.rise or abs(b["z"] - a["z"])

    found = []
    for width in [int(t) for t in args.widths.split(",")]:
        for run in range(12, 2, -1):
            if rise / (run * grid) > args.max_gradient:
                continue
            for dirn, (w, h) in (("N", (width, run)), ("E", (run, width))):
                for x0 in range(0, a["w"] - w):
                    for y0 in range(0, a["h"] - h):
                        r = legal(a, b, x0, y0, w, h, dirn)
                        if r:
                            found.append((run, width, dirn, x0, y0, r[0], r[1]))

    # Keep the longest run for each (space pair, direction), then the widest.
    best = {}
    for run, width, dirn, x0, y0, sa, sb in found:
        k = (sa, sb, dirn)
        if k not in best or (run, width) > (best[k][0], best[k][1]):
            best[k] = (run, width, dirn, x0, y0, sa, sb)

    if not best:
        print("no legal flight anywhere between these layers", file=sys.stderr)
        return
    print(f"grid {grid} m, rise {rise:.2f} m")
    for run, width, dirn, x0, y0, sa, sb in sorted(best.values(), reverse=True)[: args.top]:
        frm = (x0, y0) if dirn in "NE" else (x0, y0)
        to = (x0, y0 + run - 1) if dirn == "N" else (x0 + run - 1, y0)
        print(
            f"  {sa:<14} -> {sb:<14} {dirn}  run {run:2d}  width {width}  "
            f"grad {rise / (run * grid):.2f}   "
            f'{{"from_at": {frm}, "to_at": {to}, "width": {width * grid:.2f}}}'
        )


if __name__ == "__main__":
    main()
