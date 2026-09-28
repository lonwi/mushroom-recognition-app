/// <reference types="jest" />
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { classifierService } from '../services/classifierService';
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
  test('Classifies image and returns top 3 predictions', async () => {
    const result = await classifierService.classifyImage(
      'file://test/mushroom.jpg',
      'boletus_edulis'
    );

    expect(result).toBeDefined();
    expect(result.topPredictions.length).toBe(3);
    expect(result.topPredictions[0].species.id).toBe('boletus_edulis');
    expect(result.topPredictions[0].confidence).toBeGreaterThan(90);
    expect(result.inferenceTimeMs).toBeGreaterThan(0);
  });

  test('Flags fatal look-alike risk when classifying Amanita phalloides', async () => {
    const result = await classifierService.classifyImage(
      'file://test/amanita.jpg',
      'amanita_phalloides'
    );

    expect(result.hasFatalLookAlikeRisk).toBe(true);
    expect(result.fatalLookAlikes.length).toBeGreaterThan(0);
  });

  test('Runs full TensorFlow.js forward pass without forced species ID', async () => {
    const result = await classifierService.classifyImage('file://camera/captured_mushroom.jpg');

    expect(result).toBeDefined();
    expect(result.topPredictions.length).toBe(3);
    expect(result.topPredictions[0].confidence).toBeGreaterThan(0);
    expect(result.topPredictions[0].species).toBeDefined();
    expect(result.inferenceTimeMs).toBeGreaterThan(0);
  });
});

