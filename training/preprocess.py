"""MobileNetV3 preprocessing shared with the app.

Downsampling (both sides at least the model size, which is every camera
photo and every cached training PNG) uses an antialiased box filter: each
output pixel is the average of the source rectangle it covers. The result
is rounded to uint8 so it matches a 224 PNG.

Upsampling keeps bilinear sampling with half-pixel centers:
    src = (dst + 0.5) * in_size / out_size - 0.5
That path is only for images smaller than the model. The committed
2x2 -> 4 fixture locks it.

Normalization is Keras `mode='tf'`:
    (pixel / 127.5) - 1
Output is float32 NHWC RGB in [-1, 1], without a batch dimension.

JPEG orientation is applied with Pillow's EXIF transpose before the resize.
`training/prepare_data.py` writes the oriented 224 PNG the trainer reads, so
TensorFlow never decodes the original JPEG.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np

MODEL_INPUT_SIZE = 224


class ImageReadError(Exception):
    """A photo could not be decoded. Callers skip it and keep going."""


def load_oriented_rgb(path: Path) -> np.ndarray:
    """Open an image, apply EXIF orientation, and return HxWx3 uint8 RGB."""
    from PIL import Image, ImageOps, UnidentifiedImageError

    try:
        with Image.open(path) as image:
            oriented = ImageOps.exif_transpose(image)
            if oriented is None:
                raise ImageReadError(f"empty image: {path}")
            rgb = oriented.convert("RGB")
            array = np.asarray(rgb)
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise ImageReadError(str(error)) from error
    if array.ndim != 3 or array.shape[2] != 3 or array.size == 0:
        raise ImageReadError(f"not an RGB image: {path}")
    return np.ascontiguousarray(array)


def resize_area(image: np.ndarray, size: int) -> np.ndarray:
    """Antialiased stretch to size x size. Float pixels, not yet rounded."""
    src = np.asarray(image, dtype=np.float64)
    if src.ndim != 3 or src.shape[2] != 3:
        raise ValueError("RGB HxWx3 array required")
    if size < 1:
        raise ValueError("size must be positive")
    if src.shape[0] < 1 or src.shape[1] < 1:
        raise ValueError("empty image")
    if src.shape[0] == size and src.shape[1] == size:
        return src
    # The box filter is separable. Height first, then width, matches the app.
    resized = _resize_axis(src, size, axis=0)
    return _resize_axis(resized, size, axis=1)


def model_rgb_uint8(rgb: np.ndarray, size: int = MODEL_INPUT_SIZE) -> np.ndarray:
    """Oriented RGB pixels as a size x size uint8 image (the cached PNG)."""
    image = np.asarray(rgb)
    if image.shape[0] >= size and image.shape[1] >= size:
        resized = resize_area(image, size)
    else:
        resized = _resize_bilinear(image, size)
    return np.clip(np.rint(resized), 0, 255).astype(np.uint8)


def write_model_png(rgb: np.ndarray, destination: Path, size: int = MODEL_INPUT_SIZE) -> None:
    from PIL import Image

    prepared = model_rgb_uint8(rgb, size)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(prepared, mode="RGB").save(destination, format="PNG")


def preprocess_rgb_uint8(rgb: np.ndarray, size: int = MODEL_INPUT_SIZE) -> np.ndarray:
    image = np.asarray(rgb)
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("RGB HxWx3 uint8 array required")
    height, width, _ = image.shape
    if height < 1 or width < 1:
        raise ValueError("empty image")
    if size < 1:
        raise ValueError("size must be positive")
    if height >= size and width >= size:
        resized = model_rgb_uint8(image, size).astype(np.float64)
    else:
        resized = _resize_bilinear(image, size)
    return (resized / 127.5 - 1.0).astype(np.float32)


def _resize_axis(image: np.ndarray, new_size: int, axis: int) -> np.ndarray:
    old_size = int(image.shape[axis])
    if old_size == new_size:
        return image
    scale = old_size / new_size
    moved = np.moveaxis(image, axis, 0)
    output = np.empty((new_size,) + moved.shape[1:], dtype=np.float64)
    for index in range(new_size):
        start = index * scale
        end = (index + 1) * scale
        low = int(math.floor(start))
        high = int(math.ceil(end - 1e-12))
        high = min(max(high, low + 1), old_size)
        accumulator = np.zeros(moved.shape[1:], dtype=np.float64)
        covered = 0.0
        for source in range(low, high):
            overlap = min(end, source + 1.0) - max(start, float(source))
            if overlap <= 0:
                continue
            accumulator += moved[source] * overlap
            covered += overlap
        output[index] = accumulator / covered
    return np.moveaxis(output, 0, axis)


def _resize_bilinear(image: np.ndarray, size: int) -> np.ndarray:
    pixels = np.asarray(image, dtype=np.float64)
    height, width, _ = pixels.shape
    ys = (np.arange(size, dtype=np.float64) + 0.5) * height / size - 0.5
    xs = (np.arange(size, dtype=np.float64) + 0.5) * width / size - 0.5
    ys = np.clip(ys, 0.0, height - 1.0)
    xs = np.clip(xs, 0.0, width - 1.0)
    y0 = np.floor(ys).astype(np.int32)
    x0 = np.floor(xs).astype(np.int32)
    y1 = np.clip(y0 + 1, 0, height - 1)
    x1 = np.clip(x0 + 1, 0, width - 1)
    ty = (ys - y0).astype(np.float64)
    tx = (xs - x0).astype(np.float64)
    top_left = pixels[y0[:, None], x0[None, :]]
    top_right = pixels[y0[:, None], x1[None, :]]
    bottom_left = pixels[y1[:, None], x0[None, :]]
    bottom_right = pixels[y1[:, None], x1[None, :]]
    tx = tx[None, :, None]
    ty = ty[:, None, None]
    top = top_left * (1.0 - tx) + top_right * tx
    bottom = bottom_left * (1.0 - tx) + bottom_right * tx
    return top * (1.0 - ty) + bottom * ty
