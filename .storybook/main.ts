import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    const mockIconPath = path.resolve(__dirname, 'mockVectorIcons.js');
    const mockCodegenPath = path.resolve(__dirname, 'mockCodegen.js');
    const mockSafeAreaPath = path.resolve(__dirname, 'mockSafeArea.js');
    const mockLocationPath = path.resolve(__dirname, 'mockLocation.js');

    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      'expo-location': mockLocationPath,
      'react-native-safe-area-context': mockSafeAreaPath,
      '@expo/vector-icons/MaterialCommunityIcons': mockIconPath,
      '@expo/vector-icons/Ionicons': mockIconPath,
      '@expo/vector-icons/Feather': mockIconPath,
      '@expo/vector-icons': mockIconPath,
      'react-native/Libraries/Utilities/codegenNativeComponent': mockCodegenPath,
      'react-native': 'react-native-web',
    };
    return config;
  },
};

export default config;
