/* eslint-env jest */
// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4, Low: 1 },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 52.2297, longitude: 21.0122 },
  }),
}));

// The preset mock omits documentDirectory, so journal photos would look unsaved.
jest.mock('expo-asset', () => {
  class Asset {
    localUri = 'file:///mock/attributions.jsonl';
    uri = 'file:///mock/attributions.jsonl';
    downloaded = true;
    downloadAsync() {
      return Promise.resolve();
    }
    static fromModule() {
      return new Asset();
    }
    static fromURI() {
      return new Asset();
    }
  }
  return { Asset };
});

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/document/',
  cacheDirectory: 'file:///mock/cache/',
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  copyAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
}));
