'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

// pnpm run sets NODE_PATH=node_modules/.pnpm/node_modules, so a missing direct
// dependency still resolves. EAS Gradle starts node without that variable.
// `env -u` is not available in cmd.exe, so clear it here.
const env = { ...process.env };
delete env.NODE_PATH;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,
      windowsHide: true,
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0 && !signal) {
        resolve();
        return;
      }
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      reject(new Error(`${command} exited with ${reason}`));
    });
  });
}

async function main() {
  await run(process.execPath, [
    require.resolve('expo/bin/cli'),
    'prebuild',
    '--platform',
    'android',
    '--no-install',
    '--clean',
  ]);

  const androidDir = path.join(process.cwd(), 'android');
  const isWin = process.platform === 'win32';
  await run(
    isWin ? 'gradlew.bat' : './gradlew',
    [':photo-decoder:compileReleaseKotlin', '--build-cache'],
    {
      cwd: androidDir,
      shell: isWin,
    },
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
