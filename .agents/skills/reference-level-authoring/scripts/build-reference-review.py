#!/usr/bin/env python3
"""Build a source-only multi-angle review packet with contextual detail crops.

python build-reference-review.py manifest.json --output /tmp/review (optional Pillow)
Paths are relative to the manifest. View labels are declarations requiring visual
review, not an automatic camera classifier. No source pixels are synthesized.
"""
import argparse
import hashlib
import html
import importlib.util
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


spec = importlib.util.spec_from_file_location('packet', Path(__file__).with_name('build-comparison-review.py'))
packet = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packet)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--allow-incomplete', action='store_true',
                        help='Emit explicitly incomplete evidence; never an acceptance packet')
    args = parser.parse_args()
    data = json.loads(args.manifest.read_text())
    sources = packet.image_records(data['sources'], args.manifest.parent, source=True)
    hashes = set()
    gaps = []
    for source in sources.values():
        # Metadata/recompression can change file bytes without providing new evidence.
        with Image.open(source['path']) as image:
            pixels = image.convert('RGBA')
            digest = hashlib.sha256(str(pixels.size).encode() + pixels.tobytes()).hexdigest()
        source['pixel_sha256'] = digest
        hashes.add(digest)
    if len(hashes) < 3 or len({s['view'] for s in sources.values()}) < 3:
        gaps.append('Need at least three distinct originals and declared views for whole-object coverage.')
    region_ids = set()
    for region in data.get('regions', []):
        identifier = packet.required_text(region, 'id')
        packet.required_text(region, 'question')
        if identifier in region_ids:
            parser.error(f'Duplicate region ID: {identifier}')
        region_ids.add(identifier)
        observations = region['observations']
        views = set()
        originals = set()
        for observation in observations:
            if observation['source'] not in sources:
                parser.error(f'{identifier}: unknown observation source')
            source = sources[observation['source']]
            views.add(source['view'])
            originals.add(source['pixel_sha256'])
            packet.check_box(observation['crop'], source['size'], identifier)
        if len(views) < 2 or len(originals) < 2:
            gaps.append(f"{region['id']}: need focused observations from two different originals/views.")
    if gaps and not args.allow_incomplete:
        parser.error('\n'.join(gaps) + '\nFind additional views or use --allow-incomplete to document the gap.')

    spec = importlib.util.spec_from_file_location('comparison', Path(__file__).with_name('compare-model-reference.py'))
    comparison = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(comparison)
    if args.output.exists() and any(args.output.iterdir()):
        parser.error('output must be a new or empty directory; preserve frozen review revisions')
    args.output.mkdir(parents=True, exist_ok=True)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
    except OSError:
        font = ImageFont.load_default(size=18)
    escape = html.escape
    pages = ['<!doctype html><meta charset="utf-8"><title>Reference review</title>',
             '<style>body{font:18px system-ui;max-width:1500px;margin:32px auto;padding:20px}img{max-width:100%}figure{margin:24px 0}li{margin:12px 0}</style>',
             '<h1>Source-only multi-view review</h1>',
             '<p>Inspect all views and crops. Declared angles require verification using shared landmarks. This packet covers only the listed building regions, not architectural acceptance or hidden connections.</p>']
    if gaps:
        pages.append('<h2>INCOMPLETE — unresolved coverage</h2><ul>' + ''.join(f'<li>{escape(gap)}</li>' for gap in gaps) + '</ul>')
    pages.append('<h2>Whole-object context</h2>')
    for index, source in enumerate(sources.values()):
        filename = f'source-{index:02}.png'
        image, _ = comparison.context_panel(source['path'], None, 900, 650)
        image.save(args.output / filename)
        original = f'original-{index:02}{Path(source["path"]).suffix.lower()}'
        shutil.copyfile(source['path'], args.output / original)
        source['snapshot'] = original
        pages.append(f'<figure><a href="{original}"><img src="{filename}"></a><figcaption>{escape(source["id"])} — {escape(source["view"])} — {escape(source.get("state", "state unspecified"))} — {escape(source["provenance"])}</figcaption><a href="{original}">Native-resolution original: {source["size"][0]} × {source["size"][1]} pixels</a></figure>')
    for region_index, region in enumerate(data.get('regions', [])):
        pages.append(f'<h2>{escape(region["id"])}</h2><p>{escape(region["question"])}</p>')
        for observation_index, observation in enumerate(region['observations']):
            source = sources[observation['source']]
            crop = observation['crop']
            sheet = Image.new('RGB', (1600, 650), '#fafafa')
            focus = comparison.panel(source['path'], crop, 0, None, 800, 580)
            context, _ = comparison.context_panel(source['path'], crop, 800, 580)
            sheet.paste(focus, (0, 60))
            sheet.paste(context, (800, 60))
            draw = ImageDraw.Draw(sheet)
            draw.text((16, 16), f'{source["id"]}: focused crop', fill='#111', font=font)
            draw.text((816, 16), 'Full original; pink box locates detail', fill='#111', font=font)
            filename = f'region-{region_index:02}-{observation_index:02}.png'
            sheet.save(args.output / filename)
            pages.append(f'<figure><img src="{filename}"><figcaption>{escape(source["view"])}; original-pixel crop {escape(str(crop))}</figcaption></figure>')
        pages.append('<p>Record: visible evidence · cross-view agreement · alternative optical explanations · unresolved depth/ownership. Revisit originals before constructing a component.</p>')
    pages.append('<p>Next: draw editable architectural schematics and independently review them against these originals before dependent XML modeling. Then regenerate comparison packets from actual compiled-model renders. Source coverage is not drawing or model acceptance.</p>')
    (args.output / 'index.html').write_text('\n'.join(pages))
    evidence = {'status': 'incomplete' if gaps else 'ready-for-visual-review', 'gaps': gaps,
                'sources': [{k: str(v) if isinstance(v, Path) else v for k, v in source.items()} for source in sources.values()],
                'regions': data.get('regions', []),
                'manifest': packet.comparison.input_record(args.manifest)}
    shutil.copyfile(args.manifest, args.output / 'references-manifest.json')
    (args.output / 'evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(args.output / 'index.html')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError) as exc:
        raise SystemExit(f'Invalid reference packet: {exc}') from None
