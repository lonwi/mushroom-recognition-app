const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

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

// Dev routes are not part of a production bundle. CI sets NODE_ENV=production
// for `pnpm export:android` before Metro loads this file. Release bundles that
// do not set it still hit the !__DEV__ redirect in src/app/dev/styling.tsx.
if (process.env.NODE_ENV === 'production') {
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
