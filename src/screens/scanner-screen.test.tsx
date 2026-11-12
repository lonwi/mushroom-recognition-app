import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as expoCamera from 'expo-camera';
import { useCameraPermissions } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';

import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';
import { setSpeciesDb } from '@/infra/db/species-db';
import { settingsStore } from '@/infra/settings/use-settings-store';
import { ScannerScreen } from '@/screens/scanner';

describe('ScannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSpeciesDb(null);
    settingsStore.setState({ theme: 'light', englishEnabled: false });
  });

  it('renders camera viewfinder, reticle guide, and only Doświetl button in top HUD', async () => {
    await render(<ScannerScreen />);

    expect(screen.getByTestId('scanner-screen')).toBeTruthy();
    expect(screen.getByTestId('camera-view')).toBeTruthy();
    expect(screen.getByTestId('reticle-guide-step-1')).toBeTruthy();

    // Sprawdź, czy górny HUD ma TYLKO przycisk Doświetl (brak sztucznej odznaki Ostrość OK)
    expect(screen.getByTestId('torch-toggle-button')).toBeTruthy();
    expect(screen.queryByText(/Ostrość/i)).toBeNull();
    expect(screen.getByText('Doświetl')).toBeTruthy();
  });

  it('toggles flashlight torch state on press', async () => {
    await render(<ScannerScreen />);

    const torchBtn = screen.getByTestId('torch-toggle-button');
    expect(screen.getByText('Doświetl')).toBeTruthy();

    await fireEvent.press(torchBtn);
    expect(screen.getByText('Wyłącz')).toBeTruthy();

    await fireEvent.press(torchBtn);
    expect(screen.getByText('Doświetl')).toBeTruthy();
  });

  it('renders 3-slot tray with initial empty slots and active step 1', async () => {
    await render(<ScannerScreen />);

    expect(screen.getByTestId('multi-shot-tray')).toBeTruthy();
    expect(screen.getByTestId('slot-0')).toBeTruthy();
    expect(screen.getByTestId('slot-1')).toBeTruthy();
    expect(screen.getByTestId('slot-2')).toBeTruthy();
    expect(screen.getByText('KROK 1/3')).toBeTruthy();
  });

  it('captures photo with shutter button and advances to next slot', async () => {
    await render(<ScannerScreen />);

    const shutter = screen.getByTestId('shutter-button');
    await fireEvent.press(shutter);

    // Po zrobieniu zdjęcia pierwszego kroku, licznik pokazuje 1/3 i krok 2
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByText('KROK 2/3')).toBeTruthy();
    expect(screen.getByTestId('reticle-guide-step-2')).toBeTruthy();
  });

  it('prevents double-tap race conditions during photo capture', async () => {
    let resolveCapture: (value: { uri: string }) => void = () => {};
    const slowCapturePromise = new Promise<{ uri: string }>((resolve) => {
      resolveCapture = resolve;
    });

    const cameraMock = (expoCamera as unknown as { __mockTakePictureAsync: jest.Mock })
      .__mockTakePictureAsync;
    cameraMock.mockImplementation(() => slowCapturePromise);

    await render(<ScannerScreen />);
    const shutter = screen.getByTestId('shutter-button');

    // First press initiates capture
    await act(async () => {
      fireEvent.press(shutter);
    });
    // Second rapid press while still capturing
    await act(async () => {
      fireEvent.press(shutter);
    });

    // Camera hardware should only receive ONE capture command
    expect(cameraMock).toHaveBeenCalledTimes(1);

    // Resolve capture
    await act(async () => {
      resolveCapture({ uri: 'file://slow-photo.jpg' });
      await slowCapturePromise;
    });

    // Restore standard mock
    cameraMock.mockImplementation(async () => ({
      uri: 'file://mock-photo.jpg',
    }));
  });

  it('picks image from gallery into active slot and advances', async () => {
    await render(<ScannerScreen />);

    const galleryBtn = screen.getByTestId('gallery-button');
    await fireEvent.press(galleryBtn);

    expect(launchImageLibraryAsync).toHaveBeenCalled();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByText('KROK 2/3')).toBeTruthy();
  });

  it('allows clearing an individual slot and resetting all slots', async () => {
    await render(<ScannerScreen />);

    // Zrób zdjęcie do slotu 0
    await fireEvent.press(screen.getByTestId('shutter-button'));
    expect(screen.getByText('1/3')).toBeTruthy();
    const clearBtn0 = screen.getByTestId('clear-slot-0');
    expect(clearBtn0).toBeTruthy();
    expect(clearBtn0.props.hitSlop).toBe(14);

    // Wyczyść slot 0
    await fireEvent.press(clearBtn0);
    expect(screen.queryByTestId('clear-slot-0')).toBeNull();
    expect(screen.getByText('0/3')).toBeTruthy();
    expect(screen.getByText('KROK 1/3')).toBeTruthy();

    // Zrób zdjęcie i użyj przycisku Wyczyść wszystko
    await fireEvent.press(screen.getByTestId('shutter-button'));
    expect(screen.getByTestId('reset-slots-button')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('reset-slots-button'));
    expect(screen.getByText('0/3')).toBeTruthy();
  });

  it('analyze button is disabled when no photos and enabled with photo', async () => {
    await render(<ScannerScreen />);

    const analyzeBtn = screen.getByTestId('analyze-button');
    expect(analyzeBtn.props.accessibilityState?.disabled).toBe(true);

    // Zrób zdjęcie
    await fireEvent.press(screen.getByTestId('shutter-button'));
    expect(analyzeBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('opens triage modal with candidate hypothesis and deadly lookalike crimson banner pointing to real pairId', async () => {
    await render(<ScannerScreen />);

    // Zrób zdjęcie i naciśnij Analizuj
    await fireEvent.press(screen.getByTestId('shutter-button'));
    await fireEvent.press(screen.getByTestId('analyze-button'));

    expect(screen.getByTestId('triage-modal')).toBeTruthy();
    expect(screen.getByText('Triage Diagnostyczny')).toBeTruthy();
    expect(screen.getByTestId('candidate-card')).toBeTruthy();
    expect(screen.getByText('Czubajka kania')).toBeTruthy();
    expect(screen.getByText('Macrolepiota procera')).toBeTruthy();
    expect(screen.getByText(/96%/)).toBeTruthy();

    // Karmazynowy baner ostrzeżenia śmiertelnego
    expect(screen.getByTestId('deadly-risk-banner')).toBeTruthy();
    expect(screen.getByText('Śmiertelne niebezpieczeństwo!')).toBeTruthy();
    expect(screen.getAllByText(/Muchomor sromotnikowy/).length).toBeGreaterThan(0);

    // Przycisk porównania 1:1 kieruje do /look-alikes/{pairId} z przyrostkiem __0 odpowiadającym bazie
    const compareBtn = screen.getByTestId('compare-lookalike-button');
    await fireEvent.press(compareBtn);
    expect(router.push).toHaveBeenCalledWith(
      '/look-alikes/macrolepiota_procera__amanita_phalloides__0',
    );
  });

  it('extracts deadly lookalike from real database query when present', async () => {
    const mockDb: SpeciesSql = {
      exec: () => {},
      run: () => {},
      all: <T extends Record<string, SqlValue>>(sql: string): T[] => {
        if (sql.includes('FROM species WHERE id = ?')) {
          return [
            {
              id: 'macrolepiota_procera',
              latin_name: 'Macrolepiota procera',
              edibility: 'EDIBLE',
              status_disputed: 0,
              hymenophore: 'GILLS',
            },
          ] as unknown as T[];
        }
        if (sql.includes('FROM species_texts WHERE species_id = ?')) {
          return [
            {
              species_id: 'macrolepiota_procera',
              locale: 'pl',
              name: 'Czubajka kania (z bazy)',
              cap: 'Duży',
              hymenophore: 'Blaszki',
              stem: 'Zygzak',
              flesh: 'Biały',
              habitat: 'Las',
              taste: 'Smaczny',
            },
          ] as unknown as T[];
        }
        if (sql.includes('FROM look_alike_pairs p')) {
          return [
            {
              pair_id: 'macrolepiota_procera__amanita_phalloides__custom',
              lookalike_id: 'amanita_phalloides',
              lookalike_name: 'Muchomor sromotnikowy (DB)',
              lookalike_latin: 'Amanita phalloides',
              lookalike_edibility: 'DEADLY_POISONOUS',
              fatal: 1,
              review_status: 'approved',
              traits: 'Pochwa i ruchomy pierścień',
            },
          ] as unknown as T[];
        }
        return [] as T[];
      },
    };

    setSpeciesDb(mockDb);

    await render(<ScannerScreen />);
    await fireEvent.press(screen.getByTestId('shutter-button'));
    await fireEvent.press(screen.getByTestId('analyze-button'));

    expect(screen.getByText('Czubajka kania (z bazy)')).toBeTruthy();
    expect(screen.getAllByText(/Muchomor sromotnikowy \(DB\)/).length).toBeGreaterThan(0);

    const compareBtn = screen.getByTestId('compare-lookalike-button');
    await fireEvent.press(compareBtn);
    expect(router.push).toHaveBeenCalledWith(
      '/look-alikes/macrolepiota_procera__amanita_phalloides__custom',
    );
  });

  it('navigates to species card from triage modal', async () => {
    await render(<ScannerScreen />);

    await fireEvent.press(screen.getByTestId('shutter-button'));
    await fireEvent.press(screen.getByTestId('analyze-button'));

    const viewCardBtn = screen.getByTestId('view-species-card-button');
    await fireEvent.press(viewCardBtn);
    expect(router.push).toHaveBeenCalledWith('/species/macrolepiota_procera');
  });

  it('resets scanner when scan again button is pressed in triage modal', async () => {
    await render(<ScannerScreen />);

    await fireEvent.press(screen.getByTestId('shutter-button'));
    await fireEvent.press(screen.getByTestId('analyze-button'));

    const scanAgainBtn = screen.getByTestId('scan-again-button');
    await fireEvent.press(scanAgainBtn);
    expect(screen.getByText('0/3')).toBeTruthy();
  });

  it('shows permission request view with gallery fallback when permission is not granted', async () => {
    const requestPermissionMock = jest.fn();
    (useCameraPermissions as jest.Mock).mockReturnValueOnce([
      { granted: false, canAskAgain: true, status: 'denied' },
      requestPermissionMock,
    ]);

    await render(<ScannerScreen />);

    expect(screen.getByText('Wymagany dostęp do aparatu')).toBeTruthy();
    const grantBtn = screen.getByText('Zezwól na aparat');
    await fireEvent.press(grantBtn);
    expect(requestPermissionMock).toHaveBeenCalled();

    const galleryFallbackBtn = screen.getByText('Wybierz zdjęcie z galerii');
    await fireEvent.press(galleryFallbackBtn);
    expect(launchImageLibraryAsync).toHaveBeenCalled();
  });

  it('renders all messages in English when englishEnabled is set', async () => {
    settingsStore.setState({ englishEnabled: true });

    await render(<ScannerScreen />);

    expect(screen.getByText('Flashlight')).toBeTruthy();
    expect(screen.getByText('Gallery')).toBeTruthy();
    expect(screen.getByText('STEP 1/3')).toBeTruthy();
    expect(screen.getByText('Diagnostic angles (3 shots)')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('shutter-button'));
    await fireEvent.press(screen.getByTestId('analyze-button'));

    expect(screen.getByText('Diagnostic Triage')).toBeTruthy();
    expect(screen.getByText('Parasol mushroom')).toBeTruthy();
    expect(screen.getByText('Deadly danger!')).toBeTruthy();
    expect(screen.getByText('Compare look-alikes 1:1')).toBeTruthy();
    expect(screen.getByText('View full card in Atlas')).toBeTruthy();
  });
});
