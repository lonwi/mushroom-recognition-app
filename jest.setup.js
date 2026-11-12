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
