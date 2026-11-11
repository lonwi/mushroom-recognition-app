import { pl } from '@/core/i18n/pl';

/** Ta sama struktura co `pl`. Wydanie używa polskiego, dopóki flaga angielskiego jest wyłączona (D-05). */
export const en: typeof pl = {
  tabs: {
    atlas: 'Atlas',
    scanner: 'Scanner',
    help: 'Help',
  },
  settings: {
    open: 'Settings',
    title: 'Settings',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeHighContrast: 'High contrast',
    english: 'English',
    englishOff: 'Off until the content gates pass.',
    englishOn: 'On in this development build.',
    log: 'Diagnostic log',
    logHint: 'Stays on this phone. It has no coordinates.',
    share: 'Share log',
    shareFailed: 'The share sheet could not be opened.',
    spike: 'Styling spike',
  },
  atlas: {
    title: 'Atlas',
    body: 'Species cards arrive in the next phase. This build shows no photos.',
  },
  scanner: {
    title: 'Scanner',
    unavailable:
      'Recognition is unavailable. This build has no model package. The model does not judge edibility.',
  },
  help: {
    title: 'Help',
    body: 'The app suggests a mushroom name. It does not say whether you can eat it. There will be no preparation instructions.',
    numbers:
      'Emergency numbers live in one module and still need verification. This build does not show them.',
  },
  spike: {
    title: 'Styling spike',
    intro:
      'Switch the three themes and record the time. The 150 ms budget is a frame on the Xiaomi Mi 11, not this number by itself.',
    last: 'Last switch: {ms} ms',
    none: 'Not switched yet.',
    platform: 'Platform: {name}',
    manifestOk: 'The example manifest matches the schema.',
    manifestBad: 'The example manifest failed validation.',
    manifestNote: 'This is the example fixture, not a model on the phone.',
    reasons: 'Example flags: {reasons}',
    primitive: 'Button on an accessibility primitive',
  },
  safety: {
    notAVerdict: 'This is a recognition hint, not an edibility verdict.',
  },
  plurals: {
    photos: {
      one: '{n} photo',
      few: '{n} photos',
      many: '{n} photos',
      other: '{n} photos',
    },
  },
};
