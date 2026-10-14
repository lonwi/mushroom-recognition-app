import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import App from '../../App';
import { pl } from '../i18n/pl';

describe('app header controls', () => {
  it('names the logo and settings buttons and hides the emoji from assistive tech', async () => {
    const screen = await render(<App />);
    const logo = screen.getByRole('button', { name: pl.app.title });
    const settings = screen.getByRole('button', { name: pl.nav.settings });

    expect(logo.props.accessibilityRole).toBe('button');
    expect(logo.props.accessibilityLabel).toBe(pl.app.title);
    expect(settings.props.accessibilityRole).toBe('button');
    expect(settings.props.accessibilityLabel).toBe(pl.nav.settings);
    expect(screen.getByText('🍄').props.importantForAccessibility).toBe('no');
    expect(screen.getByText('⚙️').props.importantForAccessibility).toBe('no');

    await fireEvent.press(settings);
    expect(screen.getByText(pl.settings.language)).toBeTruthy();

    await fireEvent.press(logo);
    expect(screen.getByTestId('scanner-shutter')).toBeTruthy();
    expect(screen.queryByText(pl.settings.language)).toBeNull();
  });
});
