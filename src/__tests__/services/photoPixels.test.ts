import * as ImageManipulator from 'expo-image-manipulator';
import {
  readPhotoAsPngBytes,
  previewResizeWidths,
  NATIVE_PREVIEW_EDGE,
  SKIP_PROCESSING_CAPTURE,
  uprightCaptureWidth,
  uprightWidthFromExif,
  widthForCapture,
} from '../../services/photoPixels';

type ContextRecord = { uri: string; widths: number[]; saved: boolean };

const contexts: ContextRecord[] = [];

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { PNG: 'png' },
  ImageManipulator: {
    manipulate: jest.fn((uri: string) => {
      const record: ContextRecord = { uri, widths: [], saved: false };
      contexts.push(record);
      const api = {
        resize(action: { width: number }) {
          record.widths.push(action.width);
          return api;
        },
        async renderAsync() {
          if (record.widths.length === 0) {
            return {
              width: 4032,
              height: 3024,
              saveAsync: jest.fn(async () => {
                record.saved = true;
                return { base64: Buffer.from([1]).toString('base64') };
              }),
            };
          }
          return {
            width: record.widths[record.widths.length - 1],
            height: 336,
            saveAsync: jest.fn(async () => {
              record.saved = true;
              return { base64: Buffer.from([9, 8, 7]).toString('base64') };
            }),
          };
        },
      };
      return api;
    }),
  },
}));

describe('previewResizeWidths', () => {
  it('keeps each step at most 2× and stops at width 448', () => {
    expect(NATIVE_PREVIEW_EDGE).toBe(448);
    expect(previewResizeWidths(448)).toEqual([]);
    expect(previewResizeWidths(800)).toEqual([448]);
    expect(previewResizeWidths(4032)).toEqual([2016, 1008, 504, 448]);
    const steps = [4032, ...previewResizeWidths(4032)];
    for (let index = 1; index < steps.length; index += 1) {
      expect(steps[index - 1] / steps[index]).toBeLessThanOrEqual(2);
    }
  });
});

describe('readPhotoAsPngBytes', () => {
  beforeEach(() => {
    contexts.length = 0;
    (ImageManipulator.ImageManipulator.manipulate as jest.Mock).mockClear();
  });

  it('reads width with renderAsync and encodes only the resized preview', async () => {
    const bytes = await readPhotoAsPngBytes('file://camera/capture.jpg');

    expect(contexts).toHaveLength(2);
    expect(contexts[0].widths).toEqual([]);
    expect(contexts[0].saved).toBe(false);
    expect(contexts[1].widths).toEqual([2016, 1008, 504, 448]);
    expect(contexts[1].saved).toBe(true);
    expect(Array.from(bytes)).toEqual([9, 8, 7]);
  });

  it('uses the camera width and does not render the original just to measure it', async () => {
    const bytes = await readPhotoAsPngBytes('file://camera/capture.jpg', 800);

    expect(contexts).toHaveLength(1);
    expect(contexts[0].widths).toEqual([448]);
    expect(contexts[0].saved).toBe(true);
    expect(Array.from(bytes)).toEqual([9, 8, 7]);
  });
});

describe('uprightCaptureWidth', () => {
  it('ignores photo.width when expo-camera skipped EXIF rotation', () => {
    expect(SKIP_PROCESSING_CAPTURE).toEqual({ skipProcessing: true });
    expect(uprightCaptureWidth(4032, SKIP_PROCESSING_CAPTURE)).toBeUndefined();
  });

  it('keeps photo.width after the camera applied EXIF rotation', () => {
    expect(uprightCaptureWidth(3024, { skipProcessing: false })).toBe(3024);
    expect(uprightCaptureWidth(undefined, { skipProcessing: false })).toBeUndefined();
  });
});

describe('uprightWidthFromExif', () => {
  const stored = { PixelXDimension: 4032, PixelYDimension: 3024, ImageWidth: 4032, ImageLength: 3024 };

  it('keeps the stored width for orientations 1–4', () => {
    for (const orientation of [1, 2, 3, 4]) {
      expect(uprightWidthFromExif({ ...stored, Orientation: orientation })).toBe(4032);
    }
  });

  it('swaps width and height for orientations 5–8', () => {
    for (const orientation of [5, 6, 7, 8]) {
      expect(uprightWidthFromExif({ ...stored, Orientation: orientation })).toBe(3024);
    }
  });

  it('reads Android ImageWidth and iOS PixelXDimension, including nested exif', () => {
    expect(uprightWidthFromExif({ Orientation: 6, ImageWidth: 4032, ImageLength: 3024 })).toBe(3024);
    expect(uprightWidthFromExif({ Orientation: 1, PixelXDimension: 800, PixelYDimension: 600 })).toBe(800);
    expect(
      uprightWidthFromExif({
        '{Exif}': { Orientation: '8', PixelXDimension: '4032', PixelYDimension: '3024' },
      }),
    ).toBe(3024);
  });

  it('does not return an unswapped width when the stored height is missing', () => {
    expect(uprightWidthFromExif({ Orientation: 6, ImageWidth: 4032 })).toBeUndefined();
    expect(uprightWidthFromExif(null)).toBeUndefined();
    expect(uprightWidthFromExif({})).toBeUndefined();
  });

  it('uses EXIF for a skipProcessing capture and the platform width otherwise', () => {
    const portrait = {
      width: 4032,
      height: 3024,
      exif: { Orientation: 6, PixelXDimension: 4032, PixelYDimension: 3024 },
    };
    expect(widthForCapture(portrait, SKIP_PROCESSING_CAPTURE)).toBe(3024);
    expect(widthForCapture({ width: 3024, exif: portrait.exif }, { skipProcessing: false })).toBe(3024);
  });
});
