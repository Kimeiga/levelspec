"""Paints the kowloon-street@1 kit finish textures.

Usage: uv run --with pillow --with numpy --with scipy --with fonttools \
       python tools/kowloon-kit-textures.py OUTPUT_DIRECTORY [TEXTURE ...] [--extra CHARACTERS]

Writes lettering.png, signboard.png, rust.png, metal.png, sheet.png
and timber.png, or only the named textures. metal, sheet and timber
need Pillow alone; the others need numpy, and lettering also needs scipy and
fonttools.

lettering.png is a glyph atlas whose alpha channel is a signed distance field:
0.5 lies on the glyph outline, so a material with alpha-cutoff 0.5 draws crisp
letters at any size. It holds every ideograph used in
src/dressing/kowloon/signs/words.ts, capital letters, digits and punctuation in
seven faces, and any characters passed with --extra. Its cell layout and letter
advances are written to src/dressing/kowloon/signs/atlas.ts, which the compiler
letters signs from: regenerate both together and never edit that module by hand.

The faces come from open-licensed Google Fonts families, downloaded once into
generated/kowloon-kit-fonts. The remaining textures tile; all but rust.png are near white so
vertex tints set their color. Output is deterministic for given font files.
"""
import math
import random
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

REPOSITORY = Path(__file__).resolve().parent.parent
FONT_CACHE = REPOSITORY / "generated" / "kowloon-kit-fonts"
FONT_SOURCE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
VOCABULARY = REPOSITORY / "src" / "dressing" / "kowloon" / "signs" / "words.ts"
LAYOUT_MODULE = REPOSITORY / "src" / "dressing" / "kowloon" / "signs" / "atlas.ts"

# Lettering atlas geometry, pixels. A cell is the em box plus PAD on every side.
ATLAS = 4096
CELL = 83
PAD = 10
EM = CELL - 2 * PAD
ROWS_PER_FACE = 7
# The distance field reaches this far outside and inside the outline, pixels.
SPREAD_OUTSIDE = 8.0
SPREAD_INSIDE = 3.0
# Glyphs are rasterized this many times larger before distances are measured.
SUPERSAMPLE = 4
LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,-&'/():+#!"
# Capital letters stand this tall, in ems, unless a face's widest letter needs them smaller.
CAP_HEIGHT = 0.72
# Ideographs measured to find where a font centers its em box.
REFERENCE_IDEOGRAPHS = "\u570b\u9f8d\u83ef\u8208\u9eb5\u91ab"

# A font is (Google Fonts directory, file name, weight for variable fonts or None).
NOTO_SANS = ("notosanshk", "NotoSansHK[wght].ttf", 900)
NOTO_SERIF = ("notoserifhk", "NotoSerifHK[wght].ttf", 900)
WENKAI = ("lxgwwenkaitc", "LXGWWenKaiTC-Bold.ttf", None)
# Each face: identifier, ideograph fonts in fallback order, capital-letter fonts
# in fallback order, and how far the outline is grown to embolden it, in ems.
FACES = [
    ("hei", [NOTO_SANS], [("oswald", "Oswald[wght].ttf", 700)], 0.0),
    ("song", [NOTO_SERIF], [NOTO_SERIF], 0.0),
    ("kai", [WENKAI], [WENKAI], 0.014),
    ("brush", [("yujiboku", "YujiBoku-Regular.ttf", None), WENKAI], [("yujisyuku", "YujiSyuku-Regular.ttf", None)], 0.008),
    ("heavy", [("delagothicone", "DelaGothicOne-Regular.ttf", None), NOTO_SANS], [("anton", "Anton-Regular.ttf", None)], 0.0),
    ("round", [("huninn", "Huninn-Regular.ttf", None), NOTO_SANS], [("huninn", "Huninn-Regular.ttf", None)], 0.022),
    ("slim", [("wdxllubrifonttc", "WDXLLubrifontTC-Regular.ttf", None), NOTO_SANS], [("bebasneue", "BebasNeue-Regular.ttf", None)], 0.0),
]


