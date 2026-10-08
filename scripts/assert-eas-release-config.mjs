import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER_PREFIX = 'REPLACE_WITH_';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APPLE_TEAM_ID_PATTERN = /^[A-Z0-9]{10}$/;
const ASC_APP_ID_PATTERN = /^\d{8,}$/;
const PLAY_TRACKS = new Set(['internal', 'alpha', 'beta', 'production']);
const RELEASE_STATUSES = new Set(['completed', 'draft', 'halted', 'inProgress']);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read ${filePath}: ${reason}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${filePath} is not valid JSON: ${reason}`);
  }
}

function isPlaceholder(value) {
  return typeof value === 'string' && value.includes(PLACEHOLDER_PREFIX);
}

/**
 * @param {unknown} appJson
 * @param {unknown} easJson
 * @returns {string[]}
 */
export function collectReleaseBlockers(appJson, easJson) {
  const errors = [];
  const expo = appJson && typeof appJson === 'object' ? appJson.expo : undefined;
  if (!expo || typeof expo !== 'object') {
    errors.push('app.json is missing the "expo" object.');
    return errors;
  }

  const owner = expo.owner;
  if (typeof owner !== 'string' || owner.trim() === '' || isPlaceholder(owner)) {
    errors.push(
      'expo.owner is missing or still a placeholder. Delete expo.owner and expo.extra.eas, then run `npx eas-cli@latest login` and `npx eas-cli@latest init` on the Expo account that should own the app. Commit the owner and extra.eas.projectId that eas init writes. See docs/RELEASE.md.',
    );
  }

  const projectId = expo.extra && expo.extra.eas ? expo.extra.eas.projectId : undefined;
  if (typeof projectId !== 'string' || !UUID_PATTERN.test(projectId)) {
    errors.push(
      'expo.extra.eas.projectId is missing, not a UUID, or still a placeholder. eas init treats any existing projectId as already linked and will not replace it, so delete expo.owner and expo.extra.eas before running eas init. See docs/RELEASE.md.',
    );
  }

  const eas = easJson && typeof easJson === 'object' ? easJson : undefined;
  if (!eas) {
    errors.push('eas.json must be a JSON object.');
    return errors;
  }

  if (!eas.cli || eas.cli.appVersionSource !== 'remote') {
    errors.push('eas.json cli.appVersionSource must be "remote" so Android versionCode and iOS buildNumber live on EAS.');
  }

  const production = eas.build && eas.build.production;
  if (!production || production.autoIncrement !== true) {
    errors.push('eas.json build.production.autoIncrement must be true.');
  }
  if (!production || !production.android || production.android.buildType !== 'app-bundle') {
    errors.push('eas.json build.production.android.buildType must stay "app-bundle" so Play Console can accept the artifact.');
  }

  const development = eas.build && eas.build.development;
  if (
    !development ||
    development.distribution !== 'internal' ||
    !development.android ||
    development.android.buildType !== 'apk' ||
    !development.ios ||
    development.ios.simulator !== true
  ) {
    errors.push(
      'eas.json build.development must stay an internal APK plus iOS simulator build. react-native-fast-tflite needs that development profile.',
    );
  }

  const submit = eas.submit && eas.submit.production;
  if (!submit || !submit.android || !submit.ios) {
    errors.push('eas.json submit.production must include android and ios blocks.');
    return errors;
  }

  if (!PLAY_TRACKS.has(submit.android.track)) {
    errors.push('eas.json submit.production.android.track must be internal, alpha, beta, or production.');
  }
  if (
    submit.android.releaseStatus !== undefined &&
    !RELEASE_STATUSES.has(submit.android.releaseStatus)
  ) {
    errors.push(
      'eas.json submit.production.android.releaseStatus must be completed, draft, halted, or inProgress.',
    );
  }
  if (submit.android.applicationId !== expo.android?.package) {
    errors.push(
      'eas.json submit.production.android.applicationId must match expo.android.package (com.grzybobranie.ai).',
    );
  }

  const ascAppId = submit.ios.ascAppId;
  if (typeof ascAppId !== 'string' || isPlaceholder(ascAppId) || !ASC_APP_ID_PATTERN.test(ascAppId)) {
    errors.push(
      'eas.json submit.production.ios.ascAppId must be the numeric Apple ID from App Store Connect → your app → App Information → General Information. Replace REPLACE_WITH_APP_STORE_CONNECT_APPLE_ID. See docs/RELEASE.md.',
    );
  }

  const appleTeamId = submit.ios.appleTeamId;
  if (
    typeof appleTeamId !== 'string' ||
    isPlaceholder(appleTeamId) ||
    !APPLE_TEAM_ID_PATTERN.test(appleTeamId)
  ) {
    errors.push(
      'eas.json submit.production.ios.appleTeamId must be the 10-character Apple Team ID. Replace REPLACE_WITH_APPLE_TEAM_ID. See docs/RELEASE.md.',
    );
  }
  if (submit.ios.bundleIdentifier !== expo.ios?.bundleIdentifier) {
    errors.push(
      'eas.json submit.production.ios.bundleIdentifier must match expo.ios.bundleIdentifier (com.grzybobranie.ai).',
    );
  }

  return errors;
}

function parseArgs(argv) {
  const args = { app: path.join(root, 'app.json'), eas: path.join(root, 'eas.json') };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--app') {
      args.app = path.resolve(argv[index + 1] ?? '');
      index += 1;
    } else if (token === '--eas') {
      args.eas = path.resolve(argv[index + 1] ?? '');
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = collectReleaseBlockers(readJson(args.app), readJson(args.eas));
  if (errors.length === 0) {
    process.stdout.write('EAS release config is ready.\n');
    return;
  }
  process.stderr.write('EAS release config is not ready:\n');
  for (const error of errors) {
    process.stderr.write(`- ${error}\n`);
  }
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main();
}
