import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../../../App';
import { translate } from '../../contexts/LanguageContext';
import { pl } from '../../i18n/pl';

let mockJournalThrows = false;
let mockSafetyThrows = false;

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

jest.mock('../../screens/SafetyGuideScreen', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('../../screens/SafetyGuideScreen')>(
    '../../screens/SafetyGuideScreen',
  );
  return {
    ...actual,
    SafetyGuideScreen: (props: React.ComponentProps<typeof actual.SafetyGuideScreen>) => {
      if (mockSafetyThrows) {
        throw new Error('notatka: Las Kabacki 52.1543, 21.0789');
      }
      return ReactActual.createElement(actual.SafetyGuideScreen, props);
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
    mockSafetyThrows = false;
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockJournalThrows = false;
    mockSafetyThrows = false;
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
    expect(screen.getByTestId('call-112').props.accessibilityLabel).toBe(pl.safetyGuide.call112Title);
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

  it('dials 112 from the fallback when the safety screen itself throws', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const healthy = await render(<App />);
    await fireEvent.press(healthy.getByTestId('nav-SAFETY'));
    await fireEvent.press(healthy.getByTestId('call-112'));
    await waitFor(() => {
      expect(openURL).toHaveBeenCalledTimes(1);
    });
    const safetyCall = openURL.mock.calls[0];

    openURL.mockClear();
    mockSafetyThrows = true;
    await fireEvent.press(healthy.getByTestId('nav-JOURNAL'));
    await fireEvent.press(healthy.getByTestId('nav-SAFETY'));

    expect(healthy.getByTestId('screen-error-fallback')).toBeTruthy();
    const call = healthy.getByTestId('call-112');
    expect(call.props.accessibilityLabel).toBe(pl.safetyGuide.call112Title);
    expect(healthy.getByTestId('nav-SAFETY')).toBeTruthy();
    await fireEvent.press(call);
    await waitFor(() => {
      expect(openURL).toHaveBeenCalledTimes(1);
    });
    expect(openURL.mock.calls[0]).toEqual(safetyCall);
    expect(boundaryLogs(consoleError)).toHaveLength(1);
    expect(boundaryLogs(consoleError)[0]?.[1]).toEqual({
      screen: 'SAFETY:tab',
      errorName: 'Error',
    });
    expect(JSON.stringify(boundaryLogs(consoleError))).not.toContain(PRIVATE_NOTE[0]);
    expect(JSON.stringify(boundaryLogs(consoleError))).not.toContain(PRIVATE_NOTE[1]);
    expect(JSON.stringify(boundaryLogs(consoleError))).not.toContain(PRIVATE_NOTE[2]);
  });
});
