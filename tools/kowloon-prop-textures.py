"""Paints the kowloon-street@1 prop atlases: hung washing and air conditioners.

Usage: python3 tools/kowloon-prop-textures.py OUTPUT_DIRECTORY

Writes cloth.png (2048 x 1024) and aircon.png (4096 x 2048). Each is an atlas
of square cells in an 8 x 4 grid, numbered row by row from the top left. Which
cell holds what, and where a garment's body and sleeves or a panel's fan
opening lie inside it, is the kit's contract (see docs/DRESSING.md); the
tables below must stay in step with src/dressing/kowloon/laundry.ts and
aircon.ts. Dyed cloth and painted panels are near white so vertex tints set
their color. Requires Pillow; output is deterministic.
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

CELL = 256
COLUMNS, ROWS = 8, 4


def smooth(size, cells, low, high, rng):
    """Returns soft noise in [low, high] as an L image of the given (width, height)."""
    small = Image.new("L", (cells, cells))
    small.putdata([rng.randint(low, high) for _ in range(cells * cells)])
    return small.resize(size, Image.BICUBIC)


def grain(size, strength, rng):
    """Returns per-pixel noise around mid gray as an L image."""
    image = Image.new("L", size)
    image.putdata([128 + int(rng.gauss(0, strength)) for _ in range(size[0] * size[1])])
    return image


def shaded(base, *layers):
    """Multiplies an RGB image by gray layers, treating 128 as no change."""
    result = base
    for layer in layers:
        doubled = layer.point(lambda value: min(255, value * 2))
        result = ImageChops.multiply(result, Image.merge("RGB", (doubled,) * 3))
    return result


def scaled(color, factor):
    """Scales an RGB color, clamped to the displayable range."""
    return tuple(max(0, min(255, int(channel * factor))) for channel in color)


def px(*fractions):
    """Converts cell fractions to pixel coordinates."""
    return [fraction * CELL for fraction in fractions]


# ---------------------------------------------------------------- washing

WHITE = (240, 238, 232)
# A top's body fills this span of its cell; the strips outside hold the
# sleeves, each running from the shoulder at the top toward the cuff.
BODY = (0.2, 0.8)


def fabric(color, rng, weave=3.5, wrinkle=9):
    """Returns a cell of cloth with weave grain and the soft creases washing leaves."""
    size = (CELL, CELL)
    creases = Image.new("L", (20, 1))
    creases.putdata([128 + int(rng.gauss(0, wrinkle * 0.6)) for _ in range(20)])
    return shaded(
        Image.new("RGB", size, color),
        grain(size, weave, rng),
        smooth(size, 5, 128 - wrinkle, 128 + wrinkle // 2, rng),
        creases.resize(size, Image.BICUBIC),
    )


def stitch(draw, points, strength=70):
    """Draws a seam: a shadow line with a raised edge beside it."""
    draw.line(points, fill=(40, 36, 32, strength), width=1)
    draw.line([(x + 1, y + 1) for x, y in points], fill=(255, 255, 255, strength // 2), width=1)


def stripes(draw, ink, pitch, width, horizontal, alpha=255, span=(0, CELL)):
    """Draws parallel bands of `ink` every `pitch` pixels across the cell."""
    for start in range(span[0], span[1], pitch):
        box = [0, start, CELL, start + width - 1] if horizontal else [start, 0, start + width - 1, CELL]
        draw.rectangle(box, fill=ink + (alpha,))


def checks(draw, ink, pitch, width, alpha=110):
    """Draws a woven check: bands both ways that darken where they cross."""
    stripes(draw, ink, pitch, width, True, alpha)
    stripes(draw, ink, pitch, width, False, alpha)


def flowers(draw, rng, palette, count, size):
    """Scatters small printed flowers with leaves."""
    for _ in range(count):
        x, y = rng.uniform(0, CELL), rng.uniform(0, CELL)
        radius = size * rng.uniform(0.7, 1.3)
        petal = rng.choice(palette)
        for leaf in range(2):
            angle = rng.uniform(0, math.tau)
            lx, ly = x + math.cos(angle) * radius * 1.6, y + math.sin(angle) * radius * 1.6
            draw.ellipse([lx - radius * 0.7, ly - radius * 0.4, lx + radius * 0.7, ly + radius * 0.4], fill=(112, 130, 104, 200))
        for k in range(5):
            angle = k * math.tau / 5 + rng.uniform(0, 1)
            cx, cy = x + math.cos(angle) * radius * 0.7, y + math.sin(angle) * radius * 0.7
            draw.ellipse([cx - radius * 0.6, cy - radius * 0.6, cx + radius * 0.6, cy + radius * 0.6], fill=petal + (230,))
        draw.ellipse([x - radius * 0.35, y - radius * 0.35, x + radius * 0.35, y + radius * 0.35], fill=(214, 194, 128, 255))


def top(design, back, rng):
    """Paints a shirt laid flat: body upright in the middle, a sleeve strip either side."""
    image = fabric(design.get("base", WHITE), rng)
    draw = ImageDraw.Draw(image, "RGBA")
    pattern = design.get("pattern")
    if pattern == "hoops":
        stripes(draw, design["ink"], 26, 10, True)
    elif pattern == "pinstripe":
        stripes(draw, design["ink"], 9, 2, False, 190)
    elif pattern == "check":
        checks(draw, design["ink"], 22, 9)
    elif pattern == "floral":
        flowers(draw, rng, design["blooms"], 70, 6)
    elif pattern == "rib":
        stripes(draw, (60, 60, 60), 4, 1, False, 38)
    left, right = px(*BODY)
    middle = CELL / 2
    sleeve = design["sleeve"] * CELL
    # Sleeves: the seam where they join the body, and a turned hem or cuff at their end.
    for x in (left, right):
        stitch(draw, [(x, 0), (x, CELL * 0.4)])
    if design["sleeve"] > 0:
        for x0, x1 in ((0, left), (right, CELL)):
            if design.get("cuff"):
                draw.rectangle([x0, sleeve - 20, x1, sleeve], fill=(0, 0, 0, 26))
                stitch(draw, [(x0, sleeve - 20), (x1, sleeve - 20)])
                draw.ellipse([(x0 + x1) / 2 - 2, sleeve - 12, (x0 + x1) / 2 + 2, sleeve - 8], fill=(250, 250, 246, 255), outline=(60, 60, 60, 160))
            else:
                stitch(draw, [(x0, sleeve - 8), (x1, sleeve - 8)])
    # The neck opening shows the inside of the back; the front scoops lower than the back.
    depth = (design.get("scoop", 0.085) if not back else 0.03) * CELL
    half = design.get("neck", 0.115) * CELL
    opening = [middle - half, -depth, middle + half, depth]
    draw.ellipse(opening, fill=(0, 0, 0, 70))
    if not back:
        draw.rectangle([middle - 7, 3, middle + 7, 10], fill=(244, 242, 236, 255))
    collar = design.get("collar")
    if collar and not back:
        tone = (0, 0, 0, 34)
        for side in (-1, 1):
            draw.polygon(
                [(middle + side * half, 0), (middle + side * (half + 12), 0), (middle + side * (half + 4), depth + 22), (middle + side * 3, depth + 4)],
                fill=tone,
                outline=(40, 36, 32, 120),
            )
    elif collar:
        draw.rectangle([middle - half - 10, 0, middle + half + 10, depth + 6], fill=(0, 0, 0, 30), outline=(40, 36, 32, 110))
    else:
        draw.arc([opening[0] - 5, opening[1] - 5, opening[2] + 5, opening[3] + 5], 0, 180, fill=(40, 36, 32, 90), width=1)
        draw.arc(opening, 0, 180, fill=(40, 36, 32, 130), width=2)
    placket = design.get("placket", 0)
    if placket and not back:
        end = depth + placket * CELL
        draw.rectangle([middle - 7, depth, middle + 7, end], fill=(0, 0, 0, 16))
        stitch(draw, [(middle - 7, depth), (middle - 7, end)])
        stitch(draw, [(middle + 7, depth), (middle + 7, end)])
        for y in range(int(depth) + 14, int(end) - 4, 30):
            draw.ellipse([middle - 3, y - 3, middle + 3, y + 3], fill=(250, 250, 246, 255), outline=(60, 60, 60, 170))
    for side in design.get("pockets", ()) if not back else ():
        x = middle + side * (right - left) * 0.25
        draw.rectangle([x - 22, CELL * 0.27, x + 22, CELL * 0.27 + 46], outline=(40, 36, 32, 120))
        stitch(draw, [(x - 22, CELL * 0.27 + 8), (x + 22, CELL * 0.27 + 8)])
    if back and collar:
        stitch(draw, [(left, CELL * 0.17), (middle, CELL * 0.2), (right, CELL * 0.17)])
    motif = design.get("motif")
    if motif and not back:
        x0, y0, x1, y1 = middle - 46, CELL * 0.3, middle + 46, CELL * 0.3 + 78
        if motif == "block":
            draw.rounded_rectangle([x0, y0, x1, y1], 6, fill=design["ink"] + (210,))
            for row in range(3):
                draw.rectangle([x0 + 12, y0 + 16 + row * 20, x1 - 12 - row * 14, y0 + 24 + row * 20], fill=(244, 240, 228, 230))
        else:
            draw.ellipse([x0 + 6, y0, x1 - 6, y1 - 4], fill=design["ink"] + (215,))
            draw.ellipse([x0 + 24, y0 + 16, x1 - 24, y1 - 22], fill=(246, 222, 120, 235))
    stitch(draw, [(0, CELL - 9), (CELL, CELL - 9)])
    stitch(draw, [(0, CELL - 5), (CELL, CELL - 5)], 40)
    return image


def bottom(design, back, rng):
    """Paints pants laid flat and filling the cell: waistband on top, a leg either side of the middle."""
    image = fabric(design.get("base", WHITE), rng)
    draw = ImageDraw.Draw(image, "RGBA")
    middle = CELL / 2
    pattern = design.get("pattern")
    if pattern == "twill":
        for offset in range(-CELL, CELL, 4):
            draw.line([(offset, CELL), (offset + CELL, 0)], fill=(255, 255, 255, 26), width=1)
        fade = Image.new("L", (CELL, CELL), 0)
        worn = ImageDraw.Draw(fade)
        for x in (CELL * 0.27, CELL * 0.73):
            worn.ellipse([x - 26, CELL * 0.22, x + 26, CELL * 0.86], fill=70)
        image.paste((176, 190, 206), mask=fade.filter(ImageFilter.GaussianBlur(16)))
        draw = ImageDraw.Draw(image, "RGBA")
    elif pattern == "pinstripe":
        stripes(draw, design["ink"], 12, 3, False, 170)
    elif pattern == "check":
        checks(draw, design["ink"], 20, 8)
    band = design.get("band", 0.07) * CELL
    draw.rectangle([0, 0, CELL, band], fill=(0, 0, 0, 22))
    stitch(draw, [(0, band), (CELL, band)])
    if design.get("elastic"):
        for x in range(4, CELL, 7):
            draw.line([(x, 2), (x, band - 2)], fill=(40, 36, 32, 50))
        if not back:
            for side in (-1, 1):
                draw.line([(middle + side * 5, band - 2), (middle + side * 12, band + 34)], fill=(236, 232, 220, 255), width=2)
    else:
        for x in (0.1, 0.36, 0.64, 0.9):
            draw.rectangle([x * CELL - 3, 1, x * CELL + 3, band + 2], fill=(0, 0, 0, 34), outline=(40, 36, 32, 110))
        if not back:
            draw.ellipse([middle - 4, band / 2 - 4, middle + 4, band / 2 + 4], fill=(196, 190, 170, 255), outline=(60, 60, 60, 200))
    crotch = design.get("rise", 0.3) * CELL
    stitch(draw, [(middle, band), (middle, CELL)], 90)
    if not back and not design.get("elastic"):
        draw.arc([middle - 18, band - 30, middle + 18, crotch], 300, 90, fill=(40, 36, 32, 120))
        for side in (-1, 1):
            draw.arc([middle + side * CELL * 0.5 - 46, band - 52, middle + side * CELL * 0.5 + 46, band + 52], 20 if side > 0 else 100, 80 if side > 0 else 160, fill=(40, 36, 32, 140), width=2)
    if back and not design.get("elastic"):
        for side in (-1, 1):
            x = middle + side * CELL * 0.25
            if pattern == "twill":
                draw.polygon([(x - 26, band + 22), (x + 26, band + 22), (x + 26, band + 66), (x, band + 78), (x - 26, band + 66)], outline=(226, 170, 96, 220))
            else:
                draw.rectangle([x - 24, band + 26, x + 24, band + 29], fill=(40, 36, 32, 120))
        stitch(draw, [(0, band + 14), (middle, band + 22), (CELL, band + 14)])
    for x in (CELL * 0.25, CELL * 0.75):
        if design.get("crease"):
            draw.line([(x, crotch * 0.7), (x, CELL)], fill=(255, 255, 255, 60), width=1)
    stitch(draw, [(0, CELL - 10), (CELL, CELL - 10)])
    return image


def flat_good(design, rng):
    """Paints a towel, sheet or blanket filling the cell, its length running top to bottom."""
    image = fabric(design.get("base", WHITE), rng, design.get("weave", 3.5), design.get("wrinkle", 9))
    draw = ImageDraw.Draw(image, "RGBA")
    pattern = design.get("pattern")
    if pattern == "bands":
        for y in (22, CELL - 34):
            draw.rectangle([0, y, CELL, y + 12], fill=design["ink"] + (255,))
            draw.rectangle([0, y + 16, CELL, y + 18], fill=design["ink"] + (200,))
            draw.rectangle([0, y - 5, CELL, y - 4], fill=(0, 0, 0, 40))
    elif pattern == "stripes":
        colors = design["inks"]
        for index, x in enumerate(range(0, CELL, 32)):
            draw.rectangle([x, 0, x + 15, CELL], fill=colors[index % len(colors)] + (235,))
    elif pattern == "floral":
        flowers(draw, rng, design["blooms"], design.get("count", 46), design.get("size", 9))
    elif pattern == "plaid":
        for ink, pitch, width, alpha in design["bands"]:
            checks(draw, ink, pitch, width, alpha)
    elif pattern == "quilt":
        for offset in range(-CELL, CELL * 2, 36):
            stitch(draw, [(offset, 0), (offset + CELL, CELL)], 60)
            stitch(draw, [(offset, CELL), (offset + CELL, 0)], 60)
    elif pattern == "border":
        draw.rectangle([14, 14, CELL - 15, CELL - 15], outline=design["ink"] + (230,), width=5)
        draw.rectangle([26, 26, CELL - 27, CELL - 27], outline=design["ink"] + (150,), width=1)
    elif pattern == "stains":
        marks = Image.new("L", (CELL, CELL), 0)
        blot = ImageDraw.Draw(marks)
        for _ in range(7):
            x, y, r = rng.uniform(0, CELL), rng.uniform(0, CELL), rng.uniform(10, 40)
            blot.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=rng.randint(30, 80))
        image.paste((150, 132, 104), mask=marks.filter(ImageFilter.GaussianBlur(8)))
        draw = ImageDraw.Draw(image, "RGBA")
    if design.get("terry"):
        image = shaded(image, grain((CELL, CELL), 9, rng).filter(ImageFilter.GaussianBlur(0.7)))
        draw = ImageDraw.Draw(image, "RGBA")
    for y in (4, CELL - 6):
        stitch(draw, [(0, y), (CELL, y)], 60)
    return image


INK = {"navy": (62, 72, 98), "red": (150, 84, 78), "green": (88, 112, 98), "gray": (104, 106, 108), "brown": (118, 96, 78), "blue": (98, 122, 152)}
BLOOMS = [(176, 108, 110), (192, 158, 104), (132, 136, 168), (196, 150, 158)]
TEE = {"sleeve": 0.32}
SHIRT = {"sleeve": 0.96, "cuff": True, "collar": True, "placket": 0.9, "scoop": 0.07, "neck": 0.1}
# One entry per cell: (painter, design, back view). Keep in step with laundry.ts.
CLOTH = [
    (top, TEE, False),
    (top, TEE, True),
    (top, {**TEE, "pattern": "hoops", "ink": INK["navy"]}, False),
    (top, {**TEE, "motif": "block", "ink": INK["red"]}, False),
    (top, {"sleeve": 0, "pattern": "rib", "scoop": 0.2, "neck": 0.15}, False),
    (top, {**TEE, "collar": True, "placket": 0.22, "pattern": "rib"}, False),
    (top, {**TEE, "motif": "round", "ink": INK["blue"], "base": (214, 204, 170)}, False),
    (top, {**TEE, "pattern": "floral", "blooms": BLOOMS, "base": (236, 228, 214)}, False),
    (top, {**SHIRT, "pockets": (1,)}, False),
    (top, SHIRT, True),
    (top, {**SHIRT, "pattern": "pinstripe", "ink": INK["blue"], "pockets": (1,)}, False),
    (top, {**SHIRT, "pattern": "pinstripe", "ink": INK["blue"]}, True),
    (top, {**SHIRT, "pattern": "check", "ink": INK["red"], "base": (232, 226, 214), "pockets": (-1, 1)}, False),
    (top, {**SHIRT, "pattern": "check", "ink": INK["red"], "base": (232, 226, 214)}, True),
    (top, {**SHIRT, "pockets": (-1, 1), "pattern": "rib"}, False),
    (top, {"sleeve": 0.3, "pattern": "floral", "blooms": BLOOMS[1:], "base": (222, 226, 232), "scoop": 0.11, "neck": 0.13}, False),
    (bottom, {"crease": True}, False),
    (bottom, {"crease": True}, True),
    (bottom, {"pattern": "twill", "base": (84, 104, 138)}, False),
    (bottom, {"pattern": "twill", "base": (84, 104, 138)}, True),
    (bottom, {"elastic": True, "band": 0.12, "rise": 0.6}, False),
    (bottom, {"elastic": True, "band": 0.06, "pattern": "pinstripe", "ink": INK["blue"], "base": (232, 234, 238)}, False),
    (bottom, {"elastic": True, "band": 0.14, "rise": 0.7, "pattern": "check", "ink": INK["navy"], "base": (226, 230, 236)}, False),
    (flat_good, {"pattern": "plaid", "bands": [(INK["red"], 32, 12, 120), (INK["gray"], 64, 3, 150)], "base": (236, 232, 222)}, False),
    (flat_good, {"pattern": "bands", "ink": INK["blue"], "terry": True}, False),
    (flat_good, {"pattern": "stripes", "inks": [(178, 122, 114), (206, 188, 138), (126, 152, 164)], "terry": True}, False),
    (flat_good, {"pattern": "floral", "blooms": BLOOMS[:2], "count": 30, "size": 9, "terry": True, "base": (226, 232, 226)}, False),
    (flat_good, {"pattern": "floral", "blooms": BLOOMS, "base": (238, 230, 224)}, False),
    (flat_good, {"pattern": "border", "ink": INK["blue"], "wrinkle": 14}, False),
    (flat_good, {"pattern": "plaid", "bands": [(INK["green"], 64, 26, 120), (INK["navy"], 64, 6, 150), (INK["red"], 128, 3, 170)], "base": (214, 200, 168), "weave": 6}, False),
    (flat_good, {"pattern": "quilt", "base": (226, 190, 180), "wrinkle": 5}, False),
    (flat_good, {"pattern": "stains", "wrinkle": 16}, False),
]


# ------------------------------------------------------- air conditioners

# Panels are designed on a 256-unit cell and painted at twice that resolution.
K = 2
PANEL = (CELL * K, CELL * K)
PAINT = (238, 238, 234)
RUST = (142, 80, 42)
# The fan opening of a condenser front: center and radii as cell fractions.
FAN = (0.37, 0.5, 0.275, 0.4)


class Brush:
    """Draws on a panel in 256-unit cell coordinates, whatever its pixel size."""

    def __init__(self, image):
        self.draw = ImageDraw.Draw(image, "RGBA")

    @staticmethod
    def _scaled(points):
        if isinstance(points[0], (tuple, list)):
            return [(x * K, y * K) for x, y in points]
        return [value * K for value in points]

    def rectangle(self, box, fill=None, outline=None, width=1):
        self.draw.rectangle(self._scaled(box), fill=fill, outline=outline, width=width * K)

    def rounded(self, box, radius, fill=None, outline=None, width=1):
        self.draw.rounded_rectangle(self._scaled(box), radius * K, fill=fill, outline=outline, width=width * K)

    def ellipse(self, box, fill=None, outline=None, width=1):
        self.draw.ellipse(self._scaled(box), fill=fill, outline=outline, width=width * K)

    def line(self, points, fill, width=1):
        self.draw.line(self._scaled(points), fill=fill, width=width * K)

    def polygon(self, points, fill=None, outline=None):
        self.draw.polygon(self._scaled(points), fill=fill, outline=outline)


def weathered(image, rng, wear, rusting=True):
    """Ages a panel: run-off streaks, grime rising from the foot and, when worn, rust that bleeds downward."""
    width, height = image.size
    brush = Brush(image)
    for _ in range(int(3 + wear * 18)):
        x, y = rng.uniform(0, CELL), rng.uniform(0, CELL / 2)
        brush.rectangle([x, y, x + rng.uniform(0.5, 2.5), y + rng.uniform(30, CELL)], fill=(70, 60, 48, int(10 + wear * 26)))
    grime = Image.new("L", image.size, 0)
    rise = ImageDraw.Draw(grime)
    for y in range(height):
        depth = max(0.0, (y - height * (0.86 - wear * 0.22)) / (height * 0.3))
        rise.line([0, y, width, y], fill=int(min(1.0, depth) * (30 + wear * 100)))
    image.paste((84, 74, 60), mask=grime)
    if rusting and wear > 0.3:
        # Rust starts where water sits: mostly along the foot, a little under the top lap.
        patches = ImageChops.multiply(smooth(image.size, 5, 0, 255, rng), smooth(image.size, 34, 60, 255, rng))
        edge = Image.new("L", image.size, 0)
        fade = ImageDraw.Draw(edge)
        for y in range(height):
            t = y / height
            fade.line([0, y, width, y], fill=int(255 * min(1.0, 0.12 + 0.9 * t ** 4 + 0.35 * max(0.0, 1 - t * 9))))
        threshold = 118 - wear * 62
        mask = ImageChops.multiply(patches, edge).point(lambda v: min(255, max(0, int((v - threshold) * 9))))
        bleed = Image.new("L", image.size, 0)
        for step in range(2 * K, 40 * K, 3 * K):
            run = ImageChops.offset(mask, 0, step)
            run.paste(0, [0, 0, width, step])
            bleed = ImageChops.lighter(bleed, run.point(lambda v, k=step: int(v * 0.42 * (1 - k / (42 * K)))))
        image.paste(scaled(RUST, 1.15), mask=bleed.filter(ImageFilter.GaussianBlur(K)))
        image.paste(RUST, mask=mask.filter(ImageFilter.GaussianBlur(0.8 * K)))
        image.paste(scaled(RUST, 0.55), mask=ImageChops.multiply(mask, grain(image.size, 46, rng)).point(lambda v: 255 if v > 150 else 0))
    return image.filter(ImageFilter.GaussianBlur(0.5))


def sheet_metal(rng, wear, base=PAINT):
    """Returns a panel of painted sheet metal aged by `wear` in 0..1."""
    image = shaded(Image.new("RGB", PANEL, base), smooth(PANEL, 6, 116, 130, rng), smooth(PANEL, 40, 124, 131, rng), grain(PANEL, 2.2, rng))
    brush = Brush(image)
    for _ in range(int(6 + wear * 30)):
        x, y, length = rng.uniform(0, CELL), rng.uniform(0, CELL), rng.uniform(6, 40)
        brush.line([x, y, x + length, y + rng.uniform(-10, 10)], fill=(90, 90, 86, 34))
    return weathered(image, rng, wear)


def screw(brush, x, y, rusty=False):
    """Draws a pan-head screw with a slot and the stain below it."""
    if rusty:
        brush.rectangle([x - 1, y, x + 1, y + 22], fill=RUST + (110,))
    brush.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(150, 150, 146, 255), outline=(70, 70, 68, 255))
    brush.line([x - 3, y, x + 3, y], fill=(60, 60, 58, 255))
    brush.ellipse([x - 2.2, y - 2.8, x - 0.6, y - 1.6], fill=(232, 232, 228, 255))


def label(brush, x, y, w, h, rng, accent=None):
    """Draws a rating plate or sticker: a pale card with rows standing in for print."""
    brush.rectangle([x, y, x + w, y + h], fill=(226, 224, 214, 255), outline=(120, 118, 110, 255))
    if accent:
        brush.rectangle([x + 2, y + 2, x + w - 2, y + h * 0.28], fill=accent + (255,))
    row = h * 0.36
    while row < h - 3:
        brush.rectangle([x + 3, y + row, x + w - rng.uniform(4, w * 0.5), y + row + 1], fill=(70, 70, 70, 200))
        row += 3.5


def side_panel(rng, wear):
    """A window unit's side: lapped case seams, screws, and a rating plate when fresh."""
    image = sheet_metal(rng, wear)
    brush = Brush(image)
    brush.rectangle([6, 6, CELL - 7, CELL - 7], outline=(60, 60, 58, 70))
    brush.line([6, 7.5, CELL - 7, 7.5], fill=(255, 255, 255, 90))
    for x, y in ((18, 18), (CELL - 18, 18), (18, CELL - 18), (CELL - 18, CELL - 18)):
        screw(brush, x, y, wear > 0.4)
    if wear < 0.5:
        label(brush, CELL - 76, CELL - 62, 52, 38, rng)
    return image


