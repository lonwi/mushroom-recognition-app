import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  buildSpeciesMatch,
  countSpecies,
  foldForSearch,
  getSpeciesDetail,
  searchSpecies,
} from '@/core/db/species-search';
import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';

const root = path.resolve(__dirname, '../../..');

describe('species-search', () => {
  describe('buildSpeciesMatch', () => {
    it('folds Polish diacritics including ł and builds prefix tokens', () => {
      expect(buildSpeciesMatch('gołąbek')).toBe('"golabek"*');
      expect(buildSpeciesMatch('żółty')).toBe('"zolty"*');
      expect(buildSpeciesMatch('łuskwiak')).toBe('"luskwiak"*');
    });

    it('combines multiple words with AND', () => {
      expect(buildSpeciesMatch('borowik szlachetny')).toBe('"borowik"* AND "szlachetny"*');
    });

    it('strips special characters safely without FTS syntax errors', () => {
      expect(buildSpeciesMatch('borowik (szlachetny) * OR NOT - "test"')).toBe(
        '"borowik"* AND "szlachetny"* AND "or"* AND "not"* AND "test"*',
      );
    });

    it('returns null for empty or whitespace-only queries', () => {
      expect(buildSpeciesMatch('')).toBeNull();
      expect(buildSpeciesMatch('   ')).toBeNull();
      expect(buildSpeciesMatch('***---')).toBeNull();
    });

    it('folds uppercase Polish characters identically', () => {
      expect(foldForSearch('ŁUSKWIAK ŻÓŁTY')).toBe('luskwiak zolty');
    });
  });

  describe('database queries', () => {
    let db: SpeciesSql;
    let rawDb: DatabaseSync;

    beforeAll(() => {
      const dir = mkdtempSync(path.join(tmpdir(), 'species-search-test-'));
      const dbPath = path.join(dir, 'species.db');
      execFileSync(
        'pnpm',
        [
          'exec',
          'tsx',
          'scripts/build-species-db.ts',
          '--out',
          dbPath,
          '--report',
          path.join(dir, 'report.json'),
          '--photos',
          path.join(dir, 'photos'),
        ],
        {
          cwd: root,
          env: { ...process.env, HF_TOKEN_READONLY: '' },
          stdio: 'pipe',
        },
      );
      rawDb = new DatabaseSync(dbPath, { readOnly: true });
      db = {
        exec: (sql) => rawDb.exec(sql),
        run: (sql, params = []) => rawDb.prepare(sql).run(...params),
        all: <T extends Record<string, SqlValue>>(sql: string, params: readonly SqlValue[] = []) =>
          rawDb.prepare(sql).all(...params) as T[],
      };
    });

    afterAll(() => {
      rawDb.close();
    });

    it('finds expected species for key canon queries (D13 l. 56, D8 §3.3)', () => {
      const golabek = searchSpecies(db, { query: 'golabek' }).map((s) => s.id);
      expect(golabek).toEqual(
        expect.arrayContaining(['russula_emetica', 'russula_vesca', 'russula_virescens']),
      );

      const zolty = searchSpecies(db, { query: 'żółty' }).map((s) => s.id);
      const zoltyAscii = searchSpecies(db, { query: 'zolty' }).map((s) => s.id);
      expect(zolty).toEqual(zoltyAscii);
      expect(zolty).toContain('suillus_grevillei');

      const phall = searchSpecies(db, { query: 'phall' }).map((s) => s.id);
      expect(phall).toContain('amanita_phalloides');

      const luskwiak = searchSpecies(db, { query: 'łuskwiak' }).map((s) => s.id);
      expect(luskwiak).toEqual(
        expect.arrayContaining(['kuehneromyces_mutabilis', 'pholiota_squarrosa']),
      );
    });

    it('filters by edibility correctly', () => {
      const deadly = searchSpecies(db, { edibility: ['DEADLY_POISONOUS'] });
      expect(deadly.length).toBeGreaterThan(0);
      for (const item of deadly) {
        expect(item.edibility).toBe('DEADLY_POISONOUS');
      }
      expect(deadly.map((s) => s.id)).toContain('amanita_phalloides');
    });

    it('filters by hymenophore correctly', () => {
      const tubes = searchSpecies(db, { hymenophore: ['rurki'] });
      expect(tubes.length).toBeGreaterThan(0);
      for (const item of tubes) {
        expect(item.hymenophore).toBe('TUBES');
      }
      expect(tubes.map((s) => s.id)).toContain('boletus_edulis');
    });

    it('filters by season (months) correctly', () => {
      const mayFinds = searchSpecies(db, { season: [5] });
      expect(mayFinds.length).toBeGreaterThan(0);
      for (const item of mayFinds) {
        expect(item.months).toContain(5);
      }
    });

    it('supports combined filters with query', () => {
      const filtered = searchSpecies(db, {
        query: 'borowik',
        edibility: ['EDIBLE'],
        hymenophore: ['rurki'],
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.map((s) => s.id)).toContain('boletus_edulis');
    });

    it('counts matching species accurately', () => {
      const totalCount = countSpecies(db, {});
      expect(totalCount).toBe(89);

      const edibilityCount = countSpecies(db, { edibility: ['DEADLY_POISONOUS'] });
      const deadlyList = searchSpecies(db, { edibility: ['DEADLY_POISONOUS'], limit: 100 });
      expect(edibilityCount).toBe(deadlyList.length);
    });

    it('paginates results with limit and offset', () => {
      const page1 = searchSpecies(db, { limit: 5, offset: 0 });
      const page2 = searchSpecies(db, { limit: 5, offset: 5 });

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      const page1Ids = page1.map((s) => s.id);
      const page2Ids = page2.map((s) => s.id);
      for (const id of page2Ids) {
        expect(page1Ids).not.toContain(id);
      }
    });

    it('loads full species detail with lookalikes and safety fields', () => {
      const detail = getSpeciesDetail(db, 'amanita_phalloides');
      expect(detail).not.toBeNull();
      if (!detail) return;

      expect(detail.id).toBe('amanita_phalloides');
      expect(detail.latinName).toBe('Amanita phalloides');
      expect(detail.name).toBe('Muchomor sromotnikowy (zielonawy)');
      expect(detail.edibility).toBe('DEADLY_POISONOUS');
      expect(detail.warning).toMatch(/toksykologii/i);
      expect(detail.lookAlikes.length).toBeGreaterThan(0);
      expect(detail.uncoveredLookAlikes.length).toBeGreaterThanOrEqual(0);
    });

    it('returns null for nonexistent species id', () => {
      expect(getSpeciesDetail(db, 'nonexistent_mushroom')).toBeNull();
    });
  });
});
