"""Tileable PBR texture set for the Ninefold art pass, generated with numpy inside Blender.

The tiles carry only fine, stationary detail. Anything a player could recognise as a
repeat (blotches, patches, drips, damp) is left to the non-repeating macro map and the
baked grime the viewer blends in world space.


Every map is periodic in both axes. Arrays are indexed [v, u] with v pointing up,
matching Blender's bottom-left pixel order. Each texture writes
<name>_color.png, <name>_normal.png and <name>_orm.png (glTF packing: G roughness,
B metalness); emissive sets add <name>_emit.png.

Run:  blender -b --python textures.py -- <output directory> [size]
"""
import os
import sys

import bpy
import numpy as np


# ---------------------------------------------------------------- noise helpers
def fbm(n, beta=2.0, seed=0, lo=1.0, hi=None, aniso=(1.0, 1.0)):
    """Periodic spectral noise in 0..1. aniso=(a, 1) with a<1 gives vertical streaks; (1, a) horizontal grain."""
    rng = np.random.default_rng(seed)
    f = np.fft.fft2(rng.standard_normal((n, n)))
    fv = np.fft.fftfreq(n)[:, None] * n * aniso[1]
    fu = np.fft.fftfreq(n)[None, :] * n * aniso[0]
    k = np.sqrt(fv * fv + fu * fu)
    k[0, 0] = 1.0
    amp = k ** (-beta / 2.0)
    amp[k < lo] = 0.0
    if hi is not None:
        amp[k > hi] = 0.0
    amp[0, 0] = 0.0
    out = np.real(np.fft.ifft2(f * amp))
    a, b = np.percentile(out, [1, 99])
    return np.clip((out - a) / (b - a), 0, 1)


def grid(n):
    v, u = np.meshgrid(np.arange(n) / n, np.arange(n) / n, indexing="ij")
    return u, v


def smooth(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, radius):
    """Periodic gaussian blur via FFT."""
    n = a.shape[0]
    f = np.fft.fftfreq(n)
    g = np.exp(-2 * (np.pi * radius) ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def cracks(n, seed, width=0.006, density=0.5):
    a = fbm(n, 2.6, seed, lo=2)
    b = fbm(n, 2.0, seed + 1, lo=1, hi=6)
    line = np.abs(a - 0.5) < width
    return (line & (b > 1 - density)).astype(float)


def normal_from_height(h, strength):
    """h in arbitrary units; strength scales slope. Returns RGB normal map 0..1."""
    du = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dv = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    nz = np.ones_like(h)
    length = np.sqrt(du * du + dv * dv + 1)
    return np.stack([-du / length * 0.5 + 0.5, -dv / length * 0.5 + 0.5, nz / length * 0.5 + 0.5], -1)


def rgb(c):
    return np.array(c, dtype=float)[None, None, :]


def mix(a, b, t):
    if t.ndim == 2 and (np.ndim(a) == 3 or np.ndim(b) == 3):
        t = t[..., None]
    return a * (1 - t) + b * t


def tile_cells(u, v, cu, cv, offset_rows=0.0):
    """Returns (cell u id, cell v id, local u 0..1, local v 0..1) for a cu x cv grid."""
    fv = v * cv
    iv = np.floor(fv)
    fu = u * cu + offset_rows * (iv % 2)
    iu = np.floor(fu) % cu
    return iu, iv, fu - np.floor(fu), fv - iv


def cell_random(iu, iv, seed, cu):
    rng = np.random.default_rng(seed)
    table = rng.random((int(iv.max()) + 1, cu))
    return table[iv.astype(int), iu.astype(int) % cu]


def edge_dist(lu, lv, cu, cv):
    """Distance to the nearest cell edge in fractions of the texture."""
    return np.minimum(np.minimum(lu, 1 - lu) / cu, np.minimum(lv, 1 - lv) / cv)


# ---------------------------------------------------------------- output
OUT = "."


def save(name, suffix, array, srgb):
    a = np.clip(array, 0, 1)
    if a.ndim == 2:
        a = np.repeat(a[..., None], 3, -1)
    h, w = a.shape[:2]
    rgba = np.concatenate([a, np.ones((h, w, 1))], -1).astype(np.float32)
    image = bpy.data.images.new(f"{name}_{suffix}", w, h, alpha=False)
    image.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = os.path.join(OUT, f"{name}_{suffix}.png")
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)


