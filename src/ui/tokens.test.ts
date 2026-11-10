import { contrastRatio } from '@/ui/contrast';
import {
  deadlyBadge,
  edibilityInk,
  edibilityPresentation,
  space,
  themes,
  touchTargetMinDp,
} from '@/ui/tokens';

test('keeps an 8 point grid, a 48 dp target, and readable themes', () => {
  for (const value of Object.values(space)) {
    expect(value % 8).toBe(0);
  }
  expect(touchTargetMinDp).toBeGreaterThanOrEqual(48);
  for (const colors of Object.values(themes)) {
    expect(contrastRatio(colors.ink, colors.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.muted, colors.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrastRatio(deadlyBadge.text, deadlyBadge.background)).toBeGreaterThanOrEqual(5.18);
});

test('conditionally edible is never the edible green', () => {
  expect(edibilityPresentation.CONDITIONALLY_EDIBLE).toBe('disputed');
  expect(edibilityInk.disputed).not.toBe(edibilityInk.edible);
});
