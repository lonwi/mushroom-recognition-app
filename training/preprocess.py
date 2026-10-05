"""MobileNetV3 preprocessing shared with the app.

Resize is bilinear with half-pixel centers:
    src = (dst + 0.5) * in_size / out_size - 0.5
Normalization is Keras `mode='tf'`:
    (pixel / 127.5) - 1
Output is float32 NHWC RGB in [-1, 1], without a batch dimension.
"""

from __future__ import annotations

import numpy as np


def preprocess_rgb_uint8(rgb: np.ndarray, size: int = 224) -> np.ndarray:
    image = np.asarray(rgb)
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("RGB HxWx3 uint8 array required")
    height, width, _ = image.shape
    if height < 1 or width < 1:
        raise ValueError("empty image")
    if size < 1:
        raise ValueError("size must be positive")

    pixels = image.astype(np.float64)
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
    resized = top * (1.0 - ty) + bottom * ty
    normalized = resized / 127.5 - 1.0
    return normalized.astype(np.float32)
