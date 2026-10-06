const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Android 11+ hides geo: from package visibility unless the manifest asks for it.
 * Opening the spot does not depend on canOpenURL; this query lets the system resolve geo: directly.
 */
function withAndroidGeoQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const queries = manifest.queries ?? [];
    const hasGeo = queries.some((query) =>
      (query.intent ?? []).some((intent) =>
        (intent.data ?? []).some((data) => data.$?.['android:scheme'] === 'geo'),
      ),
    );
    if (!hasGeo) {
      queries.push({
        intent: [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
            data: [{ $: { 'android:scheme': 'geo' } }],
          },
        ],
      });
    }
    manifest.queries = queries;
    return config;
  });
}

module.exports = withAndroidGeoQueries;
