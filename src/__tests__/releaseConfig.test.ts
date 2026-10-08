import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const script = path.join(root, 'scripts', 'assert-eas-release-config.mjs');

const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));

function writeFixture(directory: string, name: string, value: unknown): string {
  const filePath = path.join(directory, name);
  fs.writeFileSync(filePath, JSON.stringify(value));
  return filePath;
}

function runChecker(appPath: string, easPath: string): { status: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [script, '--app', appPath, '--eas', easPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stderr?: string; stdout?: string };
    return {
      status: failure.status ?? 1,
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
    };
  }
}

const readyApp = {
  expo: {
    owner: 'grzybobranie',
    android: { package: 'com.grzybobranie.ai' },
    ios: { bundleIdentifier: 'com.grzybobranie.ai' },
    extra: { eas: { projectId: '123e4567-e89b-42d3-a456-426614174000' } },
  },
};

const readyEas = {
  cli: { version: '>= 16.0.0', appVersionSource: 'remote' },
  build: {
    development: {
      distribution: 'internal',
      android: { buildType: 'apk' },
      ios: { simulator: true },
    },
    production: {
      autoIncrement: true,
      android: { buildType: 'app-bundle' },
    },
  },
  submit: {
    production: {
      android: {
        track: 'internal',
        releaseStatus: 'draft',
        applicationId: 'com.grzybobranie.ai',
      },
      ios: {
        ascAppId: '1234567890',
        appleTeamId: 'AB12XYZ34S',
        bundleIdentifier: 'com.grzybobranie.ai',
      },
    },
  },
};

describe('release config', () => {
  it('keeps remote production versioning and the development build profile', () => {
    expect(app.expo.owner).toEqual(expect.any(String));
    expect(app.expo.owner.length).toBeGreaterThan(0);
    expect(app.expo.extra.eas.projectId).toEqual(expect.any(String));
    expect(app.expo.extra.eas.projectId.length).toBeGreaterThan(0);
    expect(app.expo.android.package).toBe('com.grzybobranie.ai');
    expect(app.expo.ios.bundleIdentifier).toBe('com.grzybobranie.ai');

    expect(eas.cli.appVersionSource).toBe('remote');
    expect(eas.cli.version).toBe('>= 16.0.0');
    expect(eas.build.development).toEqual({
      distribution: 'internal',
      android: { buildType: 'apk' },
      ios: { simulator: true },
    });
    expect(eas.build.preview).toEqual({
      distribution: 'internal',
      android: { buildType: 'apk' },
    });
    expect(eas.build.production.autoIncrement).toBe(true);
    expect(eas.build.production.android.buildType).toBe('app-bundle');
    expect(['internal', 'alpha', 'beta', 'production']).toContain(eas.submit.production.android.track);
    expect(['completed', 'draft', 'halted', 'inProgress']).toContain(
      eas.submit.production.android.releaseStatus,
    );
    expect(eas.submit.production.android.applicationId).toBe(app.expo.android.package);
    expect(eas.submit.production.ios.ascAppId.length).toBeGreaterThan(0);
    expect(eas.submit.production.ios.appleTeamId.length).toBeGreaterThan(0);
    expect(eas.submit.production.ios.bundleIdentifier).toBe(app.expo.ios.bundleIdentifier);
  });

  it('accepts a linked project and rejects placeholders before a tag build', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eas-release-'));
    const ready = runChecker(
      writeFixture(directory, 'app.json', readyApp),
      writeFixture(directory, 'eas.json', readyEas),
    );
    expect(ready.status).toBe(0);

    const placeholderApp = {
      expo: {
        ...readyApp.expo,
        owner: 'REPLACE_WITH_EXPO_ACCOUNT_OWNER',
        extra: { eas: { projectId: 'REPLACE_WITH_EAS_PROJECT_ID' } },
      },
    };
    const blocked = runChecker(
      writeFixture(directory, 'placeholder-app.json', placeholderApp),
      writeFixture(directory, 'eas.json', readyEas),
    );
    expect(blocked.status).toBe(1);
    expect(blocked.output).toContain('eas init');
    expect(blocked.output).toContain('docs/RELEASE.md');

    const placeholderSubmit = {
      ...readyEas,
      submit: {
        production: {
          ...readyEas.submit.production,
          ios: {
            ...readyEas.submit.production.ios,
            ascAppId: 'REPLACE_WITH_APP_STORE_CONNECT_APPLE_ID',
            appleTeamId: 'REPLACE_WITH_APPLE_TEAM_ID',
          },
        },
      },
    };
    const storeBlocked = runChecker(
      writeFixture(directory, 'app.json', readyApp),
      writeFixture(directory, 'placeholder-eas.json', placeholderSubmit),
    );
    expect(storeBlocked.status).toBe(1);
    expect(storeBlocked.output).toContain('ascAppId');
    expect(storeBlocked.output).toContain('appleTeamId');
  });
});
