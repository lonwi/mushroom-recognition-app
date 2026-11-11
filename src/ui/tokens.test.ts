import { contrastRatio } from '@/ui/contrast';
import {
  deadlyBadge,
  edibilityColor,
  edibilityInk,
  edibilityPresentation,
  greenEdibilityTokens,
  space,
  themes,
  touchTargetMinDp,
  type StoredEdibility,
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

test('conditional and disputed statuses are not tied to a green token', () => {
  const greens = new Set<string>(Object.values(greenEdibilityTokens));
  const statuses = Object.keys(edibilityPresentation) as StoredEdibility[];
  for (const status of statuses) {
    expect(greens.has(edibilityColor(status, true))).toBe(false);
  }
  expect(greens.has(edibilityColor('CONDITIONALLY_EDIBLE', false))).toBe(false);
  expect(edibilityColor('EDIBLE', false)).toBe(greenEdibilityTokens.edible);
});
