const fs = require('node:fs');
const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const { shouldStripDevRoutes } = require('./scripts/dev-route-block.cjs');
const { speciesDbResolveTarget } = require('./scripts/species-db-resolve.cjs');

const speciesDbFile = path.join(__dirname, 'assets/db/species.db');

const config = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' });

for (const ext of ['db', 'wasm', 'tflite', 'jsonl']) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}

const enhanceMiddleware = config.server?.enhanceMiddleware;
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const enhancedMiddleware = enhanceMiddleware
    ? enhanceMiddleware(middleware, metroServer)
    : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return enhancedMiddleware(req, res, next);
  };
};

// Paczka produkcyjna nie zawiera src/app/dev, chyba że EXPO_PUBLIC_DEV_TOOLS=1
// (profile EAS development i preview). CI ustawia NODE_ENV=production przy
// `pnpm export:android`, zanim Metro wczyta ten plik. Gdy plik jednak wejdzie
// do bundla, trasa i tak robi Redirect: devToolsEnabled() jest wtedy fałszem.
// `src/infra/db/species-db-asset.ts` zostaje `null`, dopóki nie ma pliku.
// `pnpm build:species` (także `eas-build-post-install`) zapisuje asset i tu
// wchodzi on do paczki. Bez pliku aplikacja sieje donor-cards.json.
const previousResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = (name) =>
    typeof previousResolve === 'function'
      ? previousResolve(context, name, platform)
      : context.resolveRequest(context, name, platform);
  const resolved = resolve(moduleName);
  if (!resolved || resolved.type !== 'sourceFile') return resolved;
  const target = speciesDbResolveTarget(
    resolved.filePath,
    speciesDbFile,
    fs.existsSync(speciesDbFile),
  );
  if (target === resolved.filePath) return resolved;
  return resolve(target);
};

if (shouldStripDevRoutes(process.env)) {
  const devRoutes = /[/\\]src[/\\]app[/\\]dev[/\\]/;
  const blockList = config.resolver.blockList;
  if (Array.isArray(blockList)) {
    blockList.push(devRoutes);
  } else if (blockList instanceof RegExp) {
    config.resolver.blockList = [blockList, devRoutes];
  } else {
    config.resolver.blockList = [devRoutes];
  }
}

module.exports = config;
