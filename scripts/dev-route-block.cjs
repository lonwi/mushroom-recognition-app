'use strict';

/**
 * Czy Metro ma wyciąć `src/app/dev`.
 * Ta sama flaga co `devToolsEnabled` w `src/core/config/dev-tools.ts`:
 * `EXPO_PUBLIC_DEV_TOOLS=1` zostawia spike'i w paczce release.
 * @param {NodeJS.ProcessEnv} env
 */
function shouldStripDevRoutes(env) {
  return env.NODE_ENV === 'production' && env.EXPO_PUBLIC_DEV_TOOLS !== '1';
}

module.exports = { shouldStripDevRoutes };
