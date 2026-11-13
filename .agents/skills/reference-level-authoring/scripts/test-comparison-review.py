"""Behavioral tests for comparison packets; all artifacts live in temp directories.

python .agents/skills/reference-level-authoring/scripts/test-comparison-review.py
"""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from PIL import Image, ImageChops, ImageDraw


SCRIPT = Path(__file__).resolve().with_name('build-comparison-review.py')
PAIR_SCRIPT = SCRIPT.with_name('compare-model-reference.py')
SOURCE_SCRIPT = SCRIPT.with_name('build-reference-review.py')
SPEC = importlib.util.spec_from_file_location('comparison', PAIR_SCRIPT)
COMPARISON = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMPARISON)


class ComparisonReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'references').mkdir()
        (self.root / 'drawings').mkdir()
        self.sources = []
        for index in range(5):
            im = Image.new('RGB', (400, 200), 'white')
            draw = ImageDraw.Draw(im)
            draw.rectangle((50, 50, 349, 149), fill=(160 + index * 10, 30, 50))
            draw.text((60, 60), f'Original {index}', fill='black')
            im.save(self.root / 'references' / f'{index}.png')
            self.sources.append({'id': f's{index}', 'image': f'{index}.png',
                                 'view': f'angle {index}', 'state': 'rest',
                                 'provenance': f'Fixture {index} <original>'})
        for index in range(3):
            im = Image.new('RGB', (200, 400), 'white')
            ImageDraw.Draw(im).rectangle((50, 50, 149, 349), fill='blue')
            im.save(self.root / 'drawings' / f'{index}.png')
        self.refs = {'sources': self.sources, 'regions': [
            {'id': 'joint', 'question': 'Which slab owns the landing edge?', 'observations': [
                {'source': 's0', 'crop': [50, 50, 350, 150]},
                {'source': 's1', 'crop': [50, 50, 350, 150]}]}]}
        self.data = {'stage': 'schematic', 'revision': 'drawing-r01', 'views': [
            {'id': f'v{i}', 'image': f'{i}.png', 'view': f'view {i}'} for i in range(3)],
            'comparisons': [
                {'source': 's0', 'candidate': 'v0', 'camera': 'matched', 'region': 'joint',
                 'reference_crop': [50, 50, 350, 150], 'candidate_crop': [50, 50, 150, 350],
                 'overlay': True},
                {'source': 's1', 'candidate': 'v1', 'camera': 'diagnostic'}]}

    def run_packet(self, data=None, output='output', success=True):
        refs_path = self.root / 'references' / 'manifest.json'
        data_path = self.root / 'drawings' / 'comparisons.json'
        refs_path.write_text(json.dumps(self.refs))
        data_path.write_text(json.dumps(self.data if data is None else data))
        result = subprocess.run([sys.executable, str(SCRIPT), str(refs_path),
                                 str(data_path), '--output', str(self.root / output)],
                                capture_output=True, text=True, cwd='/')
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads((self.root / output / 'evidence.json').read_text())
        self.assertNotEqual(result.returncode, 0)
        return result.stderr

    def test_pagination_all_sources_candidates_and_native_snapshots(self):
        evidence = self.run_packet()
        self.assertEqual(len(evidence['overviews']), 4)
        self.assertEqual({s for p in evidence['overviews'] for s in p['sources']},
                         {s['id'] for s in self.sources})
        self.assertEqual({v for p in evidence['overviews'] for v in p['candidates']},
                         {'v0', 'v1', 'v2'})
        for record in evidence['sources'] + evidence['views']:
            snapshot = self.root / 'output' / record['snapshot']
            self.assertEqual(hashlib.sha256(snapshot.read_bytes()).hexdigest(), record['sha256'])
        self.assertEqual(evidence['status'], 'incomplete-comparison-coverage')
        self.assertTrue(any('s4' in gap for gap in evidence['gaps']))
        self.assertTrue(any('joint, source s1' in gap for gap in evidence['gaps']))
        index = (self.root / 'output/index.html').read_text()
        self.assertIn('&lt;original&gt;', index)
        self.assertIn('drawing-r01', index)
        for page in evidence['overviews'] + evidence['comparisons']:
            with Image.open(self.root / 'output' / page['image']) as im:
                self.assertGreater(im.width, 1000)
                self.assertGreater(im.height, 900)

    def test_aspect_ratio_and_full_context_are_preserved(self):
        evidence = self.run_packet()
        with Image.open(self.root / 'output' / evidence['overviews'][0]['image']) as im:
            # First source is landscape; its colored rectangle remains 3:1.
            tile = im.crop((0, 0, 600, im.height // 2))
            mask = tile.convert('RGB').point(lambda _: 0)
            pixels = tile.load()
            out = mask.load()
            for y in range(tile.height):
                for x in range(tile.width):
                    r, g, b = pixels[x, y]
                    if r > 140 and g < 80 and b < 100:
                        out[x, y] = (255, 255, 255)
            bounds = mask.getbbox()
            self.assertIsNotNone(bounds)
            self.assertAlmostEqual((bounds[2] - bounds[0]) / (bounds[3] - bounds[1]), 3, delta=.08)
        with Image.open(self.root / 'output/comparison-001.png') as im:
            # Context occupies the second row; requested crop has a pink outline.
            context = im.crop((0, im.height // 2, im.width, im.height))
            colors = context.getcolors(context.width * context.height)
            self.assertTrue(any(color == (209, 36, 99) for _, color in colors))

    def test_model_packet_records_asset_hash_and_complete_mapping(self):
        data = copy.deepcopy(self.data)
        data.update(stage='model', revision='xml-r02', asset='level.level.svgx')
        (self.root / 'drawings/level.level.svgx').write_bytes(b'<level id="identity-fixture"/>')
        data['comparisons'] = [
            {'source': f's{i}', 'candidate': f'v{i % 3}', 'camera': 'matched',
             **({'region': 'joint'} if i < 2 else {})} for i in range(5)]
        evidence = self.run_packet(data)
        self.assertEqual(evidence['stage'], 'model')
        self.assertEqual(evidence['gaps'], [])
        self.assertEqual(evidence['status'], 'ready-for-visual-review')
        self.assertEqual(evidence['asset']['sha256'], hashlib.sha256(
            (self.root / 'drawings/level.level.svgx').read_bytes()).hexdigest())
        self.assertEqual((self.root / 'output' / evidence['asset']['snapshot']).read_bytes(),
                         b'<level id="identity-fixture"/>')

    def test_empty_mappings_produce_explicit_gaps(self):
        data = {**self.data, 'comparisons': []}
        evidence = self.run_packet(data)
        self.assertTrue(evidence['overviews'])
        self.assertFalse(evidence['comparisons'])
        self.assertEqual(evidence['status'], 'incomplete-comparison-coverage')

    def test_invalid_inputs_fail_before_writing(self):
        mutations = [
            ('source', 'absent', 'unknown source'),
            ('candidate', 'absent', 'unknown source'),
            ('camera', 'guess', 'camera'),
            ('region', 'absent', 'region'),
            ('reference_crop', [-1, 0, 100, 100], 'outside'),
            ('candidate_crop', [0, 0, 900, 900], 'outside'),
            ('reference_anchor', [0, 0, 500, 500], 'outside'),
            ('candidate_crop', [0, 0, float('nan'), 20], 'finite'),
            ('overlay', 'true', 'boolean')]
        for key, value, message in mutations:
            with self.subTest(key=key, value=value):
                data = copy.deepcopy(self.data)
                data['comparisons'][0][key] = value
                self.assertIn(message, self.run_packet(data, success=False))
                self.assertFalse((self.root / 'output').exists())
        data = copy.deepcopy(self.data)
        data['comparisons'][0]['camera'] = 'diagnostic'
        self.assertIn('overlay requires', self.run_packet(data, success=False))

    def test_missing_images_and_duplicate_ids_rejected(self):
        data = copy.deepcopy(self.data)
        data['views'][0]['image'] = 'missing.png'
        self.assertIn('missing.png', self.run_packet(data, success=False))
        data = copy.deepcopy(self.data)
        data['views'][1]['id'] = 'v0'
        self.assertIn('Duplicate image ID', self.run_packet(data, success=False))

    def test_preserve_frozen_output(self):
        evidence = self.run_packet()
        before = {p.name: p.read_bytes() for p in (self.root / 'output').iterdir()}
        # Originals can change later; the retained packet must not change with them.
        (self.root / 'references/0.png').write_bytes(b'not the frozen original')
        retained = self.root / 'output' / evidence['sources'][0]['snapshot']
        self.assertEqual(hashlib.sha256(retained.read_bytes()).hexdigest(),
                         evidence['sources'][0]['sha256'])
        # Restore a readable current original so refusal tests output immutability.
        (self.root / 'references/0.png').write_bytes(retained.read_bytes())
        self.assertIn('new or empty', self.run_packet(success=False))
        self.assertEqual({p.name: p.read_bytes() for p in (self.root / 'output').iterdir()}, before)

    def contour_pair(self, data=None):
        data = copy.deepcopy(self.data if data is None else data)
        for role, size in [('reference', (400, 200)), ('candidate', (200, 400))]:
            im = Image.new('RGBA', size)
            ImageDraw.Draw(im).rectangle((50, 50, size[0] - 51, size[1] - 51), outline='black', width=3)
            im.save(self.root / 'drawings' / f'{role}-contours.png')
            data['comparisons'][0][role + '_contours'] = f'{role}-contours.png'
        return data

    def test_contour_packet_snapshots_transforms_and_no_automatic_signoff(self):
        evidence = self.run_packet(self.contour_pair())
        pair = evidence['comparisons'][0]
        self.assertTrue(pair['registered_line_overlay'])
        for role in ['reference', 'candidate']:
            record = pair['contours'][role]
            snapshot = self.root / 'output' / record['snapshot']
            self.assertEqual(hashlib.sha256(snapshot.read_bytes()).hexdigest(), record['sha256'])
            self.assertEqual(pair['transforms'][role]['crop'], pair[role + '_crop'])
            self.assertEqual(pair['transforms'][role]['rotation_degrees_ccw'], 0)
            self.assertEqual(pair['transforms'][role]['panel_size'], [800, 580])
        self.assertEqual(evidence['status'], 'incomplete-comparison-coverage')
        with Image.open(self.root / 'output/comparison-001.png') as im:
            self.assertGreater(im.height, 1900)  # Raw, contours, and full context rows.

    def test_contour_diagnostic_omits_registered_line_overlay(self):
        data = self.contour_pair()
        data['comparisons'][0].update(camera='diagnostic', overlay=False)
        evidence = self.run_packet(data)
        self.assertFalse(evidence['comparisons'][0]['registered_line_overlay'])
        self.assertTrue(any('diagnostic camera' in gap for gap in evidence['gaps']))

    def test_contour_invalid_inputs_fail_before_output(self):
        data = self.contour_pair()
        del data['comparisons'][0]['candidate_contours']
        self.assertIn('supplied together', self.run_packet(data, success=False))
        self.assertFalse((self.root / 'output').exists())
        for size, mode, color, message in [
                ((10, 10), 'RGBA', (0, 0, 0, 0), 'dimensions'),
                ((400, 200), 'RGBA', (0, 0, 0, 0), 'empty'),
                ((400, 200), 'RGBA', (0, 0, 0, 255), 'transparent'),
                ((400, 200), 'RGB', 'white', 'transparent')]:
            with self.subTest(message=message, mode=mode):
                data = self.contour_pair()
                Image.new(mode, size, color).save(self.root / 'drawings/reference-contours.png')
                self.assertIn(message, self.run_packet(data, success=False))
                self.assertFalse((self.root / 'output').exists())

    def test_contours_share_crop_rotation_anchor_and_preserve_intentional_shift(self):
        raw = Image.new('RGB', (200, 120), 'white')
        ImageDraw.Draw(raw).rectangle((40, 20, 160, 100), fill='gray')
        raw_path = self.root / 'raw.png'
        raw.save(raw_path)
        paths = []
        for index, x in enumerate([60, 70]):
            trace = Image.new('RGBA', raw.size)
            ImageDraw.Draw(trace).line((x, 30, x, 70), fill='black', width=1)
            path = self.root / f'trace-{index}.png'
            trace.save(path)
            paths.append(path)
        results = [COMPARISON.contour_panels(raw_path, path, [20, 10, 180, 110],
                   90, [10, 20, 90, 140], 400, 300) for path in paths]
        transform = results[0][2]
        self.assertEqual(transform, results[1][2])
        self.assertEqual(transform['resized_size'], [195, 312])
        self.assertEqual(transform['translation'], [102, -6])
        # Independent Pillow construction uses the RAW IMAGE framing above.
        with Image.open(paths[0]) as trace:
            expected = trace.crop((20, 10, 180, 110)).rotate(90, expand=True,
                resample=Image.Resampling.BICUBIC).resize((195, 312), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (400, 300))
        canvas.alpha_composite(expected, (102, -6))
        self.assertIsNone(ImageChops.difference(canvas, results[0][1]).getbbox())
        boxes = [item[1].getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()
                 for item in results]
        # A +10px original-x error becomes a -19/20px screen-y error after rotation.
        self.assertAlmostEqual(boxes[0][1] - boxes[1][1], 19.5, delta=1)
        self.assertEqual(boxes[0][0], boxes[1][0])
        self.assertIsNotNone(ImageChops.difference(results[0][1], results[1][1]).getbbox())

    def test_raw_pair_preserves_aspect_and_always_records_evidence(self):
        path = self.root / 'references/0.png'
        result = subprocess.run([sys.executable, str(PAIR_SCRIPT), '--reference', str(path),
            '--model', str(path), '--output', str(self.root / 'raw-pair.png'),
            '--width', '400', '--height', '300', '--camera', 'diagnostic'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        evidence = json.loads((self.root / 'raw-pair.evidence.json').read_text())
        self.assertEqual(evidence['camera'], 'diagnostic')
        self.assertFalse(evidence['registered_line_overlay'])
        self.assertEqual(evidence['transforms']['reference']['resized_size'], [312, 156])
        with Image.open(self.root / 'raw-pair.png') as im:
            self.assertEqual(im.size, (800, 450))
            mask = im.crop((0, 108, 400, 408)).convert('RGB')
            pixels = mask.load()
            for y in range(mask.height):
                for x in range(mask.width):
                    r, g, b = pixels[x, y]
                    pixels[x, y] = (255, 255, 255) if r > 140 and g < 80 and b < 100 else (0, 0, 0)
            x0, y0, x1, y1 = mask.getbbox()
            self.assertAlmostEqual((x1-x0)/(y1-y0), 3, delta=.1)

    def test_raw_pair_invalid_frames_and_overwrite_are_rejected(self):
        path = self.root / 'references/0.png'
        base = [sys.executable, str(PAIR_SCRIPT), '--reference', str(path), '--model', str(path),
                '--output', str(self.root / 'raw.png'), '--camera', 'diagnostic']
        for option, value in [('--reference-crop', '-1,0,100,50'),
                              ('--model-anchor', '0,0,500,200'),
                              ('--reference-rotate', 'nan')]:
            result = subprocess.run(base + [option + '=' + value], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((self.root / 'raw.png').exists())
        result = subprocess.run(base, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        before = (self.root / 'raw.png').read_bytes()
        result = subprocess.run(base, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / 'raw.png').read_bytes(), before)

    def test_individual_contour_cli_and_evidence(self):
        self.contour_pair()
        reference = self.root / 'references/0.png'
        candidate = self.root / 'drawings/0.png'
        base = [sys.executable, str(PAIR_SCRIPT), '--reference', str(reference),
                '--model', str(candidate), '--output', str(self.root / 'pair.png'),
                '--width', '400', '--height', '300', '--reference-contours',
                str(self.root / 'drawings/reference-contours.png'), '--camera', 'matched']
        result = subprocess.run(base, capture_output=True, text=True)
        self.assertIn('supplied together', result.stderr)
        paired = base + ['--model-contours', str(self.root / 'drawings/candidate-contours.png')]
        camera_index = paired.index('--camera')
        result = subprocess.run(paired[:camera_index] + paired[camera_index + 2:], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        result = subprocess.run(paired, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        evidence = json.loads((self.root / 'pair.evidence.json').read_text())
        self.assertTrue(evidence['registered_line_overlay'])
        self.assertEqual(evidence['status'], 'requires-human-visual-review')
        self.assertEqual(evidence['inputs']['reference']['sha256'],
                         hashlib.sha256(reference.read_bytes()).hexdigest())
        result = subprocess.run(paired + ['--camera', 'diagnostic', '--output', str(self.root / 'diagnostic.png')], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        evidence = json.loads((self.root / 'diagnostic.evidence.json').read_text())
        self.assertFalse(evidence['registered_line_overlay'])

    def run_sources(self, allow_incomplete=False, success=True):
        manifest = self.root / 'references/manifest.json'
        manifest.write_text(json.dumps(self.refs))
        command = [sys.executable, str(SOURCE_SCRIPT), str(manifest), '--output',
                   str(self.root / 'source-packet')]
        if allow_incomplete:
            command.append('--allow-incomplete')
        result = subprocess.run(command, cwd='/', capture_output=True, text=True)
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads((self.root / 'source-packet/evidence.json').read_text())
        self.assertNotEqual(result.returncode, 0)
        return result.stderr

    def test_source_packet_snapshots_context_and_immutability(self):
        evidence = self.run_sources()
        self.assertEqual(evidence['status'], 'ready-for-visual-review')
        output = self.root / 'source-packet'
        for source in evidence['sources']:
            self.assertEqual(hashlib.sha256((output / source['snapshot']).read_bytes()).hexdigest(),
                             source['sha256'])
        with Image.open(output / 'region-00-00.png') as sheet:
            self.assertEqual(sheet.size, (1600, 650))
            context = sheet.crop((800, 60, 1600, 640))
            self.assertTrue(any(color == (209, 36, 99) for _, color in
                                context.getcolors(context.width * context.height)))
        before = {p.name: p.read_bytes() for p in output.iterdir()}
        self.assertIn('new or empty', self.run_sources(success=False))
        self.assertEqual({p.name: p.read_bytes() for p in output.iterdir()}, before)

    def test_source_duplicate_pixels_and_incomplete_evidence(self):
        from PIL.PngImagePlugin import PngInfo
        self.refs['sources'] = self.refs['sources'][:3]
        original = self.root / 'references/0.png'
        for i in [1, 2]:
            info = PngInfo()
            info.add_text('annotation', f'Same pixels; metadata revision {i}')
            with Image.open(original) as im:
                im.save(self.root / f'references/{i}.png', pnginfo=info)
        self.assertIn('distinct originals', self.run_sources(success=False))
        self.assertFalse((self.root / 'source-packet').exists())
        evidence = self.run_sources(allow_incomplete=True)
        self.assertEqual(evidence['status'], 'incomplete')
        self.assertEqual(len({s['pixel_sha256'] for s in evidence['sources']}), 1)
        self.assertEqual(len({s['sha256'] for s in evidence['sources']}), 3)
        self.assertTrue(any('joint' in gap for gap in evidence['gaps']))

    def test_source_invalid_inputs_fail_before_output(self):
        for crop in [[-1, 0, 10, 10], [0, 0, float('nan'), 10], [0, 0, 10], [True, 0, 10, 10]]:
            with self.subTest(crop=crop):
                self.refs['regions'][0]['observations'][0]['crop'] = crop
                self.run_sources(success=False)
                self.assertFalse((self.root / 'source-packet').exists())


if __name__ == '__main__':
    unittest.main()
