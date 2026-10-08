import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const polish = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'pl.json'), 'utf8'));
const english = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'en.json'), 'utf8'));

function pluginOptions(name: string): Record<string, unknown> {
  const entry = app.plugins.find(
    (plugin: unknown) => Array.isArray(plugin) && plugin[0] === name,
  );
  if (!entry) {
    throw new Error(`Missing ${name} plugin`);
  }
  return entry[1] as Record<string, unknown>;
}

describe('permission locales', () => {
  it('keeps Polish permission text as the default and ships an English locale beside it', () => {
    expect(app.ios.infoPlist.CFBundleDevelopmentRegion).toBe('pl');
    expect(app.ios.infoPlist.CFBundleAllowMixedLocalizations).toBe(true);
    expect(app.web.lang).toBe('pl');
    expect(app.locales).toEqual({
      pl: './locales/pl.json',
      en: './locales/en.json',
    });
    expect(fs.existsSync(path.join(root, 'plugins', 'withDefaultPermissionStrings.js'))).toBe(false);
    expect(app.plugins).not.toContain('./plugins/withDefaultPermissionStrings.js');

    expect(app.ios.infoPlist.NSCameraUsageDescription).toBeUndefined();
    expect(app.ios.infoPlist.NSMicrophoneUsageDescription).toBeUndefined();
    expect(app.ios.infoPlist.NSMotionUsageDescription).toBeUndefined();
    expect(app.ios.infoPlist.NSPhotoLibraryUsageDescription).toBe(
      'Aplikacja potrzebuje dostępu do zdjęć, aby analizować wcześniej wykonane fotografie grzybów.',
    );
    expect(app.ios.infoPlist.NSLocationWhenInUseUsageDescription).toBe(
      'Grzybobranie AI może zapisać miejsce znalezienia w dzienniku na tym urządzeniu, żeby łatwiej było tu wrócić.',
    );

    const camera = pluginOptions('expo-camera');
    const imagePicker = pluginOptions('expo-image-picker');
    const location = pluginOptions('expo-location');
    expect(camera.cameraPermission).toBe(
      'Zezwól aplikacji Grzybobranie AI na używanie aparatu do rozpoznawania grzybów.',
    );
    expect(camera.microphonePermission).toBe(false);
    expect(camera.recordAudioAndroid).toBe(false);
    expect(imagePicker.microphonePermission).toBe(false);
    expect(location.locationWhenInUsePermission).toBe(
      app.ios.infoPlist.NSLocationWhenInUseUsageDescription,
    );
    expect(location.motionUsagePermission).toBe(false);
    expect(location.locationAlwaysAndWhenInUsePermission).toBe(false);
    expect(location.locationAlwaysPermission).toBe(false);

    expect(polish.android).toBeUndefined();
    expect(english.android).toBeUndefined();

    expect(polish.ios.NSCameraUsageDescription).toBe(camera.cameraPermission);
    expect(polish.ios.NSPhotoLibraryUsageDescription).toBe(
      app.ios.infoPlist.NSPhotoLibraryUsageDescription,
    );
    expect(polish.ios.NSLocationWhenInUseUsageDescription).toBe(
      app.ios.infoPlist.NSLocationWhenInUseUsageDescription,
    );

    expect(Object.keys(english.ios).sort()).toEqual(Object.keys(polish.ios).sort());
    expect(english.ios.NSCameraUsageDescription).toBe(
      'Allow the Grzybobranie AI app to use the camera to recognize mushrooms.',
    );
    expect(english.ios.NSPhotoLibraryUsageDescription).toBe(
      'The app needs access to your photos to analyze mushroom photographs taken earlier.',
    );
    expect(english.ios.NSLocationWhenInUseUsageDescription).toBe(
      'Grzybobranie AI can save where you found it in the journal on this device, so it is easier to come back.',
    );

    for (const key of Object.keys(polish.ios) as Array<keyof typeof polish.ios>) {
      expect(english.ios[key]).not.toBe(polish.ios[key]);
    }
  });
});
