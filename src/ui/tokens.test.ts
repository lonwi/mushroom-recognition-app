import { contrastRatio } from '@/ui/contrast';
import {
  deadlyBadge,
  edibilityColor,
  edibilityInk,
  edibilityPresentation,
  elevation,
  getDeadlyBadgeColors,
  getStatusBadgeColors,
  greenEdibilityTokens,
  motion,
  radius,
  space,
  spacing,
  themes,
  touchTarget,
  touchTargetMinDp,
  typography,
  type StoredEdibility,
} from '@/ui/tokens';

test('keeps an 8 point grid, a 48 dp target, and spacing scale', () => {
  for (const value of Object.values(space)) {
    expect(value % 8).toBe(0);
  }
  expect(touchTargetMinDp).toBeGreaterThanOrEqual(48);
  expect(touchTarget.min).toBeGreaterThanOrEqual(48);
  expect(touchTarget.comfortable).toBeGreaterThanOrEqual(56);
  expect(spacing.gutter).toBe(16);
  expect(spacing.cardPadding).toBe(16);
  expect(radius.sm).toBe(4);
  expect(radius.full).toBe(9999);
});

test('verifies zero blur elevation and motion timing', () => {
  expect(elevation.level1.shadowRadius).toBe(0);
  expect(elevation.level2.shadowRadius).toBe(0);
  expect(elevation.level3.shadowRadius).toBe(0);
  expect(motion.touchFeedback).toBe(80);
});

test('verifies typography definitions', () => {
  expect(typography.headlineLg.fontSize).toBe(30);
  expect(typography.headlineMd.fontSize).toBe(18);
  expect(typography.speciesLatin.fontStyle).toBe('italic');
  expect(typography.bodyDefault.fontSize).toBe(13);
  expect(typography.labelBadge.fontSize).toBe(10);
});

test('verifies WCAG contrast ratios across all 3 field themes', () => {
  // Light theme (Botanical Paper): WCAG AA (>= 4.5:1)
  const light = themes.light;
  expect(contrastRatio(light.ink, light.paper)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(light.muted, light.paper)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(light.onAccent, light.accent)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(light.edible.text, light.edible.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(light.inedible.text, light.inedible.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(light.disputed.text, light.disputed.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(light.poisonous.text, light.poisonous.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(light.deadly.text, light.deadly.bg)).toBeGreaterThanOrEqual(4.5);

  // Dark theme (Forest Nocturne): WCAG AA (>= 4.5:1)
  const dark = themes.dark;
  expect(contrastRatio(dark.ink, dark.paper)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(dark.muted, dark.paper)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(dark.onAccent, dark.accent)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(dark.edible.text, dark.edible.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(dark.inedible.text, dark.inedible.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(dark.poisonous.text, dark.poisonous.bg)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(dark.deadly.text, dark.deadly.bg)).toBeGreaterThanOrEqual(4.5);

  // High Contrast theme (Ostre słońce, brak szarości): WCAG AAA (>= 7.0:1)
  const hc = themes.highContrast;
  expect(contrastRatio(hc.ink, hc.paper)).toBeGreaterThanOrEqual(7.0);
  expect(contrastRatio(hc.muted, hc.paper)).toBeGreaterThanOrEqual(7.0);
  expect(contrastRatio(hc.onAccent, hc.accent)).toBeGreaterThanOrEqual(7.0);
  expect(contrastRatio(hc.edible.text, hc.edible.bg)).toBeGreaterThanOrEqual(7.0);
  expect(contrastRatio(hc.inedible.text, hc.inedible.bg)).toBeGreaterThanOrEqual(7.0);
  expect(contrastRatio(hc.disputed.text, hc.disputed.bg)).toBeGreaterThanOrEqual(7.0);
});

test('deadly badge follows special High Contrast rule with AAA contrast', () => {
  // Light / Dark: AA >= 5.18:1
  expect(contrastRatio(deadlyBadge.text, deadlyBadge.background)).toBeGreaterThanOrEqual(5.18);
  const lightColors = getDeadlyBadgeColors('light');
  expect(lightColors.text).toBe(deadlyBadge.text);
  expect(lightColors.borderWidth).toBe(1.5);

  // High Contrast: AAA >= 18.0:1
  expect(
    contrastRatio(deadlyBadge.textHighContrast, deadlyBadge.background),
  ).toBeGreaterThanOrEqual(18.0);
  const hcColors = getDeadlyBadgeColors('highContrast');
  expect(hcColors.text).toBe(deadlyBadge.textHighContrast);
  expect(hcColors.borderWidth).toBe(2);
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

  const disputedColors = getStatusBadgeColors('CONDITIONALLY_EDIBLE', false, 'light');
  expect(greens.has(disputedColors.text)).toBe(false);
});
