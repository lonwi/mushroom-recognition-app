import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenErrorBoundary } from '../../components/ScreenErrorBoundary';
import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext';
import { en } from '../../i18n/en';
import { pl } from '../../i18n/pl';
import { colors, radius } from '../../theme/tokens';

function Boom(): React.ReactElement {
  throw new Error('notatka: Las Kabacki 52.1543, 21.0789');
}

function OkChild() {
  return <Text testID="boundary-child">karta</Text>;
}

function LanguageSwitch() {
  const { setLanguage } = useLanguage();
  return (
    <>
      <TouchableOpacity testID="switch-pl" onPress={() => setLanguage('pl')} />
      <TouchableOpacity testID="switch-en" onPress={() => setLanguage('en')} />
    </>
  );
}

function TabLabel() {
  const { t } = useLanguage();
  return <Text testID="nav-safety-label">{t('nav.safety')}</Text>;
}

function Harness({
  resetKey,
  colorScheme,
  children,
}: {
  resetKey: string;
  colorScheme?: 'light' | 'dark';
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <LanguageSwitch />
      <TabLabel />
      <ScreenErrorBoundary resetKey={resetKey} colorScheme={colorScheme}>
        {children}
      </ScreenErrorBoundary>
    </LanguageProvider>
  );
}

describe('ScreenErrorBoundary', () => {
  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the fallback, restores children when resetKey changes, and retries in English', async () => {
    const screen = await render(
      <Harness resetKey="JOURNAL:tab">
        <Boom />
      </Harness>,
    );

    expect(screen.getByTestId('screen-error-fallback')).toBeTruthy();
    expect(screen.getByText(pl.screenError.title)).toBeTruthy();
    const polishTab = String(screen.getByTestId('nav-safety-label').props.children);
    expect(polishTab).toBe(pl.nav.safety);
    const polishBody = String(screen.getByTestId('screen-error-body').props.children);
    expect(polishBody).toContain(polishTab);
    expect(polishBody).toBe(pl.screenError.body.split('{tab}').join(polishTab));
    expect(pl.screenError.body).not.toContain(pl.nav.safety);
    expect(pl.screenError.body).toContain('{tab}');

    await screen.rerender(
      <Harness resetKey="SAFETY:tab">
        <OkChild />
      </Harness>,
    );

    expect(screen.queryByTestId('screen-error-fallback')).toBeNull();
    expect(screen.getByTestId('boundary-child')).toBeTruthy();

    await screen.rerender(
      <Harness resetKey="JOURNAL:tab">
        <Boom />
      </Harness>,
    );
    expect(screen.getByTestId('screen-error-fallback')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('switch-en'));

    expect(screen.getByRole('button', { name: en.screenError.retry })).toBeTruthy();
    const englishTab = String(screen.getByTestId('nav-safety-label').props.children);
    expect(englishTab).toBe(en.nav.safety);
    const englishBody = String(screen.getByTestId('screen-error-body').props.children);
    expect(englishBody).toContain(englishTab);
    expect(englishBody).toBe(en.screenError.body.split('{tab}').join(englishTab));
    expect(en.screenError.body).not.toContain(en.nav.safety);
    expect(en.screenError.body).toContain('{tab}');
  });

  it('uses a 3–6 px radius, theme tokens, and a dark surface without a side border', async () => {
    const screen = await render(
      <Harness resetKey="ATLAS:tab" colorScheme="dark">
        <Boom />
      </Harness>,
    );
    const fallback = StyleSheet.flatten(screen.getByTestId('screen-error-fallback').props.style);
    const button = StyleSheet.flatten(screen.getByTestId('screen-error-retry').props.style);
    expect(fallback.backgroundColor).toBe(colors.slate900);
    expect(fallback.borderLeftWidth).toBeUndefined();
    expect(fallback.borderLeftColor).toBeUndefined();
    expect(button.backgroundColor).toBe(colors.primary);
    expect(button.borderRadius).toBe(radius.xs);
    expect(button.borderRadius).toBeGreaterThanOrEqual(3);
    expect(button.borderRadius).toBeLessThanOrEqual(6);
    expect(button.borderLeftWidth).toBeUndefined();
    expect(button.borderLeftColor).toBeUndefined();

    await screen.rerender(
      <Harness resetKey="ATLAS:tab" colorScheme="light">
        <Boom />
      </Harness>,
    );
    const light = StyleSheet.flatten(screen.getByTestId('screen-error-fallback').props.style);
    expect(light.backgroundColor).toBe(colors.background);
  });
});
