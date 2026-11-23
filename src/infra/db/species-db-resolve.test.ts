import { createRequire } from 'node:module';
import { join } from 'node:path';

const nodeRequire = createRequire(join(process.cwd(), 'package.json'));
const { speciesDbResolveTarget } = nodeRequire('./scripts/species-db-resolve.cjs') as {
  speciesDbResolveTarget: (resolvedPath: string, dbPath: string, dbExists: boolean) => string;
};

const stub = '/repo/src/infra/db/species-db-asset.ts';
const db = '/repo/assets/db/species.db';

test('bez pliku zostawia zaślepkę, z plikiem podmienia tylko ten moduł', () => {
  expect(speciesDbResolveTarget(stub, db, false)).toBe(stub);
  expect(speciesDbResolveTarget(stub, db, true)).toBe(db);
  expect(speciesDbResolveTarget('/repo/src/infra/db/species-db.ts', db, true)).toBe(
    '/repo/src/infra/db/species-db.ts',
  );
  expect(speciesDbResolveTarget('C:\\repo\\src\\infra\\db\\species-db-asset.ts', db, true)).toBe(
    db,
  );
});
