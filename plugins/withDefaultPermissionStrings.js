const fs = require('fs');
const path = require('path');
const { AndroidConfig, withStringsXml } = require('expo/config-plugins');

/**
 * Expo writes locales/*.json into values-b+<lang>/strings.xml only.
 * The Polish permission strings stay the default resource (values/strings.xml)
 * so an English translation does not fail Android's ExtraTranslation lint.
 */
function withDefaultPermissionStrings(config) {
  return withStringsXml(config, (config) => {
    const localePath = path.join(config.modRequest.projectRoot, 'locales', 'pl.json');
    const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    const android = locale.android ?? {};
    const items = Object.entries(android).map(([name, value]) => ({
      $: { name },
      _: value,
    }));
    config.modResults = AndroidConfig.Strings.setStringItem(items, config.modResults);
    return config;
  });
}

module.exports = withDefaultPermissionStrings;
