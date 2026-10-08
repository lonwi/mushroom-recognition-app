import * as ImageManipulator from 'expo-image-manipulator';
import { readPhotoAsPngBytes, previewResizeWidths, NATIVE_PREVIEW_EDGE } from '../../services/photoPixels';

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