def top_panel(rng, wear):
    """A unit's top: dust, and on a neglected one droppings, leaves and the ring a can left."""
    image = sheet_metal(rng, wear * 0.7)
    dust = smooth(PANEL, 7, 0, int(60 + wear * 120), rng)
    image.paste((128, 118, 100), mask=dust.point(lambda v: v // 2))
    brush = Brush(image)
    brush.rectangle([5, 5, CELL - 6, CELL - 6], outline=(60, 60, 58, 60))
    if wear > 0.5:
        for _ in range(9):
            x, y, r = rng.uniform(10, CELL - 10), rng.uniform(10, CELL - 10), rng.uniform(3, 9)
            brush.ellipse([x - r, y - r * 0.8, x + r, y + r * 0.8], fill=(236, 236, 228, 220))
            brush.ellipse([x - r * 0.3, y - r * 0.3, x + r * 0.4, y + r * 0.3], fill=(70, 74, 66, 200))
        for _ in range(12):
            x, y = rng.uniform(0, CELL), rng.uniform(0, CELL)
            brush.ellipse([x - 7, y - 3, x + 7, y + 3], fill=(104, 84, 48, 220))
        x, y = rng.uniform(70, CELL - 70), rng.uniform(70, CELL - 70)
        brush.ellipse([x - 30, y - 30, x + 30, y + 30], outline=RUST + (200,), width=3)
    return image


def fins(rng, wear):
    """A condenser coil: fine aluminum fins over tube rows, with bent and clogged patches."""
    width, height = PANEL
    image = Image.new("RGB", PANEL, (46, 50, 52))
    draw = ImageDraw.Draw(image, "RGBA")
    for y in range(10 * K, height, 22 * K):
        draw.rectangle([0, y, width, y + 5 * K], fill=(110, 92, 70, 120))
    # Fins are drawn pixel by pixel: finer than the design grid, as real ones are.
    for x in range(0, width, 4):
        tone = rng.randint(168, 204)
        draw.line([x, 0, x, height], fill=(tone, tone + 5, tone + 7, 235))
        draw.line([x + 1, 0, x + 1, height], fill=(tone - 60, tone - 56, tone - 54, 200))
    damage = Image.new("L", PANEL, 0)
    dent = ImageDraw.Draw(damage)
    for _ in range(int(4 + wear * 14)):
        x, y = rng.uniform(0, width), rng.uniform(0, height)
        rx, ry = rng.uniform(5, 22) * K, rng.uniform(3, 12) * K
        dent.ellipse([x - rx, y - ry, x + rx, y + ry], fill=rng.randint(120, 230))
    image.paste((128, 132, 134), mask=damage.filter(ImageFilter.GaussianBlur(1.5 * K)))
    clog = smooth(PANEL, 6, 0, int(40 + wear * 200), rng)
    image.paste((58, 52, 44), mask=clog.point(lambda v: max(0, v - 60)))
    return image


def mesh(rng, wear):
    """Expanded-metal guard over a dark coil."""
    image = fins(rng, wear).point(lambda v: int(v * 0.5))
    brush = Brush(image)
    for offset in range(-CELL, 2 * CELL, 12):
        brush.line([offset, 0, offset + CELL / 2, CELL], fill=(60, 60, 58, 255), width=3)
        brush.line([offset, CELL, offset + CELL / 2, 0], fill=(60, 60, 58, 255), width=3)
        brush.line([offset, 0, offset + CELL / 2, CELL], fill=(216, 216, 210, 255), width=2)
        brush.line([offset, CELL, offset + CELL / 2, 0], fill=(198, 198, 192, 255), width=2)
    return weathered(image, rng, wear * 0.8)


# A grille's pressed rim and the shadowed step inside it, as cell fractions; aircon.ts models both.
RIM = 0.05
STEP = 0.075


def framed(image, rng, wear):
    """Adds the pressed rim, its shadowed step and corner screws every rear grille sits in."""
    brush = Brush(image)
    rim, step = RIM * CELL, STEP * CELL
    for inset in range(int(rim)):
        tone = 236 - inset
        brush.rectangle([inset, inset, CELL - inset, CELL - inset], outline=(tone, tone, tone - 4, 255))
    brush.rectangle([rim, rim, CELL - rim, CELL - rim], outline=(24, 24, 24, 235), width=int(step - rim))
    for x, y in ((6, 6), (CELL - 6, 6), (6, CELL - 6), (CELL - 6, CELL - 6)):
        brush.ellipse([x - 2.5, y - 2.5, x + 2.5, y + 2.5], fill=(120, 120, 116, 255), outline=(60, 60, 58, 255))
    return weathered(image, rng, wear * 0.9)


def rear(kind, rng, wear):
    """The outdoor face of a window unit, one of four grille constructions."""
    if kind == "louvers":
        image = sheet_metal(rng, 0)
        brush = Brush(image)
        for y in range(24, CELL - 26, 11):
            for x0 in (24, CELL // 2 + 4):
                x1 = x0 + CELL // 2 - 28
                brush.rectangle([x0, y, x1, y + 5], fill=(22, 24, 26, 255))
                brush.rectangle([x0, y + 5, x1, y + 6.5], fill=(255, 255, 255, 170))
                brush.rectangle([x0, y - 1.5, x1, y], fill=(96, 96, 94, 170))
                brush.rectangle([x0 - 1.5, y, x0, y + 5], fill=(110, 110, 108, 150))
    elif kind == "grid":
        image = fins(rng, wear)
        brush = Brush(image)
        for x in range(8, CELL, 20):
            brush.rectangle([x, 0, x + 2, CELL], fill=(226, 226, 220, 255))
            brush.line([x + 2.75, 0, x + 2.75, CELL], fill=(20, 20, 20, 170))
        for y in range(8, CELL, 40):
            brush.rectangle([0, y, CELL, y + 3], fill=(232, 232, 226, 255))
            brush.line([0, y + 3.75, CELL, y + 3.75], fill=(20, 20, 20, 170))
    elif kind == "coil":
        image = fins(rng, wear * 1.3)
        brush = Brush(image)
        for y in (CELL * 0.3, CELL * 0.7):
            brush.rectangle([0, y - 5, CELL, y + 5], fill=(214, 214, 208, 255), outline=(40, 40, 40, 255))
            for x in range(26, CELL, 54):
                brush.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(90, 90, 88, 255))
    else:
        image = mesh(rng, wear)
    return framed(image, rng, wear)


def condenser_front(rng, wear, base, ribs):
    """A split unit's front around its fan opening: pressed ring, badge, energy sticker."""
    image = sheet_metal(rng, wear, base)
    brush = Brush(image)
    cx, cy, rx, ry = px(*FAN)
    for grow, ink, width in ((15, (255, 255, 255, 90), 1), (12.5, (60, 60, 58, 100), 2), (7, (255, 255, 255, 70), 1), (4.5, (40, 40, 40, 160), 2)):
        brush.ellipse([cx - rx - grow, cy - ry - grow, cx + rx + grow, cy + ry + grow], outline=ink, width=width)
    brush.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(16, 18, 20, 255))
    seam = cx + rx + 22
    brush.line([seam, 6, seam, CELL - 6], fill=(50, 50, 48, 140))
    brush.line([seam + 1, 6, seam + 1, CELL - 6], fill=(255, 255, 255, 100))
    if ribs:
        for x in range(int(seam) + 12, CELL - 10, 9):
            brush.line([x, 70, x, CELL - 24], fill=(60, 60, 58, 100))
            brush.line([x + 1, 70, x + 1, CELL - 24], fill=(255, 255, 255, 100))
    brush.rounded([seam + 10, 16, CELL - 14, 34], 3, fill=(92, 96, 102, 255))
    brush.rectangle([seam + 15, 22, CELL - 34, 27], fill=(210, 212, 214, 255))
    if wear < 0.6:
        x, y = seam + 12, 40
        brush.rectangle([x, y, x + 34, y + 24], fill=(236, 236, 228, 255), outline=(90, 90, 86, 255))
        for row, tone in enumerate(((60, 140, 80), (150, 180, 70), (226, 196, 70), (214, 120, 60))):
            brush.rectangle([x + 3, y + 3 + row * 5, x + 12 + row * 5, y + 6 + row * 5], fill=tone + (255,))
    for x, y in ((10, 10), (CELL - 10, 10), (10, CELL - 10), (CELL - 10, CELL - 10)):
        screw(brush, x, y, wear > 0.5)
    return image


def valve_side(rng, wear):
    """A split unit's service end: the bulged valve cover, its ports and warning labels."""
    image = sheet_metal(rng, wear)
    brush = Brush(image)
    for y in range(22, 86, 9):
        brush.rectangle([34, y, CELL - 34, y + 3], fill=(26, 28, 30, 235))
        brush.line([34, y + 4, CELL - 34, y + 4], fill=(255, 255, 255, 130))
    brush.rounded([40, 118, CELL - 40, CELL - 22], 10, outline=(50, 50, 48, 170), width=2)
    brush.rounded([42, 120, CELL - 40, CELL - 22], 10, outline=(255, 255, 255, 80))
    label(brush, 60, 134, 72, 44, rng)
    brush.polygon([(150, 178), (176, 178), (163, 156)], fill=(226, 190, 60, 255), outline=(40, 40, 40, 255))
    brush.rectangle([162, 163, 164, 172], fill=(40, 40, 40, 255))
    for x in (96, 150):
        brush.ellipse([x - 9, CELL - 56, x + 9, CELL - 38], fill=(150, 124, 80, 255), outline=(50, 50, 48, 255))
        brush.ellipse([x - 4, CELL - 51, x + 4, CELL - 43], fill=(96, 78, 50, 255))
    return image


def fan(blades, dusty, rng):
    """A condenser fan seen through its guard: blades around a hub in its shroud.

    The kit tints this cell to about an eighth of its brightness, so it is
    painted light: an untextured fan then still reads as a dark opening.
    """
    image = Image.new("RGB", PANEL, (44, 46, 48))
    brush = Brush(image)
    middle = CELL / 2
    for radius, tone in ((124, 70), (100, 92), (70, 78)):
        brush.ellipse([middle - radius, middle - radius, middle + radius, middle + radius], fill=(tone, tone + 1, tone + 2, 255))
    blade = (236, 240, 242) if dusty else (160, 164, 170)
    for index in range(blades):
        angle = index * math.tau / blades + 0.3
        sweep = math.tau / blades * 0.72
        points = [(middle + math.cos(angle) * 22, middle + math.sin(angle) * 22)]
        for step in range(13):
            a = angle + sweep * step / 12
            reach = 112 - 10 * abs(step - 7) / 7
            points.append((middle + math.cos(a) * reach, middle + math.sin(a) * reach))
        points.append((middle + math.cos(angle + sweep * 0.8) * 22, middle + math.sin(angle + sweep * 0.8) * 22))
        brush.polygon(points, fill=blade + (255,))
        brush.line(points[1:8], fill=scaled(blade, 1.3) + (255,), width=3)
        brush.line([points[0], points[1]], fill=scaled(blade, 0.6) + (255,), width=2)
    brush.ellipse([middle - 30, middle - 30, middle + 30, middle + 30], fill=scaled(blade, 0.8) + (255,), outline=(60, 60, 62, 255))
    brush.ellipse([middle - 10, middle - 10, middle + 10, middle + 10], fill=(100, 100, 104, 255))
    return image.filter(ImageFilter.GaussianBlur(0.6 * K))


def plywood(rng):
    """A weathered plywood board, as laid over a unit to keep the rain off."""
    image = shaded(Image.new("RGB", PANEL, (188, 160, 118)), smooth((PANEL[0], 8), 8, 104, 140, rng).resize(PANEL, Image.BICUBIC), grain(PANEL, 4, rng))
    brush = Brush(image)
    for _ in range(26):
        y = rng.uniform(0, CELL)
        brush.line([0, y, CELL, y + rng.uniform(-5, 5)], fill=(110, 84, 52, 60))
    return weathered(image, rng, 0.45, False)


def duct(rng):
    """White plastic line-set duct: four lengths down the cell with a joint between each.

    The kit shows the middle half of the cell on a duct's face and an outer
    quarter on each flank, and spends one cell on every half meter of run.
    """
    image = sheet_metal(rng, 0.25, (240, 240, 236))
    brush = Brush(image)
    for y in range(0, CELL, 64):
        brush.line([0, y, CELL, y], fill=(60, 60, 58, 150))
        brush.line([0, y + 1, CELL, y + 1], fill=(255, 255, 255, 140))
    brush.line([CELL * 0.5, 0, CELL * 0.5, CELL], fill=(60, 60, 58, 50))
    return image


CREAM = (236, 228, 204)
GRAY = (200, 204, 204)
# One entry per cell, as (painter, arguments). Keep in step with aircon.ts.
AIRCON = [
    (side_panel, (0.1,)), (side_panel, (0.45,)), (side_panel, (0.85,)),
    (top_panel, (0.2,)), (top_panel, (0.9,)),
    (fins, (0.2,)), (fins, (0.8,)), (mesh, (0.4,)),
    (condenser_front, (0.1, PAINT, False)), (condenser_front, (0.35, CREAM, True)),
    (condenser_front, (0.8, CREAM, False)), (condenser_front, (0.3, GRAY, True)),
    (valve_side, (0.15,)), (valve_side, (0.7,)),
    (lambda rng: fan(3, False, rng), ()), (lambda rng: fan(5, True, rng), ()),
    (lambda rng, wear: rear("louvers", rng, wear), (0.15,)), (lambda rng, wear: rear("grid", rng, wear), (0.2,)),
    (lambda rng, wear: rear("coil", rng, wear), (0.3,)), (lambda rng, wear: rear("mesh", rng, wear), (0.25,)),
    (lambda rng, wear: rear("louvers", rng, wear), (0.8,)), (lambda rng, wear: rear("grid", rng, wear), (0.75,)),
    (lambda rng, wear: rear("coil", rng, wear), (0.9,)), (lambda rng, wear: rear("mesh", rng, wear), (0.85,)),
    (plywood, ()), (duct, ()),
]


def atlas(cells):
    """Assembles equal square cells row by row; unused cells stay mid gray."""
    size = cells[0].size[0]
    sheet = Image.new("RGB", (size * COLUMNS, size * ROWS), (128, 128, 128))
    for index, cell in enumerate(cells):
        sheet.paste(cell, ((index % COLUMNS) * size, (index // COLUMNS) * size))
    return sheet


def main(directory):
    target = Path(directory)
    target.mkdir(parents=True, exist_ok=True)
    rng = random.Random(41)
    atlas([painter(design, back, rng) if painter in (top, bottom) else painter(design, rng) for painter, design, back in CLOTH]).save(target / "cloth.png", optimize=True)
    rng = random.Random(43)
    atlas([painter(rng, *arguments) for painter, arguments in AIRCON]).save(target / "aircon.png", optimize=True)
    print(f"wrote cloth.png and aircon.png to {target}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
