const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' });

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
