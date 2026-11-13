#!/usr/bin/env python3
"""Build paginated schematic/model reference boards and contextual pair sheets.

python build-comparison-review.py references.json \
    comparisons.json --output review/revision-01
Paths resolve relative to their own manifest. Use a new/empty output directory.
Camera matching and source coverage require human review; no automatic signoff.
"""
import argparse
import hashlib
import html
import importlib.util
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


spec = importlib.util.spec_from_file_location(
    'comparison', Path(__file__).with_name('compare-model-reference.py'))
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


def required_text(record, key):
    value = record.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'{key}: nonempty text is required')
    return value


def image_records(records, base, source=False):
    if not isinstance(records, list) or not records:
        raise ValueError('sources/views must be a nonempty list')
    result = {}
    for record in records:
        identifier = required_text(record, 'id')
        if identifier in result:
            raise ValueError(f'Duplicate image ID: {identifier}')
        required_text(record, 'view')
        if source:
            required_text(record, 'provenance')
        path = (base / required_text(record, 'image')).resolve()
        with Image.open(path) as im:
            im.load()
            size = im.size
        result[identifier] = {**record, 'path': str(path), 'size': size,
                              'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    return result


def check_box(value, size, label):
    if not isinstance(value, list) or len(value) != 4:
        raise ValueError(f'{label}: expected [left, top, right, bottom]')
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or
           not math.isfinite(v) for v in value):
        raise ValueError(f'{label}: coordinates must be finite numbers')
    x0, y0, x1, y1 = value
    if not (0 <= x0 < x1 <= size[0] and 0 <= y0 < y1 <= size[1]):
        raise ValueError(f'{label}: box falls outside image/frame')


def validate(refs, data, sources, candidates):
    if data.get('stage') not in ('schematic', 'model'):
        raise ValueError('stage must be schematic or model')
    required_text(data, 'revision')
    regions = {}
    for region in refs.get('regions', []):
        identifier = required_text(region, 'id')
        if identifier in regions:
            raise ValueError(f'Duplicate region ID: {identifier}')
        for observation in region['observations']:
            if observation['source'] not in sources:
                raise ValueError(f'{identifier}: unknown observation source')
            check_box(observation['crop'], sources[observation['source']]['size'], identifier)
        regions[identifier] = region
    pairs = data.get('comparisons')
    if not isinstance(pairs, list):
        raise ValueError('comparisons must be a list (may be empty for a diagnostic overview)')
    for pair in pairs:
        if pair.get('source') not in sources or pair.get('candidate') not in candidates:
            raise ValueError('comparison refers to an unknown source or candidate ID')
        if pair.get('camera') not in ('matched', 'diagnostic'):
            raise ValueError('each comparison needs camera: matched or diagnostic')
        if not isinstance(pair.get('overlay', False), bool):
            raise ValueError('overlay must be boolean')
        if pair.get('overlay') and pair['camera'] != 'matched':
            raise ValueError('overlay requires a declared matched camera')
        if ('reference_contours' in pair) != ('candidate_contours' in pair):
            raise ValueError('reference_contours and candidate_contours must be supplied together')
        if 'reference_contours' in pair:
            required_text(pair, 'reference_contours')
            required_text(pair, 'candidate_contours')
        if pair.get('region') is not None:
            region = regions.get(pair['region'])
            if region is None or pair['source'] not in {
                    o['source'] for o in region['observations']}:
                raise ValueError('region must exist and contain this source observation')
        for role, record in [('reference', sources[pair['source']]),
                             ('candidate', candidates[pair['candidate']])]:
            crop = pair.get(role + '_crop')
            size = record['size']
            if crop is not None:
                check_box(crop, size, role + '_crop')
                size = (crop[2] - crop[0], crop[3] - crop[1])
            if pair.get(role + '_anchor') is not None:
                check_box(pair[role + '_anchor'], size, role + '_anchor')
    gaps = []
    for identifier in sources:
        if not any(p['source'] == identifier for p in pairs):
            gaps.append(f'Source {identifier}: overview only; no focused comparison')
    for identifier in candidates:
        if not any(p['candidate'] == identifier for p in pairs):
            gaps.append(f'Candidate {identifier}: overview only; no focused comparison')
    for identifier, region in regions.items():
        for source_id in sorted({o['source'] for o in region['observations']}):
            if not any(p.get('region') == identifier and p['source'] == source_id for p in pairs):
                gaps.append(f'Region {identifier}, source {source_id}: no focused comparison')
    for index, pair in enumerate(pairs):
        if pair['camera'] == 'diagnostic':
            gaps.append(f'Comparison {index + 1}: diagnostic camera/pose mismatch')
    return gaps


