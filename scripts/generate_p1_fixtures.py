#!/usr/bin/env python3
"""Generuje fixture'y parytetu P1.

Oracle geometrii i normalizacji prototypu to `ml/preprocess.py`.
Filtry `nearest` i `bicubic` nie istnieją w tym organie: ich oczekiwane
wartości liczy ten skrypt tym samym wzorem co TypeScript. Test Pythona
sprawdza, że plik jest tym, co skrypt emituje, i że przypadki
`p1-preprocess-py` oraz `p1-derived` zgadzają się z `preprocess.py`.

Uruchomienie z katalogu repozytorium:

    python scripts/generate_p1_fixtures.py
"""

from __future__ import annotations

import base64
import json
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ml"))

from preprocess import model_rgb_uint8, preprocess_rgb_uint8, resize_area  # noqa: E402

FIXTURE = ROOT / "ml" / "fixtures" / "p1" / "parity.json"
ABS_TOLERANCE = 1e-5


def _b64_u8(array: np.ndarray) -> str:
    raw = np.ascontiguousarray(array, dtype=np.uint8).reshape(-1).tobytes()
    return base64.b64encode(raw).decode("ascii")


def _b64_f32(array: np.ndarray) -> str:
    raw = np.ascontiguousarray(array, dtype=np.float32).reshape(-1).tobytes()
    return base64.b64encode(raw).decode("ascii")


def _spec(
    size: int,
    *,
    width_cap: bool,
    color_order: str = "RGB",
    rounding: str = "half_up_uint8",
    normalization: dict | None = None,
    crop: str = "none_stretch",
    steps: list | None = None,
    letterbox_fill: list | None = None,
) -> dict:
    if steps is None:
        steps = []
        if width_cap:
            steps.append({"op": "to_width", "value": 448, "filter": "box", "antialias": True})
        steps.append({"op": "to_size", "filter": "box", "antialias": True})
    if normalization is None:
        normalization = {"type": "scale_offset", "scale": 1.0 / 127.5, "offset": -1.0}
    spec = {
        "inputSize": {"width": size, "height": size},
        "exifOrientation": "apply",
        "colorOrder": color_order,
        "resize": {"steps": steps},
        "crop": crop,
        "rounding": rounding,
        "normalization": normalization,
    }
    if letterbox_fill is not None:
        spec["letterboxFill"] = letterbox_fill
    return spec


def _case(
    name: str,
    guarantee: str,
    rgb: np.ndarray,
    expected: np.ndarray,
    spec: dict,
    *,
    model_size: int,
    derived: str | None = None,
) -> dict:
    payload = {
        "name": name,
        "guarantee": guarantee,
        "modelSize": model_size,
        "width": int(rgb.shape[1]),
        "height": int(rgb.shape[0]),
        "rgbBase64": _b64_u8(rgb),
        "expectedFloat32Base64": _b64_f32(expected),
        "absTolerance": ABS_TOLERANCE,
        "spec": spec,
    }
    if derived is not None:
        payload["derived"] = derived
    return payload


def _pattern(height: int, width: int) -> np.ndarray:
    rgb = np.zeros((height, width, 3), dtype=np.uint8)
    xs = np.arange(width, dtype=np.int32)
    ys = np.arange(height, dtype=np.int32)[:, None]
    rgb[:, :, 0] = np.clip((xs * 3 + ys * 5) % 251, 0, 255).astype(np.uint8)
    rgb[:, :, 1] = np.clip((xs * 7 + 11) % 251, 0, 255).astype(np.uint8)
    rgb[:, :, 2] = np.clip((ys * 13 + xs + 19) % 251, 0, 255).astype(np.uint8)
    return rgb


def _sample(image: np.ndarray, x: int, y: int, channel: int) -> float:
    height, width, _ = image.shape
    xx = 0 if x < 0 else width - 1 if x >= width else x
    yy = 0 if y < 0 else height - 1 if y >= height else y
    return float(image[yy, xx, channel])


def _cubic(distance: float) -> float:
    a = -0.5
    x = abs(distance)
    if x <= 1.0:
        return (a + 2.0) * x * x * x - (a + 3.0) * x * x + 1.0
    if x < 2.0:
        return a * x * x * x - 5.0 * a * x * x + 8.0 * a * x - 4.0 * a
    return 0.0


def resize_nearest(image: np.ndarray, width: int, height: int) -> np.ndarray:
    src_h, src_w, _ = image.shape
    output = np.zeros((height, width, 3), dtype=np.float64)
    for y in range(height):
        sy = (y + 0.5) * src_h / height - 0.5
        iy = min(max(math.floor(sy + 0.5), 0), src_h - 1)
        for x in range(width):
            sx = (x + 0.5) * src_w / width - 0.5
            ix = min(max(math.floor(sx + 0.5), 0), src_w - 1)
            output[y, x, :] = image[iy, ix, :]
    return output


def resize_bicubic(image: np.ndarray, width: int, height: int) -> np.ndarray:
    src_h, src_w, _ = image.shape
    output = np.zeros((height, width, 3), dtype=np.float64)
    pixels = image.astype(np.float64)
    for y in range(height):
        sy = (y + 0.5) * src_h / height - 0.5
        y0 = math.floor(sy)
        fy = sy - y0
        for x in range(width):
            sx = (x + 0.5) * src_w / width - 0.5
            x0 = math.floor(sx)
            fx = sx - x0
            for channel in range(3):
                acc = 0.0
                for ky in range(-1, 3):
                    wy = _cubic(fy - ky)
                    for kx in range(-1, 3):
                        acc += _sample(pixels, x0 + kx, y0 + ky, channel) * _cubic(fx - kx) * wy
                output[y, x, channel] = acc
    return output