def publish(name, color, height, rough, metal=None, normal_strength=4.0, emit=None):
    n = color.shape[0]
    save(name, "color", color, True)
    save(name, "normal", normal_from_height(height, normal_strength * n / 1024), False)
    orm = np.stack([np.ones_like(rough), rough, metal if metal is not None else np.zeros_like(rough)], -1)
    save(name, "orm", orm, False)
    if emit is not None:
        save(name, "emit", emit, True)
    print("texture", name)


# ---------------------------------------------------------------- textures
def plaster(n, seed=10):
    """Lime-washed render, 2.4 m tile: trowel grain, faint weathering lines, hairline cracks."""
    fine = fbm(n, 1.1, seed, lo=28)
    mid = fbm(n, 2.0, seed + 1, lo=7)
    streak = fbm(n, 1.8, seed + 3, lo=10, aniso=(0.10, 1.0))
    tone = 0.76 + 0.05 * (mid - 0.5) + 0.05 * (fine - 0.5) - 0.025 * smooth(0.55, 0.95, streak)
    color = rgb([1.0, 0.985, 0.955]) * tone[..., None]
    crack = blur(cracks(n, seed + 11, 0.003, 0.22), 0.7)
    color = color * (1 - 0.35 * crack)[..., None]
    pits = smooth(0.94, 0.98, fbm(n, 0.7, seed + 5, lo=40))
    color = color * (1 - 0.12 * pits)[..., None]
    height = 0.5 * fine + 0.6 * mid - 1.0 * crack - 0.8 * pits
    return color, height, 0.88 + 0.06 * (fine - 0.5)


def mosaic(n, seed=20):
    """Small glazed facade tiles, 40 x 40 per 1.2 m tile, a few lost or replaced."""
    u, v = grid(n)
    count = 40
    iu, iv, lu, lv = tile_cells(u, v, count, count)
    r = cell_random(iu, iv, seed, count)
    r2 = cell_random(iu, iv, seed + 1, count)
    d = edge_dist(lu, lv, count, count)
    grout = 1 - smooth(0.0010, 0.0026, d)
    fine = fbm(n, 1.0, seed + 2, lo=30)
    tone = 0.80 + 0.10 * (r - 0.5) + 0.03 * (fine - 0.5)
    tone = np.where(r2 > 0.996, 0.50, tone)                     # lost tile, render showing
    tone = np.where((r2 < 0.006), tone * 0.88, tone)            # mismatched replacement
    tone = mix(tone, 0.50 + 0.06 * fine, grout)
    color = rgb([1.0, 0.99, 0.96]) * tone[..., None]
    height = 2.0 * smooth(0.0, 0.004, d) + 0.2 * fine - 1.5 * (r2 > 0.996)
    rough = 0.30 + 0.5 * grout + 0.5 * (r2 > 0.996)
    return color, height, np.clip(rough, 0.15, 1)


def concrete(n, seed=30):
    """Board-formed structural concrete: soffits, piers, stairs, slabs."""
    u, v = grid(n)
    fine = fbm(n, 1.0, seed, lo=30)
    mid = fbm(n, 2.2, seed + 1, lo=8)
    iu, iv, lu, lv = tile_cells(u, v, 1, 8)
    r = cell_random(iu, iv, seed + 3, 1)
    grain = fbm(n, 1.5, seed + 4, lo=6, aniso=(1.0, 0.04))
    joint = np.exp(-(np.minimum(lv, 1 - lv) / 8 / 0.0022) ** 2)
    tone = 0.58 + 0.06 * (mid - 0.5) + 0.06 * (fine - 0.5) + 0.04 * (r - 0.5) + 0.05 * (grain - 0.5) - 0.10 * joint
    pits = smooth(0.93, 0.97, fbm(n, 0.6, seed + 5, lo=40))
    tone = tone - 0.14 * pits
    color = rgb([1.0, 0.99, 0.96]) * tone[..., None]
    height = 0.6 * fine + 0.4 * mid + 0.5 * grain + 0.6 * r - 1.5 * joint - 1.5 * pits
    return color, height, 0.86 + 0.08 * (fine - 0.5)


