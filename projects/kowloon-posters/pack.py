"""Pack generated artwork without repainting it; extruded gutters protect shared mipmaps."""
from pathlib import Path
import hashlib
import shutil
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
items = json.loads((ROOT / 'prompts.json').read_text())['posters']
atlas = Image.new('RGB', (2048, 3072))
contact = Image.new('RGB', (1440, 2280), '#242726')
labels = ImageDraw.Draw(contact)
manifest = []
for index, item in enumerate(items):
    source = ROOT / 'source' / (item['id'] + '.png')
    image = Image.open(source).convert('RGB')
    assert image.width * 3 == image.height * 2, (source, image.size)
    art = image.resize((480, 720), Image.Resampling.LANCZOS)
    cell = Image.new('RGB', (512, 768))
    cell.paste(art, (16, 24))
    cell.paste(art.crop((0, 0, 1, 720)).resize((16, 720)), (0, 24))
    cell.paste(art.crop((479, 0, 480, 720)).resize((16, 720)), (496, 24))
    cell.paste(cell.crop((0, 24, 512, 25)).resize((512, 24)), (0, 0))
    cell.paste(cell.crop((0, 743, 512, 744)).resize((512, 24)), (0, 744))
    x, y = index % 4, index // 4
    atlas.paste(cell, (x * 512, y * 768))
    contact.paste(image.resize((336, 504), Image.Resampling.LANCZOS), (x*360+12, y*570+12))
    labels.text((x*360+12, y*570+530), item['id'], fill='#eee6d7')
    manifest.append({'id': item['id'], 'category': item['category'], 'source': str(source.relative_to(ROOT)),
                     'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'cell': [x,y]})
output = ROOT / 'textures' / 'posters-atlas.jpg'
atlas.save(output, quality=90, subsampling=0, optimize=True)
contact.save(ROOT / 'contact-sheet.jpg', quality=90)
# Portable project packages retain an exact local copy of the one canonical atlas.
for relative in ['../../src/materials/library/posters-atlas.jpg', '../dressing-demo/textures/posters-atlas.jpg', '../dragon-ford/kowloon/textures/posters-atlas.jpg']:
    destination = ROOT / relative
    if destination.parent.exists():
        shutil.copyfile(output, destination)

(ROOT / 'atlas.json').write_text(json.dumps({'size': [2048,3072], 'cellSize': [512,768],
    'artSize': [480,720], 'gutter': [16,24], 'bytes': output.stat().st_size,
    'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'posters': manifest}, indent=2)+'\n')
print(f'{len(items)} designs, {output.stat().st_size:,} bytes, 2048×3072')
