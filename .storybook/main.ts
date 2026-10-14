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
    config.plugins = config.plugins || [];
    config.plugins.push({
      name: 'rewrite-gallery-require',
      enforce: 'pre',
      transform(code: string, id: string) {
        const normalized = id.split('\\').join('/');
        if (!normalized.includes('/src/data/speciesGallery.ts')) {
          return null;
        }
        let index = 0;
        const imports: string[] = [];
        const next = code.replace(
          /require\((['"])(\.\.\/\.\.\/assets\/gallery\/[^'"]+\.webp)\1\)/g,
          (_match, _quote: string, spec: string) => {
            const name = `galleryAsset${index}`;
            index += 1;
            imports.push(`import ${name} from '${spec}';`);
            return name;
          },
        );
        if (index === 0) {
          return null;
        }
        return { code: `${imports.join('\n')}\n${next}`, map: null };
      },
    });
    const mockIconPath = path.resolve(__dirname, 'mockVectorIcons.js');
    const mockCodegenPath = path.resolve(__dirname, 'mockCodegen.js');
    const mockSafeAreaPath = path.resolve(__dirname, 'mockSafeArea.js');
    const mockLocationPath = path.resolve(__dirname, 'mockLocation.js');
    const mockFileSystemPath = path.resolve(__dirname, 'mockFileSystem.js');

    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      'expo-location': mockLocationPath,
      'expo-file-system/legacy': mockFileSystemPath,
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
