/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SPECIES_CACHE_KEY,
  SPECIES_CACHE_VERSION_KEY,
  SPECIES_SCHEMA_VERSION,
  bundledBaselineDataset,
  cacheRemoteDataset,
  fetchRemoteDataset,
  loadSpeciesDataset,
  refreshSpeciesDataset,
  validateSpeciesPayload,
} from '../../services/speciesData';
import { speciesManifest } from '../../services/speciesManifest';
import type { MushroomSpecies } from '../../types/mushroom';
import type { RemoteSpeciesPayload } from '../../types/speciesData';

function validPayload(): RemoteSpeciesPayload {
  return {
    species: [
      {
        id: 'boletus_edulis',
        namePl: 'Prawdziwki',
        nameLatin: 'Boletus edulis',
        commonNicknames: ['Borowik szlachetny'],
        family: 'Borowikowate (Boletaceae)',
        status: 'EDIBLE',
        hymenophore: 'TUBES',
        months: [6, 7, 8, 9],
        habitat: 'x',
        capDescription: 'x',
        hymenophoreDescription: 'x',
        stemDescription: 'x',
        fleshDescription: 'x',
        tasteAndSmell: 'x',
        culinaryValue: 'x',
        confusionRisks: [],
      },
    ],
    manifest: {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      datasetVersion: speciesManifest.datasetVersion,
      publishedAt: '2026-10-31',
      speciesCount: 1,
      sha256: 'deadbeef',
    },
  };
}

function minimalSpecies(overrides: Partial<MushroomSpecies> = {}): MushroomSpecies {
  return {
    id: 'test_species',
    namePl: 'Test',
    nameLatin: 'Test species',
    commonNicknames: [],
    family: 'Family',
    status: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [1, 2, 3],
    habitat: 'habitat',
    capDescription: 'cap',
    hymenophoreDescription: 'hymenophore',
    stemDescription: 'stem',
    fleshDescription: 'flesh',
    tasteAndSmell: 'taste',
    culinaryValue: 'culinary',
    confusionRisks: [],
    ...overrides,
  };
}

describe('validateSpeciesPayload', () => {
  it('accepts a well-formed payload', () => {
    const result = validateSpeciesPayload(validPayload());
    expect(result).not.toBeNull();
    expect(result?.species).toHaveLength(1);
    expect(result?.datasetVersion).toBe(speciesManifest.datasetVersion);
  });

  it('rejects a null payload', () => {
    expect(validateSpeciesPayload(null)).toBeNull();
  });

  it('rejects a payload with the wrong schema version', () => {
    const payload = validPayload();
    payload.manifest.schemaVersion = SPECIES_SCHEMA_VERSION + 1;
    expect(validateSpeciesPayload(payload)).toBeNull();
  });

  it('rejects a payload missing required fields', () => {
    const { habitat, ...rest } = minimalSpecies();
    const payload = { species: [rest], manifest: validPayload().manifest };
    expect(validateSpeciesPayload(payload)).toBeNull();
  });

  it('rejects a payload whose species is not an array', () => {
    const payload = {
      species: {} as unknown as MushroomSpecies[],
      manifest: validPayload().manifest,
    };
    expect(validateSpeciesPayload(payload)).toBeNull();
  });

  it('rejects a species whose confusionRisks is missing', () => {
    const { confusionRisks, ...rest } = minimalSpecies();
    const payload = { species: [rest], manifest: validPayload().manifest };
    expect(validateSpeciesPayload(payload)).toBeNull();
  });
});

describe('bundledBaselineDataset', () => {
  it('reports the manifest dataset version and a non-empty species list', () => {
    const dataset = bundledBaselineDataset();
    expect(dataset.datasetVersion).toBe(speciesManifest.datasetVersion);
    expect(dataset.species.length).toBeGreaterThan(0);
    expect(dataset.species[0].id).toBeDefined();
  });
});

