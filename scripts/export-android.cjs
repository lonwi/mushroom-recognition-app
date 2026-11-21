'use strict';

const { spawn } = require('node:child_process');

// pnpm run sets NODE_PATH to node_modules/.pnpm/node_modules, which hides a
// missing direct Babel plugin. Gradle starts node without that variable.
// `env -u` is not available in cmd.exe, so clear it here.
const env = { ...process.env };
delete env.NODE_PATH;

const child = spawn(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'export', '--platform', 'android', '--output-dir', 'dist'],
  { stdio: 'inherit', env, windowsHide: true },
);

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  process.exit(signal || code === null ? 1 : code);
});