def font():
    try:
        return ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
    except OSError:
        return ImageFont.load_default(size=20)


def text_block(text, width):
    """Wrap even long URLs/IDs so revision and provenance labels cannot clip."""
    face = font()
    draw = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    lines = []
    for paragraph in str(text).splitlines():
        line = ''
        for char in paragraph:
            if line and draw.textlength(line + char, font=face) > width - 24:
                lines.append(line)
                line = ''
            line += char
        lines.append(line)
    block = Image.new('RGB', (width, 20 + len(lines) * 26), '#fafafa')
    draw = ImageDraw.Draw(block)
    for index, line in enumerate(lines):
        draw.text((12, 10 + index * 26), line, fill='#111', font=face)
    return block


def tile(record, label, width=600, height=420, crop=None, anchor=None, context=False):
    heading = text_block(label, width)
    if context:
        im, _ = comparison.context_panel(record['path'], crop, width, height)
    else:
        im = comparison.panel(record['path'], crop, 0, anchor, width, height)
    out = Image.new('RGB', (width, heading.height + height), '#fafafa')
    out.paste(heading, (0, 0))
    out.paste(im, (0, heading.height))
    return out


def image_tile(im, label):
    heading = text_block(label, im.width)
    out = Image.new('RGB', (im.width, heading.height + im.height), '#fafafa')
    out.paste(heading)
    out.paste(im, (0, heading.height))
    return out


def grid(rows, heading):
    width = max(sum(im.width for im in row) for row in rows)
    title = text_block(heading, width)
    out = Image.new('RGB', (width, title.height + sum(max(im.height for im in row)
                                                    for row in rows)), '#fafafa')
    out.paste(title, (0, 0))
    y = title.height
    for row in rows:
        x = 0
        for im in row:
            out.paste(im, (x, y))
            x += im.width
        y += max(im.height for im in row)
    return out


def label(record, kind):
    kind = record.get('kind', kind)
    return (f'{kind}: {record["id"]} | {record["view"]}\n'
            f'State: {record.get("state", "unspecified")}')


