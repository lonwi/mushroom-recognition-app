/// <reference types="jest" />
import fs from 'fs';
import path from 'path';
import { preprocessRgbToMobileNetV3 } from '../../services/imagePreprocess';
import { decodePngToRgb } from '../../services/decodePng';

const preprocessFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../training/fixtures/preprocess_2x2_to_4.json'), 'utf8'),
) as { width: number; height: number; size: number; rgb: number[]; expected: number[] };

const areaFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../training/fixtures/area_resize_6x4_to_2.json'), 'utf8'),
) as { width: number; height: number; size: number; rgb: number[]; expected: number[] };

describe('MobileNetV3 preprocessing', () => {
  test('a flat red image normalizes to (1, -1, -1) after resize', () => {
    const width = 5;
    const height = 4;
    const rgb = new Uint8Array(width * height * 3);
    for (let index = 0; index < width * height; index += 1) {
      rgb[index * 3] = 255;
    }
    const output = preprocessRgbToMobileNetV3(rgb, width, height, 8);
    expect(output).toHaveLength(8 * 8 * 3);
    for (let index = 0; index < output.length; index += 3) {
      expect(output[index]).toBeCloseTo(1, 5);
      expect(output[index + 1]).toBeCloseTo(-1, 5);
      expect(output[index + 2]).toBeCloseTo(-1, 5);
    }
  });

  test('keeps RGB order and the Keras scale when no resize is needed', () => {
    const rgb = Uint8Array.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 128, 64, 32]);
    const output = preprocessRgbToMobileNetV3(rgb, 2, 2, 2);
    expect(output[0]).toBeCloseTo(255 / 127.5 - 1, 5);
    expect(output[1]).toBeCloseTo(-1, 5);
    expect(output[3]).toBeCloseTo(-1, 5);
    expect(output[4]).toBeCloseTo(1, 5);
    expect(output[5]).toBeCloseTo(-1, 5);
    expect(output[9]).toBeCloseTo(128 / 127.5 - 1, 5);
    expect(output[11]).toBeCloseTo(32 / 127.5 - 1, 5);
  });

  test('matches the Python antialiased downsample', () => {
    const output = preprocessRgbToMobileNetV3(
      Uint8Array.from(areaFixture.rgb),
      areaFixture.width,
      areaFixture.height,
      areaFixture.size,
    );
    expect(output).toHaveLength(areaFixture.expected.length);
    output.forEach((value, index) => {
      expect(value).toBeCloseTo(areaFixture.expected[index], 4);
    });
  });

  test('rounds a half-pixel average the way Math.round does', () => {
    const half = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../../training/fixtures/round_half_up_2x2_to_1.json'), 'utf8'),
    ) as { width: number; height: number; size: number; rgb: number[]; expected_uint8: number[] };
    const output = preprocessRgbToMobileNetV3(
      Uint8Array.from(half.rgb),
      half.width,
      half.height,
      half.size,
    );
    half.expected_uint8.forEach((pixel, index) => {
      expect(output[index]).toBeCloseTo(pixel / 127.5 - 1, 5);
    });
  });

  test('matches the Python bilinear fixture', () => {
    const output = preprocessRgbToMobileNetV3(
      Uint8Array.from(preprocessFixture.rgb),
      preprocessFixture.width,
      preprocessFixture.height,
      preprocessFixture.size,
    );
    expect(output).toHaveLength(preprocessFixture.expected.length);
    output.forEach((value, index) => {
      expect(value).toBeCloseTo(preprocessFixture.expected[index], 4);
    });
  });

  test('decodes a real PNG before normalizing', () => {
    const png = fs.readFileSync(path.join(__dirname, '../fixtures/solid-red-2x2.png'));
    const decoded = decodePngToRgb(new Uint8Array(png));
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(2);
    expect(Array.from(decoded.rgb)).toEqual([255, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0]);
    const output = preprocessRgbToMobileNetV3(decoded.rgb, decoded.width, decoded.height, 4);
    expect(output[0]).toBeCloseTo(1, 5);
    expect(output[1]).toBeCloseTo(-1, 5);
    expect(output[2]).toBeCloseTo(-1, 5);
  });
});
