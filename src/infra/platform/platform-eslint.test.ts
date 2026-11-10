import { spawnSync } from 'node:child_process';
import path from 'node:path';

function errorCount(code: string, filename: string): number {
  const eslint = path.resolve('node_modules/.bin/eslint');
  const result = spawnSync(
    eslint,
    ['--stdin', '--stdin-filename', filename, '--format', 'json', '--max-warnings', '0'],
    { input: code, encoding: 'utf8' },
  );
  const parsed: unknown = JSON.parse(result.stdout || '[]');
  if (!Array.isArray(parsed) || parsed.length === 0) return result.status === 0 ? 0 : 1;
  const first = parsed[0] as { errorCount?: number };
  return first.errorCount ?? 1;
}

test('android-only APIs and Platform.OS are rejected outside the platform seam', () => {
  const outside = errorCount(
    `import { Platform, ToastAndroid } from 'react-native';
export const flag = Platform.OS === 'android' ? ToastAndroid.SHORT : 0;
`,
    'src/screens/probe.tsx',
  );
  expect(outside).toBeGreaterThan(0);

  const inside = errorCount(
    `import { Platform } from 'react-native';
export function name(): string {
  if (Platform.OS === 'android') return 'android';
  return Platform.OS;
}
`,
    'src/infra/platform/probe.tsx',
  );
  expect(inside).toBe(0);
});