def font_file(font):
    """Returns the cached path of a Google Fonts file, downloading it on first use."""
    directory, name, _ = font
    target = FONT_CACHE / name
    if not target.exists():
        FONT_CACHE.mkdir(parents=True, exist_ok=True)
        url = FONT_SOURCE + directory + "/" + urllib.parse.quote(name)
        print(f"downloading {url}")
        try:
            urllib.request.urlretrieve(url, target)
        except OSError as error:
            raise SystemExit(f"Could not download {name}: {error}. Place the file in {FONT_CACHE}.")
    return target


def load_font(font, pixels):
    """Opens a font at a pixel size, at its listed weight when it is variable."""
    loaded = ImageFont.truetype(str(font_file(font)), pixels)
    if font[2] is not None:
        loaded.set_variation_by_axes([font[2]])
    return loaded


def covered_characters(font):
    """Returns the set of characters a font file has glyphs for."""
    from fontTools.ttLib import TTFont

    return {chr(code) for code in TTFont(str(font_file(font)), lazy=True).getBestCmap()}


def distance_alpha(mask, embolden):
    """Turns a supersampled glyph mask into one cell of distance-field alpha.

    `mask` is a boolean array, true inside the glyph. `embolden` grows the
    outline by that many atlas pixels. Returns 8-bit alpha: 128 on the outline,
    rising to 255 SPREAD_INSIDE pixels inside it and falling to 0
    SPREAD_OUTSIDE pixels outside and on the cell's outermost pixels.
    """
    import numpy
    from scipy import ndimage

    inside = ndimage.distance_transform_edt(mask)
    outside = ndimage.distance_transform_edt(~mask)
    signed = (inside - outside) / SUPERSAMPLE + embolden
    signed = signed.reshape(CELL, SUPERSAMPLE, CELL, SUPERSAMPLE).mean(axis=(1, 3))
    alpha = numpy.where(signed >= 0, 0.5 + 0.5 * signed / SPREAD_INSIDE, 0.5 + 0.5 * signed / SPREAD_OUTSIDE)
    alpha = numpy.clip(alpha * 255 + 0.5, 0, 255).astype(numpy.uint8)
    # Glyphs that overshoot their em box leave a faint field at the cell edge; neighbors must not sample it.
    alpha[0, :] = alpha[-1, :] = 0
    alpha[:, 0] = alpha[:, -1] = 0
    return alpha


def ink_center(font, characters):
    """Returns the mean offset of the characters' ink from a middle-anchored draw position."""
    xs, ys = [], []
    for character in characters:
        box = font.getbbox(character, anchor="mm")
        xs.append((box[0] + box[2]) / 2)
        ys.append((box[1] + box[3]) / 2)
    return sum(xs) / len(xs), sum(ys) / len(ys)