def street(n, seed=50):
    """Poured street slabs, 2 m bays in a 4 m tile: aggregate, joints, fine cracking."""
    u, v = grid(n)
    fine = fbm(n, 0.8, seed, lo=40)
    mid = fbm(n, 2.0, seed + 1, lo=8)
    iu, iv, lu, lv = tile_cells(u, v, 2, 2)
    joint = np.exp(-(edge_dist(lu, lv, 2, 2) / 0.0016) ** 2)
    tone = 0.50 + 0.07 * (mid - 0.5) + 0.10 * (fine - 0.5) - 0.11 * joint
    crack = blur(cracks(n, seed + 6, 0.004, 0.35), 0.8)
    tone = tone - 0.22 * crack
    speck = smooth(0.95, 0.99, fbm(n, 0.5, seed + 7, lo=60))
    tone = tone + 0.10 * speck
    color = rgb([1.0, 0.98, 0.94]) * tone[..., None]
    height = 0.5 * fine + 0.3 * mid - 1.2 * joint - 1.5 * crack + 0.4 * speck
    return color, height, np.clip(0.80 + 0.10 * (fine - 0.5), 0.2, 1)


def tiles(n, seed=70, count=8):
    """Checker ceramic floor, 0.2 m tiles in a 1.6 m tile."""
    u, v = grid(n)
    iu, iv, lu, lv = tile_cells(u, v, count, count)
    r = cell_random(iu, iv, seed, count)
    d = edge_dist(lu, lv, count, count)
    grout = 1 - smooth(0.0016, 0.0036, d)
    tone = np.where((iu + iv) % 2 > 0, 0.46, 0.74) + 0.05 * (r - 0.5)
    wear = fbm(n, 2.0, seed + 1, lo=7)
    fine = fbm(n, 1.0, seed + 2, lo=30)
    tone = tone - 0.07 * smooth(0.5, 0.9, wear) + 0.03 * (fine - 0.5)
    tone = mix(tone, 0.27 + 0.05 * fine, grout)
    color = rgb([1.0, 0.985, 0.95]) * tone[..., None]
    height = 2.5 * smooth(0.0, 0.008, d) + 0.2 * fine + 0.3 * (r - 0.5)
    rough = 0.24 + 0.20 * smooth(0.4, 0.9, wear) + 0.6 * grout
    return color, height, np.clip(rough, 0.1, 1)


def painted_floor(n, seed=90):
    """Factory floor paint over screed with fine scuffing; large wear comes from the macro map."""
    fine = fbm(n, 0.9, seed, lo=36)
    mid = fbm(n, 2.0, seed + 1, lo=8)
    scuff = fbm(n, 1.6, seed + 3, lo=12, aniso=(0.25, 1.0))
    worn = smooth(0.62, 0.80, 0.5 * mid + 0.5 * scuff)
    paint = 0.72 + 0.05 * (mid - 0.5)
    screed = 0.52 + 0.08 * (fine - 0.5)
    color = mix(rgb([0.84, 1.0, 0.93]) * paint[..., None], rgb([1.04, 1.0, 0.93]) * screed[..., None], worn * 0.8)
    crack = blur(cracks(n, seed + 5, 0.003, 0.3), 0.8)
    color = color * (1 - 0.35 * crack)[..., None]
    height = 0.4 * fine - 0.6 * worn - 1.2 * crack
    return color, height, np.clip(0.45 + 0.35 * worn + 0.06 * (fine - 0.5), 0.2, 1)


def roofing(n, seed=110):
    """Mineral-felt roofing with lapped seams."""
    u, v = grid(n)
    fine = fbm(n, 0.6, seed, lo=50)
    mid = fbm(n, 2.0, seed + 1, lo=8)
    iu, iv, lu, lv = tile_cells(u, v, 1, 4)
    seam = np.exp(-(np.minimum(lv, 1 - lv) / 4 / 0.004) ** 2)
    tone = 0.30 + 0.05 * (mid - 0.5) + 0.08 * (fine - 0.5) + 0.05 * seam
    color = rgb([1.0, 0.98, 0.95]) * tone[..., None]
    return color, 0.8 * fine + 1.2 * seam, np.clip(0.90 + 0.05 * (fine - 0.5), 0.2, 1)


def brick(n, seed=130):
    """Running-bond brick, 16 courses per 1.2 m tile."""
    u, v = grid(n)
    iu, iv, lu, lv = tile_cells(u, v, 5, 16, offset_rows=0.5)
    r = cell_random(iu, iv, seed, 5)
    r2 = cell_random(iu, iv, seed + 1, 5)
    mortar = 1 - smooth(0.004, 0.008, edge_dist(lu, lv, 5, 16))
    fine = fbm(n, 0.9, seed + 2, lo=30)
    hue = mix(rgb([0.50, 0.25, 0.18]), rgb([0.60, 0.34, 0.22]), r)
    hue = mix(hue, rgb([0.34, 0.24, 0.21]), (r2 > 0.86).astype(float) * 0.7)
    color = hue * (0.88 + 0.28 * (fine - 0.5))[..., None]
    color = mix(color, rgb([0.55, 0.53, 0.49]) * (0.8 + 0.3 * fine)[..., None], mortar)
    height = 2.0 * (1 - mortar) + 0.5 * fine + 0.6 * (r - 0.5)
    return color, height, 0.82 + 0.1 * mortar + 0.05 * (fine - 0.5)


