#!/usr/bin/env python3
"""
Measure a plan against the radar it was built from.

The question this answers is how much of a map the radar actually carries. It
rasterises a plan's floor cells to the radar's own resolution, aligns the two
by their bounding boxes, and reports how much of each is covered by the other —
plus a diff image showing where they disagree, which is the part you can act
on.

Three numbers matter:

  recall     how much of the radar's floor the plan reproduces. Low means the
             plan is missing rooms.
  precision  how much of the plan's floor is really on the radar. Low means the
             plan invented space.
  IoU        the two combined; the single number to compare runs by.

    python3 compare_to_radar.py maps/hand/dust2.plan \
        "reference/cs-maps/Dust II/Dust II - Radar.png" --diff /tmp/d2.png
"""
import argparse, os, sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trace_radar import load_floor_mask, crop_to_content  # noqa: E402

VOID = set("#. \t")


def plan_mask(path):
    """The plan's floor cells as a boolean grid, north-up like the radar."""
    lines = open(path).read().split("\n")
    i = lines.index("plan")
    j = lines.index("end", i)
    rows = lines[i + 1 : j]
    w = max(len(r) for r in rows)
    grid = np.zeros((len(rows), w), dtype=bool)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch not in VOID:
                grid[y, x] = True
    return grid


def crop_bool(m):
    ys, xs = np.nonzero(m)
    return m[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def fit_bool(m, res):
    """
    Scale a boolean grid into a square of side `res`, preserving its aspect.

    Stretching each mask to fill the square independently is the obvious thing
    and it is wrong: a 48x44 plan and a radar whose content is 40x46 then get
    different distortions, the two no longer line up, and the score measures
    the mismatch rather than the map. Fitting both into the same box with their
    proportions intact is the only way the numbers mean anything.
    """
    h, w = m.shape
    scale = min(res / w, res / h)
    tw, th = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    ys = (np.arange(th) * h / th).astype(int).clip(0, h - 1)
    xs = (np.arange(tw) * w / tw).astype(int).clip(0, w - 1)
    small = m[ys][:, xs]
    out = np.zeros((res, res), dtype=bool)
    oy, ox = (res - th) // 2, (res - tw) // 2
    out[oy : oy + th, ox : ox + tw] = small
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("radar")
    ap.add_argument("--diff", default=None, help="write a comparison image here")
    ap.add_argument("--res", type=int, default=220, help="comparison grid size")
    args = ap.parse_args()

    _, rgb, mask = load_floor_mask(args.radar, 232.0, 40.0)
    _, mask = crop_to_content(rgb, mask)

    # Compare on the plan's own grid rather than at some fine common
    # resolution.
    #
    # A plan is a few dozen cells across and the radar is a thousand pixels, so
    # scoring them against each other pixel-wise charges the plan a full cell of
    # error all the way round its outline — a halo that has nothing to do with
    # whether the trace was right and everything to do with the grid being
    # coarse. The question worth asking is per cell: given this cell size, did
    # the trace mark the cells the radar says are floor? So the radar is
    # rasterised onto exactly the plan's cells and compared there.
    # The plan grid is used whole, not cropped to its content.
    #
    # The tracer crops the radar to its content and then downsamples, so the
    # plan's full grid already *is* that crop, cell for cell. Cropping it again
    # here re-registers the two against different boxes — and since the tracer
    # also drops blobs disconnected from the main map, those boxes genuinely
    # differ, which was scoring a correct trace of Nuke at 36% by comparing it
    # against a shifted, rescaled copy of itself.
    plan = plan_mask(args.plan)
    ph, pw = plan.shape
    mh, mw = mask.shape
    radar = np.zeros_like(plan)
    for j in range(ph):
        y0, y1 = int(j * mh / ph), max(int(j * mh / ph) + 1, int((j + 1) * mh / ph))
        for i in range(pw):
            x0, x1 = int(i * mw / pw), max(int(i * mw / pw) + 1, int((i + 1) * mw / pw))
            sub = mask[y0:y1, x0:x1]
            radar[j, i] = sub.mean() >= 0.5 if sub.size else False

    inter = (radar & plan).sum()
    union = (radar | plan).sum()
    recall = inter / max(1, radar.sum())
    precision = inter / max(1, plan.sum())
    iou = inter / max(1, union)

    name = os.path.basename(args.plan)
    print(f"{name} vs {os.path.basename(args.radar)}")
    print(f"  recall    {recall * 100:5.1f}%   (of the radar's floor, reproduced)")
    print(f"  precision {precision * 100:5.1f}%   (of the plan's floor, really there)")
    print(f"  IoU       {iou * 100:5.1f}%")

    if args.diff:
        # Green where they agree, red where the radar has floor the plan does
        # not, blue where the plan invented some.
        img = np.zeros((*plan.shape, 3), dtype=np.uint8)
        img[radar & plan] = (70, 190, 90)
        img[radar & ~plan] = (210, 70, 60)
        img[~radar & plan] = (70, 110, 220)
        Image.fromarray(img).resize((plan.shape[1] * 12, plan.shape[0] * 12), Image.NEAREST).save(args.diff)
        print(f"  diff -> {args.diff}  (green agree, red missing, blue invented)")


if __name__ == "__main__":
    main()
