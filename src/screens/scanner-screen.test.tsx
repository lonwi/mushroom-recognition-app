import { fireEvent, render, screen } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';

import { ScannerScreen } from '@/screens/scanner';

describe('ScannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(screen.getByTestId('clear-slot-0')).toBeTruthy();

    // Wyczyść slot 0
    await fireEvent.press(screen.getByTestId('clear-slot-0'));
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

  it('opens triage modal with candidate hypothesis and deadly lookalike crimson banner', async () => {
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

    // Przycisk porównania 1:1 kieruje do /look-alikes/{pairId}
    const compareBtn = screen.getByTestId('compare-lookalike-button');
    await fireEvent.press(compareBtn);
    expect(router.push).toHaveBeenCalledWith(
      '/look-alikes/macrolepiota_procera__amanita_phalloides',
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

  it('shows permission request view when permission is not granted', async () => {
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
  });
});
