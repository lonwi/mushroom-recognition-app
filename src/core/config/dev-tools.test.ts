import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import eas from '../../../eas.json';
import { devToolsEnabled } from '@/core/config/dev-tools';

const nodeRequire = createRequire(join(process.cwd(), 'package.json'));
const { shouldStripDevRoutes } = nodeRequire('./scripts/dev-route-block.cjs') as {
  shouldStripDevRoutes: (env: NodeJS.ProcessEnv) => boolean;
};

const devFlag = globalThis as unknown as { __DEV__: boolean };
const root = process.cwd();

type EasProfile = {
  env?: Record<string, string>;
};

const profiles = eas.build as unknown as Record<string, EasProfile>;

describe('devToolsEnabled', () => {
  const originalDev = devFlag.__DEV__;
  const originalFlag = process.env.EXPO_PUBLIC_DEV_TOOLS;

  afterEach(() => {
    devFlag.__DEV__ = originalDev;
    if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_DEV_TOOLS;
    else process.env.EXPO_PUBLIC_DEV_TOOLS = originalFlag;
  });

  test.each([
    ['1', true],
    ['0', false],
    ['true', false],
    ['', false],
    [undefined, false],
  ] as const)('flaga %j przy wyłączonym __DEV__ daje %s', (flag, expected) => {
    devFlag.__DEV__ = false;
    if (flag === undefined) delete process.env.EXPO_PUBLIC_DEV_TOOLS;
    else process.env.EXPO_PUBLIC_DEV_TOOLS = flag;
    expect(devToolsEnabled()).toBe(expected);
  });

  test('__DEV__ włącza narzędzia bez flagi', () => {
    devFlag.__DEV__ = true;
    delete process.env.EXPO_PUBLIC_DEV_TOOLS;
    expect(devToolsEnabled()).toBe(true);
  });

  test('zostawia literał EXPO_PUBLIC_DEV_TOOLS, żeby Expo wstawił go w paczkę', () => {
    const source = readFileSync(join(root, 'src/core/config/dev-tools.ts'), 'utf8');
    expect(source).toContain("process.env.EXPO_PUBLIC_DEV_TOOLS === '1'");
  });
});

describe('eas.json', () => {
  test('development i preview włączają narzędzia, produkcja ich nie ma', () => {
    expect(profiles.development?.env?.EXPO_PUBLIC_DEV_TOOLS).toBe('1');
    expect(profiles.preview?.env?.EXPO_PUBLIC_DEV_TOOLS).toBe('1');
    expect(profiles.production?.env).toBeUndefined();
    expect(JSON.stringify(eas.build.production)).not.toContain('EXPO_PUBLIC_DEV_TOOLS');
  });
});

describe('wycinanie tras dev', () => {
  test('produkcja bez flagi wycina src/app/dev, flaga 1 zostawia', () => {
    expect(shouldStripDevRoutes({ NODE_ENV: 'production' })).toBe(true);
    expect(shouldStripDevRoutes({ NODE_ENV: 'production', EXPO_PUBLIC_DEV_TOOLS: '0' })).toBe(true);
    expect(shouldStripDevRoutes({ NODE_ENV: 'production', EXPO_PUBLIC_DEV_TOOLS: '1' })).toBe(
      false,
    );
    expect(shouldStripDevRoutes({ NODE_ENV: 'development', EXPO_PUBLIC_DEV_TOOLS: '1' })).toBe(
      false,
    );
    expect(shouldStripDevRoutes({ NODE_ENV: 'test' })).toBe(false);
  });

  test('metro.config.js używa tej samej decyzji', () => {
    const source = readFileSync(join(root, 'metro.config.js'), 'utf8');
    expect(source).toContain('shouldStripDevRoutes(process.env)');
  });
});