def lettering(output, extra):
    """Writes the glyph atlas and the layout module the compiler reads it with."""
    import numpy

    ideographs = sorted(set(re.findall("[\u3400-\u9fff]", VOCABULARY.read_text(encoding="utf8"))) | set(extra))
    characters = LATIN + "".join(character for character in ideographs if character not in LATIN)
    columns = ATLAS // CELL
    if len(characters) > columns * ROWS_PER_FACE:
        raise SystemExit(f"{len(characters)} characters exceed the {columns * ROWS_PER_FACE} cells of a face.")
    if len(FACES) * ROWS_PER_FACE * CELL > ATLAS:
        raise SystemExit("The faces do not fit the atlas.")
    big = CELL * SUPERSAMPLE
    em = EM * SUPERSAMPLE
    alpha = numpy.zeros((ATLAS, ATLAS), numpy.uint8)
    advances = {}
    substituted = {}
    for face_index, (face, ideograph_fonts, latin_fonts, embolden) in enumerate(FACES):
        # Ideographs: each font is shifted so its reference characters sit centered in the cell.
        loaded = []
        for font in ideograph_fonts:
            opened = load_font(font, em)
            covered = covered_characters(font)
            references = [c for c in REFERENCE_IDEOGRAPHS if c in covered] or ["\u4e00"]
            loaded.append((opened, covered, ink_center(opened, references), font[1]))
        # Capitals: scaled to the common cap height, or smaller where the widest letter needs room.
        latin_font = latin_fonts[0]
        probe = load_font(latin_font, em)
        cap = probe.getbbox("H", anchor="ls")
        cap_pixels = cap[3] - cap[1]
        widest = max(probe.getlength(character) for character in LATIN)
        scale = min(CAP_HEIGHT * em / cap_pixels, 0.98 * em / widest)
        latin = load_font(latin_font, max(8, round(em * scale)))
        cap = latin.getbbox("H", anchor="ls")
        baseline = big / 2 + (cap[3] - cap[1]) / 2 - cap[3]
        advances[face] = [round(latin.getlength(character) / em, 4) for character in " " + LATIN]
        for index, character in enumerate(characters):
            image = Image.new("L", (big, big), 0)
            draw = ImageDraw.Draw(image)
            if character in LATIN:
                draw.text((big / 2, baseline), character, font=latin, fill=255, anchor="ms")
            else:
                for opened, covered, (dx, dy), name in loaded:
                    if character in covered:
                        draw.text((big / 2 - dx, big / 2 - dy), character, font=opened, fill=255, anchor="mm")
                        if opened is not loaded[0][0]:
                            substituted.setdefault(face, []).append(character)
                        break
                else:
                    raise SystemExit(f"No font of face {face} has {character}.")
            mask = numpy.asarray(image) >= 128
            if mask[0].any() or mask[-1].any() or mask[:, 0].any() or mask[:, -1].any():
                raise SystemExit(f"{character} of face {face} does not fit its cell.")
            row = face_index * ROWS_PER_FACE + index // columns
            column = index % columns
            alpha[row * CELL:(row + 1) * CELL, column * CELL:(column + 1) * CELL] = distance_alpha(mask, embolden * EM)
        print(f"lettered {face}")
    white = Image.new("L", (ATLAS, ATLAS), 255)
    Image.merge("LA", (white, Image.fromarray(alpha, "L"))).save(output, optimize=True)
    for face, missing in substituted.items():
        print(f"{face} borrows {''.join(missing)} from its fallback font")
    write_layout(characters, columns, advances)


def write_layout(characters, columns, advances):
    """Writes the TypeScript module describing the atlas just painted."""
    faces = ", ".join(f'"{face}"' for face, *_ in FACES)
    escaped = characters.replace("\\", "\\\\").replace('"', '\\"')
    lines = [
        "// Generated by tools/kowloon-kit-textures.py together with lettering.png. Do not edit.",
        "",
        "/**",
        " * Layout of the lettering atlas. Glyphs occupy square cells in rows from the",
        " * top left; each face owns `rows` consecutive rows and stores `characters`",
        " * in order. A cell is an em box with a margin for the distance field.",
        " */",
        "export const ATLAS = {",
        "  /** Texture edge, pixels. */",
        f"  size: {ATLAS},",
        "  /** Cell edge, pixels. */",
        f"  cell: {CELL},",
        "  /** Edge of the em box centered in each cell, pixels. */",
        f"  em: {EM},",
        f"  columns: {columns},",
        "  /** Rows of cells each face owns. */",
        f"  rows: {ROWS_PER_FACE},",
        f"  faces: [{faces}],",
        "  /** Every lettered character in cell order: capitals, digits and punctuation, then ideographs. */",
        f'  characters: "{escaped}",',
        "  /** The characters `advances` lists, in order; ideographs always advance one em. */",
        f'  latin: " {LATIN}",',
        "  /** Advance width of each `latin` character per face, ems. */",
        "  advances: {",
        *[f"    {face}: {advances[face]}," for face, *_ in FACES],
        "  },",
        "} as const;",
        "",
    ]
    LAYOUT_MODULE.write_text("\n".join(lines), encoding="utf8")
    print(f"wrote {LAYOUT_MODULE.relative_to(REPOSITORY)}")


