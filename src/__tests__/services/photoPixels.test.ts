import * as ImageManipulator from 'expo-image-manipulator';
import { readPhotoAsPngBytes, previewResizeWidths, NATIVE_PREVIEW_EDGE } from '../../services/photoPixels';

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { PNG: 'png' },
  manipulateAsync: jest.fn(async (_uri: string, actions: Array<{ resize?: { width: number } }>) => {
    if (!actions.length) {
      return { uri: 'file://upright.png', width: 4032, height: 3024 };
    }
    return {
      uri: 'file://preview.png',
      width: 448,
      height: 336,
      base64: Buffer.from([9, 8, 7]).toString('base64'),
    };
  }),
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
    (ImageManipulator.manipulateAsync as jest.Mock).mockClear();
  });

  it('probes upright width, then resizes in steps of at most 2×', async () => {
    const bytes = await readPhotoAsPngBytes('file://camera/capture.jpg');

    expect(ImageManipulator.manipulateAsync).toHaveBeenNthCalledWith(
      1,
      'file://camera/capture.jpg',
      [],
      { compress: 1, format: 'png', base64: false },
    );
    expect(ImageManipulator.manipulateAsync).toHaveBeenNthCalledWith(
      2,
      'file://upright.png',
      [
        { resize: { width: 2016 } },
        { resize: { width: 1008 } },
        { resize: { width: 504 } },
        { resize: { width: 448 } },
      ],
      { compress: 1, format: 'png', base64: true },
    );
    expect(Array.from(bytes)).toEqual([9, 8, 7]);
  });
});