def painted_metal(n, seed=150):
    """Enamelled plate with riveted seams and pin-prick rust; tinted per mesh."""
    u, v = grid(n)
    fine = fbm(n, 0.8, seed, lo=40)
    mid = fbm(n, 2.0, seed + 1, lo=8)
    iu, iv, lu, lv = tile_cells(u, v, 2, 2)
    d = edge_dist(lu, lv, 2, 2)
    seam = np.exp(-(d / 0.004) ** 2)
    ru, rv = (lu * 12) % 1 - 0.5, (lv * 12) % 1 - 0.5
    near_edge = np.minimum(np.minimum(lu, 1 - lu), np.minimum(lv, 1 - lv))
    rivet = smooth(0.20, 0.12, np.sqrt(ru * ru + rv * rv)) * (np.abs(near_edge - 1 / 24) < 1 / 24)
    rust = smooth(0.80, 0.92, fbm(n, 1.4, seed + 2, lo=14) + 0.22 * np.exp(-(d / 0.015) ** 2))
    paint = rgb([0.80, 0.80, 0.80]) * (0.92 + 0.12 * (mid - 0.5) + 0.05 * (fine - 0.5))[..., None]
    rust_color = mix(rgb([0.33, 0.16, 0.08]), rgb([0.52, 0.27, 0.12]), fine)
    color = mix(paint, rust_color, rust) * (1 - 0.35 * seam)[..., None]
    height = 1.6 * rivet - 1.2 * seam + 0.5 * rust * fine + 0.15 * fine
    return color, height, np.clip(0.40 + 0.5 * rust + 0.08 * (fine - 0.5), 0.15, 1), 0.5 * (1 - rust)


def corrugated(n, seed=170):
    """Corrugated sheet, 16 ribs per 1.2 m; tinted per mesh."""
    u, v = grid(n)
    wave = 0.5 + 0.5 * np.cos(u * 16 * 2 * np.pi)
    fine = fbm(n, 0.8, seed, lo=40)
    mid = fbm(n, 2.0, seed + 1, lo=8)
    streak = fbm(n, 1.8, seed + 2, lo=10, aniso=(0.08, 1.0))
    rust = smooth(0.74, 0.92, 0.5 * fbm(n, 1.6, seed + 3, lo=10) + 0.5 * streak)
    tone = 0.76 + 0.06 * (mid - 0.5) - 0.16 * (1 - wave)
    paint = rgb([0.86, 0.88, 0.88]) * tone[..., None]
    rust_color = mix(rgb([0.30, 0.14, 0.07]), rgb([0.50, 0.26, 0.12]), fine) * (0.8 + 0.2 * wave)[..., None]
    color = mix(paint, rust_color, rust)
    return color, 5.0 * wave + 0.2 * fine, np.clip(0.45 + 0.45 * rust, 0.2, 1), 0.55 * (1 - rust)


def wood(n, seed=190):
    """Rough planks, 6 per 0.9 m tile, grain along u."""
    u, v = grid(n)
    iu, iv, lu, lv = tile_cells(u, v, 1, 6)
    r = cell_random(iu, iv, seed, 1)
    grain = fbm(n, 1.6, seed + 1, lo=4, aniso=(1.0, 0.05))
    ring = 0.5 + 0.5 * np.sin((grain * 9 + r * 20 + lv * 3) * 2 * np.pi)
    fine = fbm(n, 0.8, seed + 2, lo=40)
    gap = np.exp(-(np.minimum(lv, 1 - lv) / 6 / 0.003) ** 2)
    tone = 0.50 + 0.14 * (r - 0.5) + 0.08 * (ring - 0.5) + 0.08 * (grain - 0.5) + 0.04 * (fine - 0.5)
    color = mix(rgb([0.52, 0.42, 0.32]), rgb([0.70, 0.62, 0.50]), tone)
    color = color * (1 - 0.75 * gap)[..., None]
    height = 0.25 * ring + 0.5 * grain + 0.6 * (r - 0.5) - 3.0 * gap
    return color, height, 0.80 + 0.08 * (fine - 0.5)


