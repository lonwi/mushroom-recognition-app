jest.mock('expo-sqlite/kv-store', () => {
  const memory = new Map();
  return {
    __esModule: true,
    default: {
      getItemSync: (key) => (memory.has(key) ? memory.get(key) : null),
      setItemSync: (key, value) => {
        memory.set(key, String(value));
      },
    },
  };
});

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    execSync: () => {},
    runSync: () => ({ changes: 0, lastInsertRowId: 0 }),
    getAllSync: () => [],
  }),
}));

jest.mock('expo-file-system', () => {
  const files = new Map();
  class File {
    constructor(...parts) {
      this.uri = parts
        .map((part) =>
          part && typeof part === 'object' && 'uri' in part ? part.uri : String(part),
        )
        .join('/');
    }
    get exists() {
      return files.has(this.uri);
    }
    create() {
      if (!files.has(this.uri)) files.set(this.uri, '');
    }
    textSync() {
      return files.get(this.uri) ?? '';
    }
    writeSync(text) {
      files.set(this.uri, String(text));
    }
  }
  class Directory {
    constructor(...parts) {
      this.uri = parts.map(String).join('/');
    }
    exists = false;
    create() {
      this.exists = true;
    }
  }
  return {
    File,
    Directory,
    Paths: { document: { uri: 'document' }, cache: { uri: 'cache' } },
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: async () => undefined,
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: async () => undefined,
  hideAsync: async () => undefined,
}));

jest.mock('nativewind', () => ({
  vars: (input) => input,
}));

jest.mock('expo-router', () => {
  const React = require('react');
  function Screen() {
    return null;
  }
  function Stack({ children }) {
    return React.createElement(React.Fragment, null, children);
  }
  Stack.Screen = Screen;
  function Tabs({ children }) {
    return React.createElement(React.Fragment, null, children);
  }
  Tabs.Screen = Screen;
  function Redirect({ href }) {
    const { Text } = require('react-native');
    return React.createElement(Text, null, `redirect:${href}`);
  }
  return {
    Stack,
    Tabs,
    Link: ({ children }) => children,
    Redirect,
    router: { push: jest.fn(), back: jest.fn() },
  };
});

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const CameraView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: jest.fn(async () => ({ uri: 'file://mock-photo.jpg' })),
    }));
    return React.createElement(View, { testID: 'camera-view', ...props }, props.children);
  });
  CameraView.displayName = 'CameraView';
  return {
    CameraView,
    useCameraPermissions: jest.fn(() => [
      { granted: true, canAskAgain: true, status: 'granted' },
      jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
    ]),
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file://gallery-mock-photo.jpg' }],
  })),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const createMockComponent = (name) => {
    const Component = (props) =>
      React.createElement(View, { testID: `svg-${name.toLowerCase()}`, ...props }, props.children);
    Component.displayName = name;
    return Component;
  };
  return {
    __esModule: true,
    default: createMockComponent('Svg'),
    Svg: createMockComponent('Svg'),
    Circle: createMockComponent('Circle'),
    Ellipse: createMockComponent('Ellipse'),
    G: createMockComponent('G'),
    Path: createMockComponent('Path'),
    Rect: createMockComponent('Rect'),
    Line: createMockComponent('Line'),
  };
});