def spectral_noise(size, generator, exponent, vertical=1.0):
    """Returns tileable noise as a float array of ranks in [0, 1].

    White noise is shaped in the frequency domain, so the field wraps without
    a seam. A larger `exponent` gives broader features; `vertical` above 1
    stretches them along the image's vertical axis into streaks.
    """
    import numpy

    fy = numpy.fft.fftfreq(size)[:, None] * vertical
    fx = numpy.fft.fftfreq(size)[None, :]
    radius = numpy.sqrt(fx * fx + fy * fy)
    radius[0, 0] = 1
    spectrum = numpy.fft.fft2(generator.standard_normal((size, size))) * radius ** -exponent
    spectrum[0, 0] = 0
    field = numpy.real(numpy.fft.ifft2(spectrum))
    ranks = numpy.empty(size * size)
    ranks[numpy.argsort(field, axis=None)] = numpy.linspace(0, 1, size * size)
    return ranks.reshape(size, size)


def smoothstep(low, high, value):
    """Returns 0 below `low`, 1 above `high`, and a smooth ramp between."""
    import numpy

    t = numpy.clip((value - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)


def run_down(mask, length):
    """Smears a mask down the image with an exponential tail `length` pixels long, wrapping."""
    import numpy

    trail = mask.copy()
    for step in range(1, int(length * 3)):
        trail = numpy.maximum(trail, numpy.roll(mask, step, axis=0) * math.exp(-step / length))
    return trail


def save_rgb(color, output):
    """Saves a float RGB array in [0, 1] as an 8-bit image."""
    import numpy

    Image.fromarray(numpy.clip(color * 255 + 0.5, 0, 255).astype(numpy.uint8), "RGB").save(output, optimize=True)


def signboard(output, size=1024):
    """Painted sign sheet: near white, with dirt washed down it, rust blooms and chipped paint."""
    import numpy

    generator = numpy.random.default_rng(21)
    color = numpy.full((size, size, 3), 0.95)
    color *= (0.955 + 0.045 * spectral_noise(size, generator, 2.2))[..., None]
    # Dirt runs: fine streaks gathered into irregular washes.
    streaks = smoothstep(0.55, 0.98, spectral_noise(size, generator, 0.95, vertical=22))
    washes = smoothstep(0.35, 0.95, spectral_noise(size, generator, 1.7, vertical=5))
    patchy = 0.25 + 0.75 * spectral_noise(size, generator, 2.2)
    dirt = numpy.clip(streaks * (0.1 + 0.3 * washes * patchy), 0, 1)
    color *= 1 - dirt[..., None] * numpy.array([0.85, 0.95, 1.1])
    # Rust blooms where the paint failed, bleeding down the sheet.
    seeds = spectral_noise(size, generator, 1.1) > 0.9965
    blooms = numpy.asarray(
        Image.fromarray((seeds * 255).astype(numpy.uint8)).filter(ImageFilter.GaussianBlur(2.2)), dtype=float
    ) / 255
    blooms = numpy.clip(blooms * 3.2, 0, 1)
    runs = run_down(blooms, 26) * (0.5 + 0.5 * spectral_noise(size, generator, 1.2, vertical=10))
    stain = numpy.clip(0.85 * blooms + 0.42 * runs, 0, 1)[..., None]
    color = color * (1 - stain) + numpy.array([0.52, 0.28, 0.14]) * stain
    # Chips expose darker undercoat; fine grain keeps flat paint from looking printed.
    chips = smoothstep(0.988, 0.994, spectral_noise(size, generator, 0.9))
    color *= 1 - 0.3 * chips[..., None]
    color *= (1 + 0.02 * (generator.standard_normal((size, size)).clip(-2, 2)))[..., None]
    save_rgb(color, output)


def rust(output, size=1024):
    """Rusted structural steel in full color: scale, pitting and islands of surviving gray paint."""
    import numpy

    generator = numpy.random.default_rng(22)
    broad = spectral_noise(size, generator, 1.7)
    middle = spectral_noise(size, generator, 1.15)
    fine = spectral_noise(size, generator, 0.65)
    tone = 0.36 * broad + 0.36 * middle + 0.28 * fine
    stops = [0.2, 0.36, 0.5, 0.64, 0.8]
    palette = numpy.array([[0.12, 0.075, 0.055], [0.23, 0.125, 0.075], [0.36, 0.18, 0.095], [0.5, 0.26, 0.115], [0.6, 0.36, 0.16]])
    color = numpy.stack([numpy.interp(tone, stops, palette[:, channel]) for channel in range(3)], axis=-1)
    # Pits and flaking scale.
    color *= 1 - 0.45 * smoothstep(0.88, 0.95, fine)[..., None]
    scale = smoothstep(0.78, 0.84, spectral_noise(size, generator, 1.0))
    color *= 1 + 0.2 * scale[..., None]
    # Small islands of old paint with a dark undercut rim.
    islands = 0.6 * spectral_noise(size, generator, 1.5) + 0.4 * spectral_noise(size, generator, 0.9)
    paint = smoothstep(0.735, 0.75, islands)
    rim = smoothstep(0.71, 0.735, islands) * (1 - paint)
    gray = numpy.array([0.46, 0.48, 0.47]) * (0.8 + 0.2 * fine)[..., None]
    color = color * (1 - 0.5 * rim[..., None])
    color = color * (1 - 0.8 * paint[..., None]) + gray * 0.8 * paint[..., None]
    # Water tracks down a member leave it darker in streaks.
    color *= 1 - 0.14 * smoothstep(0.6, 1.0, spectral_noise(size, generator, 1.6, vertical=12))[..., None]
    color *= (1 + 0.035 * generator.standard_normal((size, size)).clip(-2, 2))[..., None]
    save_rgb(color, output)


def blotches(size, cells, low, high, seed):
    """Returns tileable smooth noise in [low, high] as an L image."""
    rng = random.Random(seed)
    small = Image.new("L", (cells, cells))
    small.putdata([rng.randint(low, high) for _ in range(cells * cells)])
    tiled = Image.new("L", (cells * 3, cells * 3))
    for i in range(3):
        for j in range(3):
            tiled.paste(small, (i * cells, j * cells))
    big = tiled.resize((size * 3, size * 3), Image.BICUBIC)
    return big.crop((size, size, size * 2, size * 2))


def grain(size, seed, strength):
    """Returns fine per-pixel noise around mid gray as an L image."""
    rng = random.Random(seed)
    image = Image.new("L", (size, size))
    image.putdata([128 + int(rng.gauss(0, strength)) for _ in range(size * size)])
    return image


def shaded(base, *layers):
    """Multiplies an RGB image by gray layers, treating 128 as no change."""
    result = base
    for layer in layers:
        doubled = layer.point(lambda v: min(255, v * 2))
        result = ImageChops.multiply(result, Image.merge("RGB", (doubled,) * 3))
    return result


def metal(output, size=512):
    """Painted steel: near white with chips, scuffs and bleeding rust specks."""
    rng = random.Random(11)
    image = shaded(Image.new("RGB", (size, size), (238, 238, 236)), blotches(size, 6, 112, 128, 1), grain(size, 2, 3))
    draw = ImageDraw.Draw(image, "RGBA")
    for _ in range(90):
        x, y, r = rng.randrange(size), rng.randrange(size), rng.randint(1, 4)
        run = rng.randint(4, 40)
        for dx in (-size, 0, size):
            for dy in (-size, 0, size):
                draw.ellipse([x + dx - r, y + dy - r, x + dx + r, y + dy + r], fill=(120, 70, 40, 150))
                draw.rectangle([x + dx - 1, y + dy, x + dx + 1, y + dy + run], fill=(130, 80, 45, 40))
    for _ in range(40):
        x, y, length = rng.randrange(size), rng.randrange(size), rng.randint(10, 70)
        draw.line([x, y, x + length, y + rng.randint(-6, 6)], fill=(255, 255, 255, 70), width=1)
    image.filter(ImageFilter.GaussianBlur(0.6)).save(output, optimize=True)


def sheet(output, size=512):
    """Corrugated sheet: eight vertical waves per tile with run-off streaks."""
    rng = random.Random(12)
    waves = Image.new("L", (size, 1))
    waves.putdata([int(120 - 26 * math.cos(2 * math.pi * x / (size / 8)) ** 1) for x in range(size)])
    image = shaded(Image.new("RGB", (size, size), (236, 238, 238)), waves.resize((size, size)), blotches(size, 5, 108, 128, 3), grain(size, 4, 3))
    draw = ImageDraw.Draw(image, "RGBA")
    for _ in range(46):
        x, y, run = rng.randrange(size), rng.randrange(size), rng.randint(30, 220)
        for dy in (-size, 0, size):
            draw.rectangle([x, y + dy, x + rng.randint(1, 3), y + dy + run], fill=(120, 72, 40, rng.randint(25, 70)))
    image.filter(ImageFilter.GaussianBlur(0.5)).save(output, optimize=True)


def timber(output, size=512):
    """Painted boards: four vertical boards per tile with raised grain."""
    rng = random.Random(13)
    streaks = Image.new("L", (64, 1))
    streaks.putdata([128 + int(rng.gauss(0, 7)) for _ in range(64)])
    fine = Image.new("L", (size, 1))
    fine.putdata([128 + int(rng.gauss(0, 3)) for _ in range(size)])
    image = shaded(
        Image.new("RGB", (size, size), (236, 234, 228)),
        streaks.resize((size, size), Image.BICUBIC),
        fine.resize((size, size)),
        blotches(size, 5, 114, 128, 5),
    )
    draw = ImageDraw.Draw(image, "RGBA")
    for board in range(4):
        x = board * size // 4
        draw.rectangle([x, 0, x + 2, size], fill=(40, 34, 28, 170))
        draw.rectangle([x + 3, 0, x + 4, size], fill=(255, 255, 255, 60))
    for _ in range(30):
        x, y = rng.randrange(size), rng.randrange(size)
        draw.ellipse([x - 3, y - 6, x + 3, y + 6], outline=(90, 74, 60, 90))
    image.save(output, optimize=True)


PAINTERS = {
    "metal": metal,
    "sheet": sheet,
    "timber": timber,
    "signboard": signboard,
    "rust": rust,
}


def main(arguments):
    extra = ""
    if "--extra" in arguments:
        at = arguments.index("--extra")
        extra = arguments[at + 1]
        del arguments[at:at + 2]
    target = Path(arguments[0])
    names = arguments[1:] or ["lettering", *PAINTERS]
    unknown = [name for name in names if name != "lettering" and name not in PAINTERS]
    if unknown:
        raise SystemExit(f"Unknown texture {unknown[0]}; choose from lettering, {', '.join(PAINTERS)}.")
    target.mkdir(parents=True, exist_ok=True)
    for name in names:
        if name == "lettering":
            lettering(target / "lettering.png", extra)
        else:
            PAINTERS[name](target / f"{name}.png")
        print(f"wrote {target / (name + '.png')}")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1].startswith("-"):
        raise SystemExit(__doc__)
    main(sys.argv[1:])