describe('loadSpeciesDataset', () => {
  const cache = {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
  };

  it('falls back to the bundled baseline when nothing is cached', async () => {
    const dataset = await loadSpeciesDataset(cache);
    expect(dataset.datasetVersion).toBe(speciesManifest.datasetVersion);
    expect(dataset.species.length).toBeGreaterThan(0);
  });

  it('uses a validated cached copy that matches the manifest version', async () => {
    const payload = validPayload();
    cache.getItem.mockImplementation(async (key: string) => {
      if (key === SPECIES_CACHE_VERSION_KEY) return payload.manifest.datasetVersion;
      if (key === SPECIES_CACHE_KEY) return JSON.stringify(payload);
      return null;
    });
    const dataset = await loadSpeciesDataset(cache);
    expect(dataset.species).toHaveLength(1);
    expect(dataset.species[0].id).toBe('boletus_edulis');
  });

  it('ignores a cached copy whose version does not match', async () => {
    cache.getItem.mockImplementation(async (key: string) => {
      if (key === SPECIES_CACHE_VERSION_KEY) return 'some-other-version';
      return null;
    });
    const dataset = await loadSpeciesDataset(cache);
    expect(dataset.datasetVersion).toBe(speciesManifest.datasetVersion);
  });

  it('falls back to the baseline when the cached copy is invalid', async () => {
    cache.getItem.mockImplementation(async (key: string) => {
      if (key === SPECIES_CACHE_VERSION_KEY) return speciesManifest.datasetVersion;
      if (key === SPECIES_CACHE_KEY) return '{not-json';
      return null;
    });
    const dataset = await loadSpeciesDataset(cache);
    expect(dataset.datasetVersion).toBe(speciesManifest.datasetVersion);
  });
});

describe('cacheRemoteDataset', () => {
  const cache = {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    cache.getItem.mockClear();
    cache.setItem.mockClear();
    cache.removeItem.mockClear();
  });

  it('stores the payload and its version', async () => {
    const result = await cacheRemoteDataset(validPayload(), cache);
    expect(result?.datasetVersion).toBe(speciesManifest.datasetVersion);
    expect(cache.setItem).toHaveBeenCalledWith(SPECIES_CACHE_KEY, expect.any(String));
    expect(cache.setItem).toHaveBeenCalledWith(
      SPECIES_CACHE_VERSION_KEY,
      speciesManifest.datasetVersion,
    );
  });

  it('returns null and does not store an invalid payload', async () => {
    const result = await cacheRemoteDataset(null, cache);
    expect(result).toBeNull();
    expect(cache.setItem).not.toHaveBeenCalled();
  });
});

describe('fetchRemoteDataset', () => {
  it('returns a validated dataset when the server responds ok', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      ({ ok: true, json: async () => validPayload() }) as unknown as Response) as typeof fetch;
    try {
      const dataset = await fetchRemoteDataset('https://example.com/species.json');
      expect(dataset).not.toBeNull();
      expect(dataset?.species).toHaveLength(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('returns null when the server responds non-ok', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      ({ ok: false, json: async () => (undefined as unknown as Response) }) as unknown as Response) as typeof fetch;
    try {
      expect(await fetchRemoteDataset('https://example.com/species.json')).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('returns null when the network throws', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    try {
      expect(await fetchRemoteDataset('https://example.com/species.json')).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('refreshSpeciesDataset', () => {
  const cache = {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
  };

  it('caches the remote copy and returns it', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      ({ ok: true, json: async () => validPayload() }) as unknown as Response) as typeof fetch;
    try {
      const dataset = await refreshSpeciesDataset('https://example.com/species.json', cache);
      expect(dataset?.species).toHaveLength(1);
      expect(cache.setItem).toHaveBeenCalledWith(
        SPECIES_CACHE_VERSION_KEY,
        speciesManifest.datasetVersion,
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('falls back to the baseline when the remote copy fails', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    try {
      const dataset = await refreshSpeciesDataset('https://example.com/species.json', cache);
      expect(dataset.datasetVersion).toBe(speciesManifest.datasetVersion);
      expect(dataset.species.length).toBeGreaterThan(0);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('storage keys are versioned', () => {
  it('keeps the cached payload and its version in separate keys', () => {
    expect(SPECIES_CACHE_KEY).not.toBe(SPECIES_CACHE_VERSION_KEY);
    expect(SPECIES_CACHE_KEY).toMatch(/species_v1$/);
  });
});