def window_glass(n, seed=250):
    """4 x 2 atlas of rooms behind glass: drawn curtains, blinds, a bare room, frosted glass.

    Lower row dark (reflective day glass), upper row lit from inside.
    """
    u, v = grid(n)
    iu, iv, lu, lv = tile_cells(u, v, 4, 2)
    k = iu.astype(int)
    fine = fbm(n, 1.4, seed, lo=12)
    soft = fbm(n, 2.6, seed + 1, lo=2)
    # Curtains: soft folds, parted in the middle to a brighter slot.
    folds = 0.62 + 0.20 * np.sin(lu * 70 + 4 * soft) + 0.10 * np.sin(lu * 23)
    parted = smooth(0.06, 0.02, np.abs(lu - 0.5 - 0.06 * (lv - 0.5)))
    curtain = np.clip(folds * (1 - parted) + 1.25 * parted, 0, 1.3)
    # Venetian blinds: fine slats, a couple hanging crooked.
    slat = (lv * 26) % 1
    blinds = 0.35 + 0.65 * smooth(0.25, 0.45, slat) * smooth(0.95, 0.75, slat)
    # Bare room: ceiling lamp glow at the top, furniture silhouettes along the sill.
    lamp = np.exp(-(((lu - 0.42) / 0.30) ** 2 + ((lv - 0.86) / 0.34) ** 2))
    skyline = 0.16 + 0.10 * np.sign(np.sin(lu * 9 + 1.3)) + 0.05 * np.sign(np.sin(lu * 23))
    room = np.clip(0.42 + 0.75 * lamp, 0, 1.2) * smooth(skyline - 0.01, skyline + 0.02, lv)
    # Frosted or papered glass.
    frosted = 0.55 + 0.30 * soft + 0.10 * fine
    pattern = np.choose(k, [curtain, blinds, room, frosted])
    tint = np.zeros((n, n, 3))
    for i, c in enumerate([[1.0, 0.74, 0.44], [0.78, 0.92, 1.0], [1.0, 0.84, 0.60], [0.80, 0.98, 0.84]]):
        tint[k == i] = c
    vignette = smooth(0.0, 0.3, np.minimum(np.minimum(lu, 1 - lu), np.minimum(lv, 1 - lv)) * 2) * 0.35 + 0.65
    lit = (iv == 1).astype(float)
    emit = tint * (pattern * vignette * (0.85 + 0.15 * fine) * lit)[..., None]
    dark = rgb([0.045, 0.06, 0.07]) * (0.8 + 0.5 * soft)[..., None] + 0.02 * (pattern * (1 - lit))[..., None]
    color = mix(dark, tint * 0.22 * pattern[..., None], lit)
    return color, np.zeros((n, n)), 0.08 + 0.2 * fine, emit


def macro(n, seed=300):
    """Variation map sampled across tens of metres: R broad weathering, G mid mottling, B rain streaks."""
    broad = fbm(n, 2.4, seed, lo=1, hi=40)
    mottle = fbm(n, 1.8, seed + 1, lo=3, hi=90)
    streaks = 0.6 * fbm(n, 1.6, seed + 2, lo=4, aniso=(0.06, 1.0)) + 0.4 * fbm(n, 2.2, seed + 3, lo=1, hi=12)
    return np.stack([broad, mottle, np.clip(streaks, 0, 1)], -1)


def main():
    global OUT
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    OUT = args[0] if args else "."
    n = int(args[1]) if len(args) > 1 else 1024
    os.makedirs(OUT, exist_ok=True)
    for name, make, strength in (
        ("plaster", plaster, 3), ("mosaic", mosaic, 3), ("concrete", concrete, 3), ("street", street, 4),
        ("tiles", tiles, 3), ("floorpaint", painted_floor, 3), ("roofing", roofing, 4), ("brick", brick, 5),
        ("metal", painted_metal, 4), ("corrugated", corrugated, 4), ("wood", wood, 5),
    ):
        result = make(n)
        publish(name, result[0], result[1], result[2], result[3] if len(result) > 3 else None, normal_strength=strength)
    c, h, r, e = window_glass(n)
    publish("glass", c, h, r, emit=e)
    save("macro", "color", macro(n), False)
    print("texture macro")


if __name__ == "__main__":
    main()
