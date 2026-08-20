#!/usr/bin/env python3
"""
Read a map's own screenshot and turn it into a palette.

Six hand-written biomes across a hundred and ten maps means every sixth map is
the same colour, and the ones that share a biome share it exactly. But each of
these maps already has a photograph of itself, and a screenshot of a level is
mostly a statement about its palette: Dust is sand and shadow, Nuke is concrete
and cold light, Inferno is red brick and terracotta.

So the colours come from the picture. The image is cut into bands — sky at the
top, structure through the middle, ground along the bottom — and each band is
clustered to find what it is actually made of. Sampling by region rather than
over the whole frame matters: a global average of any screenshot is brown.

    python3 palette_from_image.py reference/cs-maps --out ../looks/palettes.json
"""
import argparse, colorsys, json, os, re, sys

import numpy as np
from PIL import Image


def dominant(pixels, k=3):
    """The most common colour in a set, by a small k-means."""
    if len(pixels) == 0:
        return np.array([128.0, 128.0, 128.0])
    pts = pixels.astype(np.float32)
    if len(pts) > 20000:
        pts = pts[:: len(pts) // 20000]
    lum = pts.mean(axis=1)
    order = np.argsort(lum)
    centres = np.array([pts[order[int((i + 0.5) * len(pts) / k)]] for i in range(k)])
    who = None
    for _ in range(16):
        d = ((pts[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2)
        who = d.argmin(axis=1)
        moved = 0.0
        for i in range(k):
            sel = pts[who == i]
            if len(sel):
                new = sel.mean(axis=0)
                moved = max(moved, float(np.abs(new - centres[i]).max()))
                centres[i] = new
        if moved < 0.5:
            break
    counts = np.bincount(who, minlength=k)
    return centres[counts.argmax()]


def hexof(rgb):
    r, g, b = (int(max(0, min(255, round(v)))) for v in rgb)
    return (r << 16) | (g << 8) | b


def adjust(rgb, light=1.0, sat=1.0):
    """Nudge a colour's lightness and saturation, staying in gamut."""
    h, l, s = colorsys.rgb_to_hls(*(np.asarray(rgb, dtype=float) / 255.0))
    l = max(0.03, min(0.95, l * light))
    s = max(0.0, min(1.0, s * sat))
    return np.array(colorsys.hls_to_rgb(h, l, s)) * 255.0


def palette_for(path):
    im = Image.open(path).convert("RGB")
    # Downscale hard: this is about colour, and a 4K screenshot costs seconds.
    im.thumbnail((320, 320))
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape

    sky = a[: max(1, int(h * 0.22))].reshape(-1, 3)
    upper = a[int(h * 0.20) : int(h * 0.55)].reshape(-1, 3)
    lower = a[int(h * 0.62) :].reshape(-1, 3)

    sky_c = dominant(sky, 2)
    wall_c = dominant(upper, 3)
    floor_c = dominant(lower, 3)

    # The most saturated thing anywhere becomes the accent — the crates, signs
    # and paintwork that stop a level reading as one material.
    flat = a.reshape(-1, 3)
    mx, mn = flat.max(axis=1), flat.min(axis=1)
    sat = (mx - mn) / np.maximum(mx, 1.0)
    vivid = flat[(sat > np.quantile(sat, 0.97)) & (mx > 60)]
    accent_c = dominant(vivid, 2) if len(vivid) > 40 else adjust(wall_c, 1.2, 1.8)

    # A level lit for a screenshot is not a level lit to fight in, so
    # everything is lifted toward something playable while keeping its hue.
    floor_l = adjust(floor_c, 1.35, 0.9)
    wall_l = adjust(wall_c, 1.5, 0.85)

    sky_h, sky_light, _ = colorsys.rgb_to_hls(*(sky_c / 255.0))
    daylight = sky_light > 0.42

    return {
        "roles": {
            "floor": hexof(floor_l),
            "roof": hexof(adjust(floor_l, 0.72, 1.0)),
            "static_hard": hexof(wall_l),
            "exterior_wall": hexof(adjust(wall_l, 0.88, 1.05)),
            "riser": hexof(adjust(floor_l, 1.12, 1.1)),
            "stair": hexof(adjust(wall_l, 1.1, 0.9)),
            "ramp": hexof(adjust(wall_l, 1.05, 0.9)),
            "cover": hexof(adjust(accent_c, 1.0, 1.1)),
            "soft_panel": hexof(adjust(accent_c, 1.25, 1.15)),
            "glass": hexof(adjust(sky_c, 1.3, 1.2)),
        },
        "sky": hexof(sky_c),
        "fog": hexof(adjust(sky_c, 0.9, 0.9)),
        "fogNear": 26 if daylight else 20,
        "fogFar": 190 if daylight else 120,
        "sun": hexof(adjust(sky_c, 1.45, 0.45)),
        "sunIntensity": round(2.6 if daylight else 2.0, 2),
        "hemiSky": hexof(adjust(sky_c, 1.2, 0.7)),
        "hemiGround": hexof(adjust(floor_l, 0.7, 0.9)),
        "hemiIntensity": round(2.5 if daylight else 2.9, 2),
        "grid": {"line": hexof(adjust(wall_c, 0.35, 0.8)), "alpha": 0.2},
        "daylight": bool(daylight),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("archive", help="reference/cs-maps")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    out, skipped = {}, []
    for d in sorted(os.listdir(args.archive)):
        p = os.path.join(args.archive, d)
        if not os.path.isdir(p):
            continue
        # Prefer a plain screenshot; fall back to an overview. Never a logo,
        # which is artwork on a flat background and says nothing about the map.
        shots = [f for f in os.listdir(p) if re.search(r"- (Image|Overview)\.(png|jpg)$", f, re.I)]
        if not shots:
            skipped.append(d)
            continue
        slug = re.sub(r"[^a-z0-9]+", "_", d.lower()).strip("_")
        try:
            out[slug] = palette_for(os.path.join(p, sorted(shots)[0]))
        except Exception as e:  # a handful of these are 16-bit or CMYK
            skipped.append(f"{d} ({e.__class__.__name__})")
    with open(args.out, "w") as f:
        json.dump(out, f, indent=1, sort_keys=True)
    day = sum(1 for v in out.values() if v["daylight"])
    print(f"{len(out)} palettes -> {args.out}  ({day} daylight, {len(out)-day} dark)")
    if skipped:
        print(f"no usable screenshot for {len(skipped)}: {', '.join(skipped[:8])}")


if __name__ == "__main__":
    main()
