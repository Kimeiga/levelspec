#!/usr/bin/env python3
"""
Turn a radar image into a starter floorplan.

A radar is already an orthographic top-down drawing of exactly the thing the
plan format wants: coloured pixels are floor, white or transparent is out of
bounds. So the shape of a map — the part that is slow and error-prone to
transcribe by eye — can be read straight off the picture, and the work left
over is the part that actually needs judgement: what each area is called, how
high it sits, and where the spawns and sites are.

    python3 trace_radar.py "reference/cs-maps/Mirage/Mirage - Radar.png" \
        --cells 46 --bands 4 --out ../maps/_mirage.plan

`--bands` clusters floor pixels by colour. Radars shade areas by height and by
material, so the bands land close to the map's real storeys and give distinct
letters to start naming rather than one undifferentiated blob.

The output is a draft, not a map. It has the footprint right and everything
else provisional.
"""
import argparse, colorsys, os, sys
from collections import Counter

import numpy as np
from PIL import Image

# Letters used for traced areas, in band order. Kept clear of the plan format's
# reserved characters (`#`, `.`, space).
LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz"


def load_floor_mask(path, _white_cut, alpha_cut, bg_tol=26.0):
    """
    Floor is anything drawn; everything else is the ground the map sits on.

    The ground is not always white. Across this library it is transparent,
    white, or near-black depending on the era the radar came from, and
    hard-coding "bright means background" quietly turns a black-backed radar
    into one solid rectangle that still compiles and validates — a map-shaped
    hole in the library that no gate can catch. So the background colour is
    measured from the border of the image instead of assumed.
    """
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    h, w = alpha.shape

    # A frame around the edge: whatever a radar is drawn on, the corners are it.
    band = max(2, int(min(h, w) * 0.02))
    ring = np.zeros((h, w), dtype=bool)
    ring[:band, :] = ring[-band:, :] = True
    ring[:, :band] = ring[:, -band:] = True

    opaque = alpha > alpha_cut

    # When an image carries real transparency, that *is* the background and
    # nothing else needs deciding. Guessing a background colour anyway is how
    # Dust II lost four fifths of itself: its radar is half transparent, so the
    # handful of opaque pixels on the border were shadowed map content, and
    # every pixel of that shade got deleted along with them.
    if opaque.mean() < 0.92:
        return im, rgb, opaque

    edge = ring & opaque
    if edge.sum() > 0:
        # Mode over a coarse quantisation, so noise and JPEG ringing do not
        # split the background into a hundred near-identical colours.
        q = (rgb[edge] // 8).astype(np.int32)
        keys, counts = np.unique(q[:, 0] * 4096 + q[:, 1] * 64 + q[:, 2], return_counts=True)
        top = keys[counts.argmax()]
        bg = np.array([(top // 4096) * 8 + 4, ((top // 64) % 64) * 8 + 4, (top % 64) * 8 + 4], dtype=np.float32)
        share = counts.max() / max(1, counts.sum())
    else:
        bg, share = np.array([255.0, 255.0, 255.0]), 1.0

    near_bg = np.abs(rgb - bg).max(axis=2) <= bg_tol
    mask = opaque & ~near_bg
    # If the border was not actually uniform, it was not a background — fall
    # back to opacity alone rather than carving the map up by colour.
    if share < 0.45:
        mask = opaque
    return im, rgb, mask


def crop_to_content(rgb, mask):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        sys.exit("no floor pixels found — try --white-cut higher")
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return rgb[y0:y1, x0:x1], mask[y0:y1, x0:x1]


def downsample(rgb, mask, cells, fill):
    """
    Reduce to a cell grid. A cell is floor when enough of it was floor, and
    takes the mean colour of the floor pixels inside it.
    """
    h, w = mask.shape
    scale = max(w, h) / cells
    gw, gh = max(1, round(w / scale)), max(1, round(h / scale))
    occ = np.zeros((gh, gw), dtype=bool)
    col = np.zeros((gh, gw, 3), dtype=np.float32)
    for gy in range(gh):
        y0, y1 = int(gy * h / gh), max(int(gy * h / gh) + 1, int((gy + 1) * h / gh))
        for gx in range(gw):
            x0, x1 = int(gx * w / gw), max(int(gx * w / gw) + 1, int((gx + 1) * w / gw))
            sub = mask[y0:y1, x0:x1]
            frac = sub.mean() if sub.size else 0.0
            if frac >= fill:
                occ[gy, gx] = True
                px = rgb[y0:y1, x0:x1][sub]
                col[gy, gx] = px.mean(axis=0) if len(px) else 0
    return occ, col


def band_colours(col, occ, bands):
    """k-means on floor colour, so shading differences become distinct areas."""
    pts = col[occ]
    if len(pts) == 0:
        return np.zeros(occ.shape, dtype=int), []
    bands = min(bands, len(np.unique(pts.round(), axis=0)))
    # Deterministic seeding: spread the initial centres over luminance so the
    # same map always traces to the same letters.
    lum = pts.mean(axis=1)
    order = np.argsort(lum)
    centres = np.array([pts[order[int((i + 0.5) * len(pts) / bands)]] for i in range(bands)])
    for _ in range(24):
        d = ((pts[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2)
        who = d.argmin(axis=1)
        moved = 0.0
        for i in range(bands):
            sel = pts[who == i]
            if len(sel):
                new = sel.mean(axis=0)
                moved = max(moved, float(np.abs(new - centres[i]).max()))
                centres[i] = new
        if moved < 0.5:
            break
    # Relabel by luminance so band A is always the darkest.
    rank = np.argsort(centres.mean(axis=1))
    remap = {old: new for new, old in enumerate(rank)}
    out = np.full(occ.shape, -1, dtype=int)
    out[occ] = [remap[w] for w in who]
    return out, centres[rank]


def largest_component(occ):
    """Drop specks: only the biggest connected blob is the map."""
    h, w = occ.shape
    seen = np.zeros_like(occ, dtype=bool)
    best, best_size = None, 0
    for sy in range(h):
        for sx in range(w):
            if not occ[sy, sx] or seen[sy, sx]:
                continue
            stack, comp = [(sy, sx)], []
            seen[sy, sx] = True
            while stack:
                y, x = stack.pop()
                comp.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and occ[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(comp) > best_size:
                best, best_size = comp, len(comp)
    keep = np.zeros_like(occ)
    for y, x in best or []:
        keep[y, x] = True
    return keep


def despeckle(band, occ, rounds):
    """Majority filter, so a traced area is contiguous rather than confetti."""
    h, w = band.shape
    for _ in range(rounds):
        out = band.copy()
        for y in range(h):
            for x in range(w):
                if not occ[y, x]:
                    continue
                votes = Counter()
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and occ[ny, nx]:
                            votes[band[ny, nx]] += 2 if (dy == 0 or dx == 0) else 1
                if votes:
                    out[y, x] = votes.most_common(1)[0][0]
        if (out == band).all():
            break
        band = out
    return band


def absorb_fragments(band, occ, min_cells):
    """
    Merge small islands of a band into whatever surrounds them.

    Colour clustering is per-cell, so a band is not one region — it is confetti
    of that shade scattered across the map. Given an elevation each, those
    fragments become one-cell platforms and pits that cut the floor into pieces
    the navmesh cannot join, and the whole map falls back to flat. Merging any
    connected piece below a threshold into its dominant neighbour turns the
    bands into the handful of large terraces the radar was actually shading.
    """
    h, w = band.shape
    seen = np.zeros_like(occ, dtype=bool)
    for sy in range(h):
        for sx in range(w):
            if not occ[sy, sx] or seen[sy, sx]:
                continue
            b = band[sy, sx]
            stack, comp = [(sy, sx)], []
            seen[sy, sx] = True
            while stack:
                y, x = stack.pop()
                comp.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if (0 <= ny < h and 0 <= nx < w and occ[ny, nx]
                            and not seen[ny, nx] and band[ny, nx] == b):
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(comp) >= min_cells:
                continue
            votes = Counter()
            for y, x in comp:
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and occ[ny, nx] and band[ny, nx] != b:
                        votes[band[ny, nx]] += 1
            if votes:
                into = votes.most_common(1)[0][0]
                for y, x in comp:
                    band[y, x] = into
    return band


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--out", default=None)
    ap.add_argument("--id", default=None)
    ap.add_argument("--name", default=None)
    ap.add_argument("--cells", type=int, default=46, help="cells along the longer side")
    ap.add_argument("--bands", type=int, default=4, help="colour clusters -> areas")
    ap.add_argument("--grid", type=float, default=0.0, help="metres per cell (0 = derive from --span)")
    ap.add_argument("--span", type=float, default=68.0, help="metres along the longer side")
    ap.add_argument("--fill", type=float, default=0.45, help="floor fraction for a cell to count")
    ap.add_argument("--white-cut", type=float, default=232.0)  # kept for compatibility
    ap.add_argument("--bg-tol", type=float, default=26.0, help="colour distance that still counts as background")
    ap.add_argument("--alpha-cut", type=float, default=40.0)
    ap.add_argument("--smooth", type=int, default=3)
    ap.add_argument(
        "--no-crop",
        action="store_true",
        help="keep the whole canvas instead of cropping to the floor. Two radars "
        "of the same map — Nuke's upper and lower — only line up cell for cell "
        "if they are cut from the same box, and the canvas is the box they share.",
    )
    ap.add_argument("--min-band", type=float, default=0.03,
                    help="smallest connected piece of a band, as a fraction of the map")
    args = ap.parse_args()

    stem = os.path.splitext(os.path.basename(args.image))[0]
    map_name = args.name or stem.split(" - ")[0]
    map_id = args.id or "cs_" + map_name.lower().replace(" ", "_").replace("-", "_")

    _, rgb, mask = load_floor_mask(args.image, args.white_cut, args.alpha_cut, args.bg_tol)
    if not args.no_crop:
        rgb, mask = crop_to_content(rgb, mask)
    occ, col = downsample(rgb, mask, args.cells, args.fill)
    occ = largest_component(occ)
    band, centres = band_colours(col, occ, args.bands)
    band = despeckle(band, occ, args.smooth)
    # Two passes: absorbing one fragment can leave its neighbour below the
    # threshold too, and a second sweep catches those.
    floor_cells = max(6, int(occ.sum() * args.min_band))
    band = absorb_fragments(band, occ, floor_cells)
    band = absorb_fragments(band, occ, floor_cells)

    grid = args.grid or round(args.span / max(occ.shape), 2)
    used = sorted({int(b) for b in band[occ]})

    lines = []
    lines.append(f"id: {map_id}")
    lines.append(f"name: {map_name}")
    lines.append(
        f"description: Layout reconstruction of {map_name}, traced from the public radar "
        f"image and then hand-corrected. Topology and proportions only - no assets from "
        f"the original game are used."
    )
    lines.append(f"source_image: {os.path.basename(args.image)}")
    lines.append(f"grid: {grid}")
    lines.append("wall_thickness: 0.32")
    lines.append("")
    lines.append("// TRACED DRAFT. The footprint is read from the radar; everything below")
    lines.append("// needs a human: rename the areas, set their elevations, mark the spawns")
    lines.append("// and sites, and delete any band that is really just shading.")
    lines.append("")
    lines.append("layer ground z=0 height=5 roof=no")
    lines.append("")
    lines.append("legend")
    for b in used:
        c = centres[b]
        h, s, v = colorsys.rgb_to_hsv(*(c / 255.0))
        lines.append(
            f"  {LETTERS[b]}  area_{LETTERS[b].lower()}  \"Area {LETTERS[b]}\"  lane"
            f"   // rgb {int(c[0])},{int(c[1])},{int(c[2])}  value {v:.2f}"
        )
    lines.append("end")
    lines.append("")
    lines.append("plan")
    gh, gw = occ.shape
    for y in range(gh):
        row = "".join(LETTERS[band[y, x]] if occ[y, x] else "." for x in range(gw))
        lines.append(row.rstrip())
    lines.append("end")
    lines.append("")

    text = "\n".join(lines) + "\n"
    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w") as f:
            f.write(text)
        cells = int(occ.sum())
        print(
            f"{map_name}: {gw}x{gh} cells, {cells} floor "
            f"({cells * grid * grid:.0f} m2 at {grid} m/cell), {len(used)} bands -> {args.out}"
        )
    else:
        print(text)


if __name__ == "__main__":
    main()
