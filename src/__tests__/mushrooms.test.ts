/// <reference types="jest" />
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { GOLDEN_RULES, TOXICOLOGY_CENTERS } from '../data/safetyRules';

describe('Mushroom Database & Safety Verification', () => {
  test('Database contains valid Central European mushroom species', () => {
    expect(MUSHROOMS_DATABASE.length).toBeGreaterThan(5);
    const bolete = MUSHROOMS_DATABASE.find((m) => m.id === 'boletus_edulis');
    expect(bolete).toBeDefined();
    expect(bolete?.status).toBe('EDIBLE');
    expect(bolete?.hymenophore).toBe('TUBES');
  });

  test('Amanita phalloides is flagged as DEADLY_POISONOUS with fatal look-alikes', () => {
    const deathCap = MUSHROOMS_DATABASE.find((m) => m.id === 'amanita_phalloides');
    expect(deathCap).toBeDefined();
    expect(deathCap?.status).toBe('DEADLY_POISONOUS');
    expect(deathCap?.hymenophore).toBe('GILLS');

    const hasKaniaConfusion = deathCap?.confusionRisks.some(
      (r) => r.confusedWithId === 'macrolepiota_procera' && r.fatal === true
    );
    expect(hasKaniaConfusion).toBe(true);
  });

  test('Golden rules and toxicology hotlines are properly configured', () => {
    expect(GOLDEN_RULES.length).toBeGreaterThanOrEqual(4);
    expect(TOXICOLOGY_CENTERS.length).toBeGreaterThanOrEqual(4);

    const warsaw = TOXICOLOGY_CENTERS.find((c) => c.city === 'Warszawa');
    expect(warsaw).toBeDefined();
    expect(warsaw?.phone).toContain('22');
  });
});

describe('Mushroom Classifier Offline Engine', () => {
  test('PlatformReactNative properly validates typed arrays for Hermes/React Native', () => {
    const { PlatformReactNative } = require('../utils/tfjsPlatform');
    const platform = new PlatformReactNative();

    expect(platform.isTypedArray(new Float32Array([1, 2, 3]))).toBe(true);
    expect(platform.isTypedArray(new Int32Array([1, 2, 3]))).toBe(true);
    expect(platform.isTypedArray(new Uint8Array([1, 2, 3]))).toBe(true);
    expect(platform.isTypedArray(new Uint8ClampedArray([1, 2, 3]))).toBe(true);
    expect(platform.isTypedArray([1, 2, 3])).toBe(false);
    expect(platform.isTypedArray('not an array')).toBe(false);
    expect(platform.isTypedArray(null)).toBe(false);
  });
});

