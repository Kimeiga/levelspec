#!/usr/bin/env python3
"""Create a labeled reference/model comparison, optionally including an overlay.

python compare-model-reference.py --help (requires optional Pillow)
Images are uniformly scaled, never stretched. For matched framing, provide the
same distributed building landmark box in each image.
Cropping and rotating are explicit; this tool cannot correct a camera mismatch.
Use --context to retain full, unrotated images and mark the requested crops.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def box(value):
    values = tuple(float(v) for v in value.split(','))
    if len(values) != 4 or values[2] <= values[0] or values[3] <= values[1]:
        raise argparse.ArgumentTypeError('Use left,top,right,bottom with positive extent')
    return values


def validate_contours(path, image_path):
    """A reviewer drawing must be native-sized, nonempty, transparent PNG."""
    with Image.open(image_path) as original, Image.open(path) as contours:
        if contours.format != 'PNG':
            raise ValueError(f'{path}: contours must be a transparent PNG')
        if contours.size != original.size:
            raise ValueError(f'{path}: contour dimensions must match the original image exactly')
        if 'A' not in contours.getbands() and 'transparency' not in contours.info:
            raise ValueError(f'{path}: contours must have a transparent background')
        alpha = contours.convert('RGBA').getchannel('A')
        low, high = alpha.getextrema()
        if high == 0:
            raise ValueError(f'{path}: empty contour overlay')
        if low != 0:
            raise ValueError(f'{path}: contours must have a transparent background')
        return {'path': str(Path(path).resolve()), 'size': list(contours.size),
                'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def prepare_panel(path, crop, rotate, anchor, width, height):
    """Derive framing ONCE from the image, never from contour stroke bounds."""
    with Image.open(path) as source:
        im = source.convert('RGBA')
        original_size = im.size
    if crop:
        im = im.crop(crop)
    if rotate:
        im = im.rotate(rotate, expand=True, resample=Image.Resampling.BICUBIC)
    # Anchor coordinates apply AFTER explicit crop/rotation.
    bounds = anchor or im.getbbox() or (0, 0, im.width, im.height)
    x0, y0, x1, y1 = bounds
    scale = min(width * .78 / (x1-x0), height * .78 / (y1-y0))
    scaled = im.resize((max(1, round(im.width*scale)), max(1, round(im.height*scale))), Image.Resampling.LANCZOS)
    left = round(width/2 - (x0+x1)*scale/2)
    top = round(height/2 - (y0+y1)*scale/2)
    transform = {'original_size': list(original_size), 'crop': list(crop) if crop else None,
                 'rotation_degrees_ccw': rotate, 'rotated_size': list(im.size),
                 'anchor': list(anchor) if anchor else None, 'framing_bounds': list(bounds),
                 'scale': scale, 'resized_size': list(scaled.size),
                 'translation': [left, top], 'panel_size': [width, height],
                 'rotation_resampling': 'bicubic', 'resize_resampling': 'lanczos'}
    return scaled, transform


def apply_transform(path, transform):
    """Apply the image's exact Pillow operations, including rounding, to a trace."""
    with Image.open(path) as source:
        im = source.convert('RGBA')
    if transform['crop']:
        im = im.crop(transform['crop'])
    if transform['rotation_degrees_ccw']:
        im = im.rotate(transform['rotation_degrees_ccw'], expand=True,
                       resample=Image.Resampling.BICUBIC)
    return im.resize(transform['resized_size'], Image.Resampling.LANCZOS)


def place_panel(scaled, transform, background='#eeeeee'):
    canvas = Image.new('RGBA', transform['panel_size'], background)
    canvas.alpha_composite(scaled, tuple(transform['translation']))
    return canvas


def panel(path, crop, rotate, anchor, width, height):
    scaled, transform = prepare_panel(path, crop, rotate, anchor, width, height)
    return place_panel(scaled, transform).convert('RGB')


def contour_panels(path, contours, crop, rotate, anchor, width, height):
    scaled, transform = prepare_panel(path, crop, rotate, anchor, width, height)
    canvas = place_panel(scaled, transform)
    lines = place_panel(apply_transform(contours, transform), transform, (0, 0, 0, 0))
    canvas.alpha_composite(lines)
    return canvas.convert('RGB'), lines, transform


def line_alignment(reference, candidate):
    """Recolor human-authored strokes; never infer or score geometry."""
    canvas = Image.new('RGBA', reference.size, '#eeeeee')
    for lines, color in [(reference, '#d124a9'), (candidate, '#00a9c7')]:
        layer = Image.new('RGBA', lines.size, color)
        layer.putalpha(lines.getchannel('A'))
        canvas.alpha_composite(layer)
    return canvas.convert('RGB')