def _emit_unit_scale(filtered: np.ndarray) -> np.ndarray:
    rounded = np.clip(np.floor(filtered + 0.5), 0, 255)
    return rounded.astype(np.float32)


def build_payload() -> dict:
    classic = np.array(
        [
            [[255, 0, 0], [0, 255, 0]],
            [[0, 0, 255], [128, 64, 32]],
        ],
        dtype=np.uint8,
    )
    halves = np.array(
        [
            [[10, 10, 10], [11, 11, 11]],
            [[10, 10, 10], [11, 11, 11]],
        ],
        dtype=np.uint8,
    )
    wide = _pattern(4, 450)
    small = _pattern(5, 7)
    block = _pattern(4, 4)
    area = _pattern(6, 4)

    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]
    pixel_scale = 1.0 / 255.0
    uint8_4 = model_rgb_uint8(classic, 4)
    mean_std = (
        (uint8_4.astype(np.float64) * pixel_scale - np.array(mean)) / np.array(std)
    ).astype(np.float32)

    none_float = (resize_area(block, 2) * 0.01 + 0.5).astype(np.float32)
    nearest = _emit_unit_scale(resize_nearest(classic.astype(np.float64), 3, 3))
    bicubic = _emit_unit_scale(resize_bicubic(classic.astype(np.float64), 3, 3))

    unit = {"type": "scale_offset", "scale": 1.0, "offset": 0.0}
    cases = [
        _case(
            "identity_2",
            "p1-preprocess-py",
            classic,
            preprocess_rgb_uint8(classic, 2),
            _spec(2, width_cap=False),
            model_size=2,
        ),
        _case(
            "bilinear_2_to_4",
            "p1-preprocess-py",
            classic,
            preprocess_rgb_uint8(classic, 4),
            _spec(4, width_cap=False),
            model_size=4,
        ),
        _case(
            "area_6x4_to_2",
            "p1-preprocess-py",
            area,
            preprocess_rgb_uint8(area, 2),
            _spec(2, width_cap=False),
            model_size=2,
        ),
        _case(
            "half_up_2_to_1",
            "p1-preprocess-py",
            halves,
            preprocess_rgb_uint8(halves, 1),
            _spec(1, width_cap=False),
            model_size=1,
        ),
        _case(
            "wide_450x4_to_model",
            "p1-preprocess-py",
            wide,
            preprocess_rgb_uint8(wide, 224),
            _spec(224, width_cap=True),
            model_size=224,
        ),
        _case(
            "size_8_from_5x7",
            "p1-preprocess-py",
            small,
            preprocess_rgb_uint8(small, 8),
            _spec(8, width_cap=False),
            model_size=8,
        ),
        _case(
            "mean_std_2_to_4",
            "p1-derived",
            classic,
            mean_std,
            _spec(
                4,
                width_cap=False,
                normalization={
                    "type": "mean_std",
                    "mean": mean,
                    "std": std,
                    "pixelScale": pixel_scale,
                },
            ),
            model_size=4,
            derived="mean_std",
        ),
        _case(
            "bgr_identity_2",
            "p1-derived",
            classic,
            preprocess_rgb_uint8(classic, 2)[..., ::-1],
            _spec(2, width_cap=False, color_order="BGR"),
            model_size=2,
            derived="bgr",
        ),
        _case(
            "none_float_4_to_2",
            "p1-derived",
            block,
            none_float,
            _spec(
                2,
                width_cap=False,
                rounding="none_float",
                normalization={"type": "scale_offset", "scale": 0.01, "offset": 0.5},
            ),
            model_size=2,
            derived="none_float",
        ),
        _case(
            "nearest_2_to_3",
            "generator-filter",
            classic,
            nearest,
            _spec(3, width_cap=False, steps=[{"op": "to_size", "filter": "nearest", "antialias": True}], normalization=unit),
            model_size=3,
        ),
        _case(
            "bicubic_2_to_3",
            "generator-filter",
            classic,
            bicubic,
            _spec(3, width_cap=False, steps=[{"op": "to_size", "filter": "bicubic", "antialias": True}], normalization=unit),
            model_size=3,
        ),
    ]
    return {
        "description": (
            "P1: preprocessImage na tych samych pikselach uint8 RGB (EXIF już zastosowany) "
            "i specyfikacji opisującej organ prototypu zgadza się z ml.preprocess.preprocess_rgb_uint8 "
            "co do bezwzględnej tolerancji absTolerance. To nie jest parytet dekodera JPEG ani "
            "podpróbkowania natywnego. Przypadki p1-derived dokładają mean_std, BGR i brak zaokrąglenia "
            "na geometrii z preprocess.py. nearest i bicubic porównują TypeScript ze wzorem z tego skryptu."
        ),
        "absTolerance": ABS_TOLERANCE,
        "cases": cases,
    }


def main() -> None:
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    payload = build_payload()
    FIXTURE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {FIXTURE} ({FIXTURE.stat().st_size} bytes, {len(payload['cases'])} cases)")


if __name__ == "__main__":
    main()
