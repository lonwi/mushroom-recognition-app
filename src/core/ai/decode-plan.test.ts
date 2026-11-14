import {
  chooseInSampleSize,
  SPIKE_MIN_SHORT_SIDE,
  targetSizeForShortSide,
} from '@/core/ai/decode-plan';

const floor = SPIKE_MIN_SHORT_SIDE;

test('inSampleSize keeps the short side at or above the floor', () => {
  expect(chooseInSampleSize(4000, 3000, floor)).toBe(4);
  expect(Math.floor(3000 / 4)).toBeGreaterThanOrEqual(floor);
  expect(Math.floor(3000 / 8)).toBeLessThan(floor);

  expect(chooseInSampleSize(1600, 900, floor)).toBe(2);
  expect(chooseInSampleSize(1000, 895, floor)).toBe(1);
  expect(chooseInSampleSize(400, 300, floor)).toBe(1);
  expect(chooseInSampleSize(896, 896, floor)).toBe(2);
  expect(chooseInSampleSize(449, 449, floor)).toBe(1);
});

test('ImageDecoder target size hits the short side and keeps aspect', () => {
  expect(targetSizeForShortSide(4000, 3000, floor)).toEqual({
    width: 597,
    height: 448,
    scaled: true,
  });
  expect(targetSizeForShortSide(900, 1600, floor)).toEqual({
    width: 448,
    height: 796,
    scaled: true,
  });
  expect(targetSizeForShortSide(895, 1000, floor)).toEqual({
    width: 448,
    height: 501,
    scaled: true,
  });
  expect(targetSizeForShortSide(400, 300, floor)).toEqual({
    width: 400,
    height: 300,
    scaled: false,
  });
  expect(targetSizeForShortSide(896, 896, floor)).toEqual({
    width: 448,
    height: 448,
    scaled: true,
  });
});

test('the spike floor is the decoder minimum, not a model input size', () => {
  expect(SPIKE_MIN_SHORT_SIDE).toBe(448);
});
