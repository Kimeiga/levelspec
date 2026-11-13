"""Pack imported color maps and bake vertex-color fallback; invoked by the Blender importer."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path.cwd()
SOURCE = ROOT / "generated/liquor-props/bake"
catalog = json.loads((SOURCE / "catalog.json").read_text())
atlases = {name: Image.new("RGB", (2560, 2048), fill) for name, fill in
           [("color", (160, 150, 130)), ("normal", (128, 128, 255)), ("properties", (255, 220, 0))]}


def linear(channel):
    """Convert encoded sRGB to the linear multipliers used by LevelSpec."""
    channel /= 255
    return channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4


for name, asset in catalog.items():
    source_name = asset.pop("sourceTexture", name)
    image = Image.open(SOURCE / f"{source_name}-color").convert("RGB")
    tile = asset.pop("tile")
    for channel, atlas in atlases.items():
        source = SOURCE / f"{source_name}-{channel}"
        if not source.exists():
            continue
        small = Image.open(source).convert("RGB").resize((504, 504), Image.Resampling.LANCZOS)
        padded = Image.new("RGB", (512, 512))
        padded.paste(small, (4, 4))
        for i in range(4):
            padded.paste(small.crop((0, 0, 504, 1)), (4, i))
            padded.paste(small.crop((0, 503, 504, 504)), (4, 508 + i))
        for i in range(4):
            padded.paste(padded.crop((4, 0, 5, 512)), (i, 0))
            padded.paste(padded.crop((507, 0, 508, 512)), (508 + i, 0))
        atlas.paste(padded, (tile % 5 * 512, tile // 5 * 512))
    for face in asset["faces"]:
        for vertex in face:
            u, v = vertex[-2:]
            x = min(image.width - 1, max(0, round(u * (image.width - 1))))
            y = min(image.height - 1, max(0, round((1 - v) * (image.height - 1))))
            vertex[-2:] = [linear(c) for c in image.getpixel((x, y))]
            vertex[:] = [round(value, 6) for value in vertex]
    asset["size"] = [round(value, 6) for value in asset["size"]]

for channel, atlas in atlases.items():
    suffix = "" if channel == "color" else "-" + channel
    atlas.save(ROOT / f"projects/dressing-demo/textures/grocer-props{suffix}.png")
(ROOT / "src/dressing/kowloon/shop/assets/grocer-props.json").write_text(
    json.dumps(catalog, separators=(",", ":")) + "\n")
