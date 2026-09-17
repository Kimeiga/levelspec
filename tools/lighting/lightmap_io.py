"""Linear lightmap I/O and empty-only padding. NumPy; bpy only for EXR functions.

Arrays are H×W×4 with independent channels. No display transform is applied by
these helpers. EXR callers choose the installed scene-linear color-space name.
"""
from pathlib import Path
import math
import numpy as np


def float_image(name, width, height=None, *, linear_space='Linear Rec.709'):
    import bpy
    height = width if height is None else height
    image = bpy.data.images.new(name, width=width, height=height, alpha=True, float_buffer=True)
    image.colorspace_settings.name = linear_space
    image.alpha_mode = 'CHANNEL_PACKED'
    image.generated_color = (0, 0, 0, 0)
    image.use_fake_user = True
    return image


def image_pixels(image):
    values = np.empty(image.size[0] * image.size[1] * 4, np.float32)
    image.pixels.foreach_get(values)
    return values.reshape(image.size[1], image.size[0], 4)


def save_linear_exr(image, path, *, scene=None):
    """Write new FLOAT RGBA ZIP EXR; restore render-output settings afterward.

The image must already contain scene-linear pixels. Color-space tagging cannot
repair previously encoded values. Run the included numeric test on the target
Blender/OCIO configuration before using this path for a production bake.
"""
    import bpy
    path = Path(path)
    if path.exists():
        raise FileExistsError(f'Preserve existing raw output: {path}')
    if not image.is_float or image.alpha_mode != 'CHANNEL_PACKED':
        raise ValueError('Use a float image with independent CHANNEL_PACKED RGBA')
    if not np.isfinite(image_pixels(image)).all():
        raise ValueError('EXR pixels must be finite')
    scene = scene or bpy.context.scene
    settings = scene.render.image_settings
    previous = {key: getattr(settings, key) for key in ('file_format', 'color_mode', 'color_depth', 'exr_codec')}
    try:
        settings.file_format = 'OPEN_EXR'
        settings.color_mode = 'RGBA'
        settings.color_depth = '32'
        settings.exr_codec = 'ZIP'
        image.save_render(str(path), scene=scene)
    finally:
        for key, value in previous.items():
            setattr(settings, key, value)
    return path


def pad_empty(values, coverage, steps):
    """Return padded copy and expanded mask. Original covered RGBA never changes.

Coverage is mandatory and independent of AO alpha. Neighbor extension fills
only empty texels, without wraparound. It cannot fix insufficient chart gutters.
"""
    values, coverage = np.asarray(values), np.asarray(coverage)
    if values.ndim != 3 or values.shape[2] != 4 or values.dtype.kind != 'f' or not np.isfinite(values).all():
        raise ValueError('Expected finite floating H×W×4 lighting')
    if coverage.dtype != np.bool_ or coverage.shape != values.shape[:2]:
        raise ValueError('Coverage must be a matching boolean H×W mask, not AO')
    if not isinstance(steps, (int, np.integer)) or steps < 0:
        raise ValueError('Padding steps must be a nonnegative integer')
    output, covered = values.copy(), coverage.copy()
    for _ in range(steps):
        expanded = np.pad(covered, 1, mode='constant')
        padded = np.pad(output, ((1, 1), (1, 1), (0, 0)), mode='constant')
        total = np.zeros_like(output)
        count = np.zeros(covered.shape, np.float32)
        h, w = covered.shape
        for dy, dx in ((0, 1), (1, 0), (1, 2), (2, 1), (0, 0), (0, 2), (2, 0), (2, 2)):
            mask = expanded[dy:dy+h, dx:dx+w]
            total += padded[dy:dy+h, dx:dx+w] * mask[:, :, None]
            count += mask
        fill = ~covered & (count > 0)
        if not fill.any():
            break
        output[fill] = total[fill] / count[fill, None]
        covered[fill] = True
    return output, covered


def choose_encoding_range(rgb_arrays, *, headroom=.20):
    """One power-of-two range for a group of finite, nonnegative linear RGB arrays.

Pass covered RGB selections, not arbitrary unused atlas storage. The 20% margin
is a starting default; this function does not change or clip lighting values.
"""
    if not math.isfinite(headroom) or headroom < 0:
        raise ValueError('Headroom must be finite and nonnegative')
    maximum = 0.0
    count = 0
    for values in rgb_arrays:
        values = np.asarray(values)
        if not values.size or values.shape[-1] != 3 or not np.isfinite(values).all() or values.min() < 0:
            raise ValueError('Expected nonempty finite nonnegative RGB arrays')
        maximum = max(maximum, float(values.max()))
        count += 1
    if not count:
        raise ValueError('No lighting arrays')
    return 1.0 if maximum == 0 else 2.0 ** math.ceil(math.log2(maximum * (1 + headroom)))


def encode_rgb8(linear_rgb, encoding_range):
    values = np.asarray(linear_rgb)
    if not math.isfinite(encoding_range) or encoding_range <= 0:
        raise ValueError('Encoding range must be finite and positive')
    if values.shape[-1] != 3 or not np.isfinite(values).all() or values.min() < 0 or values.max() > encoding_range:
        raise ValueError('Linear RGB is outside the declared encoding range')
    normalized = values / encoding_range
    srgb = np.where(normalized <= .0031308, 12.92 * normalized, 1.055 * normalized ** (1 / 2.4) - .055)
    return np.rint(srgb * 255).astype(np.uint8)
