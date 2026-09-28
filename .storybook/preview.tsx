import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { PaperProvider } from 'react-native-paper';
import { paperTheme } from '../src/theme/paperTheme';
import { LanguageProvider } from '../src/contexts/LanguageContext';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'forest-light',
      values: [
        { name: 'forest-light', value: '#F8FAFC' },
        { name: 'forest-dark', value: '#1B3B22' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <LanguageProvider>
        <PaperProvider theme={paperTheme}>
          <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
            <Story />
          </div>
        </PaperProvider>
      </LanguageProvider>
    ),
  ],
};

export default preview;
