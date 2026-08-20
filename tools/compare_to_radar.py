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


def resize_bool(m, shape):
    """Nearest-neighbour resize of a boolean grid."""
    h, w = shape
    ys = (np.arange(h) * m.shape[0] / h).astype(int).clip(0, m.shape[0] - 1)
    xs = (np.arange(w) * m.shape[1] / w).astype(int).clip(0, m.shape[1] - 1)
    return m[ys][:, xs]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("radar")
    ap.add_argument("--diff", default=None, help="write a comparison image here")
    ap.add_argument("--res", type=int, default=220, help="comparison grid size")
    args = ap.parse_args()

    _, rgb, mask = load_floor_mask(args.radar, 232.0, 40.0)
    _, mask = crop_to_content(rgb, mask)
    radar = resize_bool(crop_bool(mask), (args.res, args.res))
    plan = resize_bool(crop_bool(plan_mask(args.plan)), (args.res, args.res))

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
        img = np.zeros((args.res, args.res, 3), dtype=np.uint8)
        img[radar & plan] = (70, 190, 90)
        img[radar & ~plan] = (210, 70, 60)
        img[~radar & plan] = (70, 110, 220)
        Image.fromarray(img).resize((args.res * 3, args.res * 3), Image.NEAREST).save(args.diff)
        print(f"  diff -> {args.diff}  (green agree, red missing, blue invented)")


if __name__ == "__main__":
    main()
