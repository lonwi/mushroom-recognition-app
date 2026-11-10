import appConfig from '../../app.json';

test('android does not back up settings or the diagnostic log', () => {
  expect(appConfig.expo.android.allowBackup).toBe(false);
});