def input_record(path):
    return {'path': str(Path(path).resolve()),
            'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def check_frame(path, crop, rotate, anchor):
    """Reject padding crops and anchors outside the post-rotation frame."""
    if not math.isfinite(rotate):
        raise ValueError('rotation must be finite')
    with Image.open(path) as source:
        size = source.size
        for bounds, label in [(crop, 'crop')]:
            if bounds and not (all(math.isfinite(v) for v in bounds) and
                               0 <= bounds[0] < bounds[2] <= size[0] and
                               0 <= bounds[1] < bounds[3] <= size[1]):
                raise ValueError(f'{label}: box falls outside image/frame')
        im = source.crop(crop) if crop else source
        if rotate:
            im = im.rotate(rotate, expand=True)
        if anchor and not (all(math.isfinite(v) for v in anchor) and
                           0 <= anchor[0] < anchor[2] <= im.width and
                           0 <= anchor[1] < anchor[3] <= im.height):
            raise ValueError('anchor: box falls outside image/frame')


def context_panel(path, crop, width, height):
    """Fit the entire original image, independent of crop, rotation, or anchor."""
    with Image.open(path) as source:
        im = source.convert('RGBA')
    scale = min(width * .9 / im.width, height * .9 / im.height)
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    left, top = (width - size[0]) // 2, (height - size[1]) // 2
    canvas = Image.new('RGBA', (width, height), '#eeeeee')
    canvas.alpha_composite(im.resize(size, Image.Resampling.LANCZOS), (left, top))
    if crop:
        x0, y0, x1, y1 = crop
        rectangle = (left + x0 * scale, top + y0 * scale,
                     left + x1 * scale, top + y1 * scale)
        draw = ImageDraw.Draw(canvas)
        draw.rectangle(rectangle, outline='white', width=6)
        draw.rectangle(rectangle, outline='#d12463', width=3)
    return canvas.convert('RGB'), im.size


def wrapped_lines(draw, text, font, width):
    lines = []
    line = ''
    for word in text.split():
        candidate = f'{line} {word}' if line else word
        if line and draw.textlength(candidate, font=font) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    return lines + [line]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for role in ['reference', 'model']:
        parser.add_argument('--'+role, required=True, type=Path)
        parser.add_argument('--'+role+'-crop', type=box)
        parser.add_argument('--'+role+'-rotate', type=float, default=0, help='Counterclockwise degrees before framing')
        parser.add_argument('--'+role+'-anchor', type=box, help='Body landmark box AFTER crop/rotation: left,top,right,bottom')
        parser.add_argument('--'+role+'-contours', type=Path, help='Reviewer-authored transparent PNG at original image dimensions; supply both roles')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--title', default='Reference vs. delivered model')
    parser.add_argument('--note', default='Compare building silhouettes, openings, slab edges and junctions; verify camera and section correspondence.')
    parser.add_argument('--width', type=int, default=800)
    parser.add_argument('--height', type=int, default=850)
    parser.add_argument('--overlay', action='store_true', help='Add a 50/50 overlay panel; meaningful only for matching cameras')
    parser.add_argument('--context', action='store_true', help='Append full unrotated originals with crop boxes and comparison transform labels')
    parser.add_argument('--camera', required=True, choices=['matched', 'diagnostic'], help='Matched is a human declaration to verify, never automatic acceptance')
    parser.add_argument('--evidence', type=Path, help='Evidence JSON path; contour pairs default to OUTPUT.evidence.json')
    args = parser.parse_args()
    has_contours = args.reference_contours is not None or args.model_contours is not None
    if has_contours and not (args.reference_contours and args.model_contours):
        parser.error('reference-contours and model-contours must be supplied together')
    if args.overlay and args.camera == 'diagnostic':
        parser.error('overlay requires a declared matched camera')
    contour_inputs = {}
    try:
        for role in ['reference', 'model']:
            check_frame(getattr(args, role), getattr(args, role + '_crop'),
                        getattr(args, role + '_rotate'), getattr(args, role + '_anchor'))
            if has_contours:
                contour_inputs[role] = validate_contours(getattr(args, role + '_contours'), getattr(args, role))
    except (ValueError, OSError) as exc:
        parser.error(str(exc))
    # A detail crop must retain its original view and surrounding landmarks.
    args.context = args.context or has_contours or bool(args.reference_crop or args.model_crop)
    if args.width < 100 or args.height < 100:
        parser.error('Panel dimensions must be at least 100px')
    evidence_path = args.evidence or args.output.with_suffix('.evidence.json')
    if args.output.exists() or evidence_path.exists():
        parser.error('output and evidence must be new files; preserve frozen review revisions')
    if args.output.resolve() == evidence_path.resolve():
        parser.error('output and evidence must be different files')
    panels = [panel(getattr(args, role), getattr(args, role+'_crop'), getattr(args, role+'_rotate'), getattr(args, role+'_anchor'), args.width, args.height) for role in ['reference','model']]
    labels = ['Reference comparison view', 'Model comparison view']
    if args.overlay:
        panels.append(Image.blend(panels[0], panels[1], .5));labels.append('50% overlay — camera differences remain')
    transforms = {}
    if has_contours:
        lines = []
        for role in ['reference', 'model']:
            traced, strokes, transform = contour_panels(
                getattr(args, role), getattr(args, role + '_contours'),
                getattr(args, role + '_crop'), getattr(args, role + '_rotate'),
                getattr(args, role + '_anchor'), args.width, args.height)
            panels.append(traced)
            labels.append(f'{role.capitalize()} + reviewer contours')
            lines.append(strokes)
            transforms[role] = transform
        if args.camera == 'matched':
            panels.append(line_alignment(*lines))
            labels.append('Lines: reference magenta / model cyan')
            args.note = 'Declared matched camera: verify visually; no automatic geometry acceptance. ' + args.note
        else:
            args.note = 'DIAGNOSTIC camera: no registered line overlay. ' + args.note
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
        small = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 14)
    except OSError:
        font = ImageFont.load_default(size=20);small = ImageFont.load_default(size=14)
    sheet_width = args.width * len(panels)
    comparison_height = args.height + 150
    contexts = []
    context_header_height = 0
    if args.context:
        measure = ImageDraw.Draw(Image.new('RGB', (1, 1)))
        for index, role in enumerate(['reference', 'model']):
            width = sheet_width // 2 if index == 0 else sheet_width - sheet_width // 2
            crop = getattr(args, role + '_crop')
            rotate = getattr(args, role + '_rotate')
            im, original_size = context_panel(getattr(args, role), crop, width, args.height)
            crop_label = ', '.join(f'{value:g}' for value in crop) if crop else 'none (full image)'
            details = [f'Full {role} — original, unrotated',
                       f'Original image: {original_size[0]} × {original_size[1]} pixels',
                       f'Crop box: {crop_label}' + (' (original pixels; pink outline)' if crop else ''),
                       f'Comparison rotation: {rotate:g}° counterclockwise']
            lines = [line for detail in details for line in wrapped_lines(measure, detail, small, width - 24)]
            context_header_height = max(context_header_height, 24 + len(lines) * 20)
            contexts.append((im, lines, width))
    context_height = context_header_height + args.height + 42 if contexts else 0
    sheet = Image.new('RGB', (sheet_width, comparison_height + context_height), '#fafafa')
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 12), args.title, font=font, fill='#111111')
    draw.text((20, 43), args.note, font=small, fill='#444444')
    for index, (im, label) in enumerate(zip(panels, labels)):
        x = index*args.width
        draw.text((x+20, 76), label, font=font, fill='#111111')
        sheet.paste(im, (x, 108))
        if index < 2:
            path = args.reference if index == 0 else args.model
            draw.text((x+12,args.height+118), path.name, font=small, fill='#444444')
        if index: draw.line((x,70,x,args.height+145), fill='#999999')
    x = 0
    for index, (im, lines, width) in enumerate(contexts):
        y = comparison_height
        draw.line((x, y, x + width, y), fill='#999999')
        for line_index, line in enumerate(lines):
            draw.text((x + 12, y + 12 + line_index * 20), line, font=small, fill='#111111')
        sheet.paste(im, (x, y + context_header_height))
        path = args.reference if index == 0 else args.model
        draw.text((x + 12, y + context_header_height + args.height + 10), path.name, font=small, fill='#444444')
        if index:
            draw.line((x, y, x, sheet.height - 5), fill='#999999')
        x += width
    args.output.parent.mkdir(parents=True,exist_ok=True)
    sheet.save(args.output)
    if not transforms:
        for role in ['reference', 'model']:
            _, transforms[role] = prepare_panel(getattr(args, role), getattr(args, role + '_crop'),
                getattr(args, role + '_rotate'), getattr(args, role + '_anchor'), args.width, args.height)
    evidence = {'status': 'requires-human-visual-review', 'camera': args.camera,
                'registered_line_overlay': has_contours and args.camera == 'matched',
                'inputs': {role: input_record(getattr(args, role)) for role in ['reference', 'model']},
                'contours': contour_inputs, 'transforms': transforms,
                'output': input_record(args.output)}
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps(evidence, indent=2) + '\n')
    print(args.output)


if __name__ == '__main__':
    main()
