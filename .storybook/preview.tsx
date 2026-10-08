import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { PaperProvider } from 'react-native-paper';
import { paperTheme } from '../src/theme/paperTheme';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { colors } from '../src/theme/tokens';

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
        { name: 'forest-light', value: colors.background },
        { name: 'forest-dark', value: colors.primary },
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