def build(args):
    refs = json.loads(args.references.read_text())
    data = json.loads(args.comparisons.read_text())
    sources = image_records(refs['sources'], args.references.parent, source=True)
    candidates = image_records(data['views'], args.comparisons.parent)
    gaps = validate(refs, data, sources, candidates)
    contour_inputs = {}
    for index, pair in enumerate(data['comparisons']):
        if 'reference_contours' not in pair:
            continue
        contour_inputs[index] = {}
        for role, record in [('reference', sources[pair['source']]),
                             ('candidate', candidates[pair['candidate']])]:
            path = (args.comparisons.parent / pair[role + '_contours']).resolve()
            contour_inputs[index][role] = comparison.validate_contours(path, record['path'])
    asset = None
    if data.get('asset'):
        path = (args.comparisons.parent / data['asset']).resolve()
        asset = {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    if args.output.exists() and any(args.output.iterdir()):
        raise ValueError('output must be a new or empty directory; preserve frozen review revisions')
    args.output.mkdir(parents=True, exist_ok=True)
    if asset:
        asset['snapshot'] = 'editable-asset' + Path(asset['path']).suffix
        shutil.copyfile(asset['path'], args.output / asset['snapshot'])
    for kind, records in [('reference', sources), ('candidate', candidates)]:
        for index, record in enumerate(records.values()):
            path = Path(record['path'])
            filename = f'{kind}-{index:03}{path.suffix.lower()}'
            shutil.copyfile(path, args.output / filename)
            record['snapshot'] = filename
    for index, records in contour_inputs.items():
        for role, record in records.items():
            filename = f'comparison-{index + 1:03}-{role}-contours.png'
            shutil.copyfile(record['path'], args.output / filename)
            record['snapshot'] = filename
    stage = data['stage'].capitalize()
    heading = f'{stage} review | revision: {data["revision"]}'
    if asset:
        heading += f'\nEditable asset SHA256: {asset["sha256"]}'
    pages = []
    source_list, candidate_list = list(sources.values()), list(candidates.values())
    for cstart in range(0, len(candidate_list), 2):
        for sstart in range(0, len(source_list), 4):
            ss = source_list[sstart:sstart + 4]
            cc = candidate_list[cstart:cstart + 2]
            rows = []
            for row in range(2):
                cells = []
                for column in range(2):
                    index = row * 2 + column
                    cells.append(tile(ss[index], label(ss[index], 'Reference'), context=True)
                                 if index < len(ss) else Image.new('RGB', (600, 492), '#fafafa'))
                cells.append(tile(cc[row], label(cc[row], stage), context=True)
                             if row < len(cc) else Image.new('RGB', (600, 492), '#fafafa'))
                rows.append(cells)
            filename = f'overview-{len(pages) + 1:03}.png'
            grid(rows, heading + f'\nOverview {len(pages) + 1}: context only; inspect detail sheets').save(args.output / filename)
            pages.append({'image': filename, 'sources': [r['id'] for r in ss],
                          'candidates': [r['id'] for r in cc]})
    details = []
    for index, pair in enumerate(data['comparisons']):
        source, candidate = sources[pair['source']], candidates[pair['candidate']]
        row, context, traced_row, lines, transforms = [], [], [], [], {}
        for role, record, kind in [('reference', source, 'Reference'),
                                   ('candidate', candidate, stage)]:
            crop, anchor = pair.get(role + '_crop'), pair.get(role + '_anchor')
            row.append(tile(record, label(record, kind) + f'\nCrop: {crop}; anchor: {anchor}',
                            800, 580, crop, anchor))
            context_note = 'crop box in pink' if crop is not None else 'uncropped original'
            context.append(tile(record, f'Full {kind}: {record["id"]}; {context_note}',
                                800, 580, crop, context=True))
            if index in contour_inputs:
                traced, strokes, transform = comparison.contour_panels(
                    record['path'], contour_inputs[index][role]['path'], crop, 0, anchor, 800, 580)
                traced_row.append(image_tile(traced, f'{kind} + reviewer contours: {record["id"]}'))
                lines.append(strokes)
            else:
                _, transform = comparison.prepare_panel(record['path'], crop, 0, anchor, 800, 580)
            transforms[role] = transform
        if pair.get('overlay'):
            blended = Image.blend(
                comparison.panel(source['path'], pair.get('reference_crop'), 0,
                                 pair.get('reference_anchor'), 800, 580),
                comparison.panel(candidate['path'], pair.get('candidate_crop'), 0,
                                 pair.get('candidate_anchor'), 800, 580), .5)
            title = text_block('50% overlay: declared matched camera; verify visually', 800)
            overlay = Image.new('RGB', (800, title.height + 580), '#fafafa')
            overlay.paste(title)
            overlay.paste(blended, (0, title.height))
            row.append(overlay)
        registered_lines = bool(traced_row) and pair['camera'] == 'matched'
        if registered_lines:
            traced_row.append(image_tile(comparison.line_alignment(*lines),
                              'Reviewer lines: reference magenta / candidate cyan; verify camera and geometry'))
        filename = f'comparison-{index + 1:03}.png'
        note = pair.get('note', '')
        status = 'Declared matched view — verify' if pair['camera'] == 'matched' else 'DIAGNOSTIC — camera/pose mismatch'
        if traced_row and not registered_lines:
            note += '\nDiagnostic contour views: no registered line overlay or acceptance.'
        rows = [row] + ([traced_row] if traced_row else []) + [context]
        grid(rows, heading + f'\n{status} | region: {pair.get("region", "whole view")}\n{note}').save(args.output / filename)
        details.append({**pair, 'image': filename, 'transforms': transforms,
                        'registered_line_overlay': registered_lines,
                        **({'contours': contour_inputs[index]} if index in contour_inputs else {})})
    escape = html.escape
    body = ['<!doctype html><meta charset="utf-8"><title>Comparison review</title>',
            '<style>body{font:18px system-ui;margin:32px}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #aaa;padding:8px}</style>',
            f'<h1>{escape(heading)}</h1>',
            '<p>Review evidence, not acceptance. Inspect source-only evidence first. Matching cameras and factual coverage require human verification.</p>']
    if gaps:
        body += ['<h2>Unresolved comparison coverage</h2><ul>']
        body += [f'<li>{escape(gap)}</li>' for gap in gaps]
        body += ['</ul>']
    body += ['<h2>Native images and comparison coverage</h2><table>',
             '<tr><th>Kind / ID</th><th>View / state</th><th>Provenance / identity</th><th>Comparisons</th></tr>']
    for kind, records, key in [('Reference', sources, 'source'), (stage, candidates, 'candidate')]:
        for record in records.values():
            links = ' '.join(f'<a href="{p["image"]}">{i + 1}</a>' for i, p in enumerate(details)
                             if p[key] == record['id']) or 'Overview only'
            provenance = record.get('provenance', '') + ' ' + record.get('identity', '')
            body.append(f'<tr><td><a href="{record["snapshot"]}">{escape(kind + ": " + record["id"])}</a></td><td>{escape(record["view"] + " / " + record.get("state", "unspecified"))}</td><td>{escape(provenance)}</td><td>{links}</td></tr>')
    body += ['</table>']
    if contour_inputs:
        body += ['<h2>Native reviewer contour drawings</h2>',
                 '<p>Human-authored interpretations, not extracted edges or automatic geometry acceptance. Editable SVG companions stay with the project.</p><ul>']
        for index, records in contour_inputs.items():
            for role, record in records.items():
                body.append(f'<li><a href="{record["snapshot"]}">Comparison {index + 1}: {role} contours</a></li>')
        body += ['</ul>']
    for title, records in [('Overview boards', pages), ('Focused comparisons', details)]:
        body.append(f'<h2>{title}</h2>')
        for record in records:
            body.append(f'<figure><a href="{record["image"]}"><img src="{record["image"]}"></a><figcaption>{record["image"]}</figcaption></figure>')
    (args.output / 'index.html').write_text('\n'.join(body))
    evidence = {'stage': data['stage'], 'revision': data['revision'], 'asset': asset,
                'status': 'incomplete-comparison-coverage' if gaps else 'ready-for-visual-review',
                'gaps': gaps, 'sources': list(sources.values()), 'views': list(candidates.values()),
                'regions': refs.get('regions', []), 'overviews': pages, 'comparisons': details,
                'manifests': {'references': comparison.input_record(args.references),
                              'comparisons': comparison.input_record(args.comparisons)}}
    (args.output / 'evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
    shutil.copyfile(args.references, args.output / 'references-manifest.json')
    shutil.copyfile(args.comparisons, args.output / 'comparison-manifest.json')
    print(args.output / 'index.html')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('references', type=Path)
    parser.add_argument('comparisons', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    try:
        build(args)
    except (ValueError, OSError, KeyError, TypeError) as exc:
        parser.error(str(exc))


if __name__ == '__main__':
    main()
