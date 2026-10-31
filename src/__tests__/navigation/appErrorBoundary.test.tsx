import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../../../App';
import { translate } from '../../contexts/LanguageContext';
import { pl } from '../../i18n/pl';

let mockJournalThrows = false;

jest.mock('../../screens/JournalScreen', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('../../screens/JournalScreen')>(
    '../../screens/JournalScreen',
  );
  return {
    ...actual,
    JournalScreen: (props: React.ComponentProps<typeof actual.JournalScreen>) => {
      if (mockJournalThrows) {
        throw new Error('notatka: Las Kabacki 52.1543, 21.0789');
      }
      return ReactActual.createElement(actual.JournalScreen, props);
    },
  };
});

const PRIVATE_NOTE = ['Las Kabacki', '52.1543', 'notatka'] as const;

function boundaryLogs(spy: jest.SpyInstance): unknown[][] {
  return spy.mock.calls.filter((args: unknown[]) =>
    args.some((arg) => typeof arg === 'string' && arg.includes('[ScreenErrorBoundary]')),
  );
}

describe('screen error boundary keeps the tab bar', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(async () => {
    mockJournalThrows = false;
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.clear();
  });

  afterEach(() => {
    consoleError.mockRestore();
    mockJournalThrows = false;
  });

  it('shows the fallback, keeps Pomoc reachable, and logs no note or coordinates', async () => {
    mockJournalThrows = true;
    const screen = await render(<App />);

    await fireEvent.press(screen.getByTestId('nav-JOURNAL'));

    expect(screen.getByTestId('screen-error-fallback')).toBeTruthy();
    expect(screen.getByText(pl.screenError.title)).toBeTruthy();
    const fallbackBody = String(screen.getByTestId('screen-error-body').props.children);
    expect(fallbackBody).toBe(translate('pl', 'screenError.body', { tab: pl.nav.safety }));
    expect(fallbackBody).toContain(pl.nav.safety);
    expect(screen.getByRole('button', { name: pl.screenError.retry })).toBeTruthy();
    expect(screen.getByTestId('nav-SAFETY')).toBeTruthy();
    expect(boundaryLogs(consoleError)).toHaveLength(1);
    expect(JSON.stringify(boundaryLogs(consoleError))).not.toContain(PRIVATE_NOTE[0]);
    expect(JSON.stringify(boundaryLogs(consoleError))).not.toContain(PRIVATE_NOTE[1]);
    expect(JSON.stringify(boundaryLogs(consoleError))).not.toContain(PRIVATE_NOTE[2]);
    expect(boundaryLogs(consoleError)[0]?.[1]).toEqual({
      screen: 'JOURNAL:tab',
      errorName: 'Error',
    });

    await fireEvent.press(screen.getByTestId('nav-SAFETY'));

    expect(screen.queryByTestId('screen-error-fallback')).toBeNull();
    expect(screen.getByText(pl.safetyGuide.title)).toBeTruthy();
    expect(screen.getByTestId('call-112')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('nav-JOURNAL'));

    expect(screen.getByTestId('screen-error-fallback')).toBeTruthy();
    expect(boundaryLogs(consoleError)).toHaveLength(2);
    expect(JSON.stringify(boundaryLogs(consoleError))).not.toContain(PRIVATE_NOTE[0]);
    expect(JSON.stringify(boundaryLogs(consoleError))).not.toContain(PRIVATE_NOTE[1]);
    expect(JSON.stringify(boundaryLogs(consoleError))).not.toContain(PRIVATE_NOTE[2]);

    mockJournalThrows = false;
    await fireEvent.press(screen.getByRole('button', { name: pl.screenError.retry }));

    expect(screen.queryByTestId('screen-error-fallback')).toBeNull();
    expect(screen.getByText(pl.journal.title)).toBeTruthy();
    expect(boundaryLogs(consoleError)).toHaveLength(2);
  });
});
