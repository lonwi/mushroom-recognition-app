import * as ImageManipulator from 'expo-image-manipulator';
import { readPhotoAsPngBytes, NATIVE_PREVIEW_EDGE } from '../../services/photoPixels';

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { PNG: 'png' },
  manipulateAsync: jest.fn(async () => ({
    base64: Buffer.from([9, 8, 7]).toString('base64'),
  })),
}));

describe('readPhotoAsPngBytes', () => {
  beforeEach(() => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockClear();
  });

  it('asks the native decoder to apply EXIF and resize to 448 before base64', async () => {
    const bytes = await readPhotoAsPngBytes('file://camera/capture.jpg');

    expect(NATIVE_PREVIEW_EDGE).toBe(448);
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file://camera/capture.jpg',
      [{ resize: { width: 448 } }],
      { compress: 1, format: 'png', base64: true },
    );
    expect(Array.from(bytes)).toEqual([9, 8, 7]);
  });
});
