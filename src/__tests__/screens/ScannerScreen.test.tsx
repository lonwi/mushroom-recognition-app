import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { ScannerScreen } from '../../screens/ScannerScreen';
import { classifierService } from '../../services/classifierService';
import { pl } from '../../i18n/pl';

jest.mock('../../contexts/LanguageContext', () => {
  const { pl: polish } = require('../../i18n/pl');
  const t = (path: string) => {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, polish);
    return typeof value === 'string' ? value : path;
  };
  return {
    LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
    useLanguage: () => ({ language: 'pl', setLanguage: () => undefined, t }),
  };
});

jest.mock('expo-camera', () => {
  const React = require('react');
  const takePictureAsync = jest.fn();
  const permission: { current: { granted: boolean } | null } = { current: { granted: true } };
  const CameraView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ takePictureAsync }));
    return React.createElement('CameraView', props);
  });
  return {
    CameraView,
    useCameraPermissions: () => [permission.current, jest.fn()],
    __takePictureAsync: takePictureAsync,
    __permission: permission,
  };
});

const cameraMock = require('expo-camera') as {
  __takePictureAsync: jest.Mock;
  __permission: { current: { granted: boolean } | null };
};
const takePictureAsync = cameraMock.__takePictureAsync;

async function renderScanner(onOpenAtlasSpecies = jest.fn()) {
  const screen = await render(<ScannerScreen onOpenAtlasSpecies={onOpenAtlasSpecies} />);
  return { onOpenAtlasSpecies, ...screen };
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('ScannerScreen does not invent a recognition result', () => {
  let classifySpy: jest.SpyInstance;

  beforeEach(() => {
    cameraMock.__permission.current = { granted: true };
    takePictureAsync.mockReset();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockReset();
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    classifySpy = jest.spyOn(classifierService, 'classifyImage');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('labels species chips as atlas samples and does not classify them', async () => {
    const { getByTestId, getByText, queryByText, onOpenAtlasSpecies } = await renderScanner();

    expect(getByText(pl.scanner.quickDemo)).toBeTruthy();
    expect(queryByText(/Szybki test/)).toBeNull();

    await fireEvent.press(getByTestId('demo-atlas-boletus'));
    await fireEvent.press(getByTestId('demo-atlas-amanita'));
    await settle();

    expect(onOpenAtlasSpecies).toHaveBeenNthCalledWith(1, 'boletus_edulis');
    expect(onOpenAtlasSpecies).toHaveBeenNthCalledWith(2, 'amanita_phalloides');
    expect(classifySpy).not.toHaveBeenCalled();
  });

  it('does not fall back to a stock photo when the camera fails', async () => {
    takePictureAsync.mockRejectedValue(new Error('camera failed'));
    const { getByTestId, queryByText } = await renderScanner();

    await fireEvent.press(getByTestId('scanner-shutter'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.scanner.photoFailedTitle,
        pl.scanner.photoFailedBody
      );
    });
    await settle();
    expect(classifySpy).not.toHaveBeenCalled();
    expect(queryByText(pl.scanner.recognitionUnavailableTitle)).toBeNull();
    const alertText = (Alert.alert as jest.Mock).mock.calls.flat().join(' ');
    expect(alertText).not.toMatch(/unsplash|boletus_edulis/i);
  });

  it('does not classify when the camera returns no photo', async () => {
    takePictureAsync.mockResolvedValue({});
    const { getByTestId } = await renderScanner();

    await fireEvent.press(getByTestId('scanner-shutter'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.scanner.photoFailedTitle,
        pl.scanner.photoFailedBody
      );
    });
    await settle();
    expect(classifySpy).not.toHaveBeenCalled();
  });

  it('shows recognition unavailable for a real captured photo, without a confidence', async () => {
    takePictureAsync.mockResolvedValue({ uri: 'file://camera/real-capture.jpg', width: 4032 });
    const { getByTestId, findByText, queryByText } = await renderScanner();

    await fireEvent.press(getByTestId('scanner-shutter'));

    expect(await findByText(pl.scanner.recognitionUnavailableTitle)).toBeTruthy();
    await settle();
    expect(classifySpy).toHaveBeenCalledTimes(1);
    expect(classifySpy).toHaveBeenCalledWith('file://camera/real-capture.jpg', 4032);
    expect(queryByText(/Pewność/)).toBeNull();
    expect(queryByText(/TFLite/)).toBeNull();
    expect(queryByText(/Borowik szlachetny/)).toBeNull();
  });

  it('does not fall back to a stock photo when the gallery picker fails', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(new Error('picker failed'));
    const { getByTestId, queryByText } = await renderScanner();

    await fireEvent.press(getByTestId('scanner-gallery'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
    await settle();
    expect(classifySpy).not.toHaveBeenCalled();
    expect(queryByText(pl.scanner.recognitionUnavailableTitle)).toBeNull();
    const alertText = (Alert.alert as jest.Mock).mock.calls.flat().join(' ');
    expect(alertText).not.toMatch(/unsplash/i);
  });

  it('shows the camera permission copy from i18n and does not classify', async () => {
    cameraMock.__permission.current = { granted: false };
    const { getByText } = await renderScanner();

    expect(getByText(pl.scanner.cameraRequiredTitle)).toBeTruthy();
    expect(getByText(pl.scanner.cameraRequiredBody)).toBeTruthy();
    expect(getByText(pl.scanner.allowCamera)).toBeTruthy();
    expect(getByText(pl.scanner.galleryAlt)).toBeTruthy();
    expect(classifySpy).not.toHaveBeenCalled();
  });
});

const dangerousTop3 = [
  {
    id: 'amanita_phalloides',
    namePl: 'Muchomor sromotnikowy (zielonawy)',
    nameLatin: 'Amanita phalloides',
    genus: 'Amanita',
    confidence: 0.41,
    rank: 1,
  },
  {
    id: 'cortinarius_orellanus',
    namePl: 'Zasłoniak rudy',
    nameLatin: 'Cortinarius orellanus',
    genus: 'Cortinarius',
    confidence: 0.22,
    rank: 2,
  },
  {
    id: 'gyromitra_esculenta',
    namePl: 'Piestrzenica kasztanowata',
    nameLatin: 'Gyromitra esculenta',
    genus: 'Gyromitra',
    confidence: 0.11,
    rank: 3,
  },
];

describe('ScannerScreen shows the real model outcome', () => {
  let classifySpy: jest.SpyInstance;

  beforeEach(() => {
    cameraMock.__permission.current = { granted: true };
    takePictureAsync.mockReset();
    takePictureAsync.mockResolvedValue({ uri: 'file://camera/real-capture.jpg' });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    classifySpy = jest.spyOn(classifierService, 'classifyImage');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps a captured photo on the unavailable path, with no species and no confidence', async () => {
    classifySpy.mockResolvedValue({
      status: 'unavailable',
      reason: 'model_missing',
      processedImageUri: 'file://camera/real-capture.jpg',
    });
    const { getByTestId, findByText, queryByText, queryByTestId } = await renderScanner();

    await fireEvent.press(getByTestId('scanner-shutter'));

    expect(await findByText(pl.scanner.recognitionUnavailableTitle)).toBeTruthy();
    expect(await findByText(pl.scanner.recognitionUnavailableBody)).toBeTruthy();
    expect(queryByText(/Pewność:/)).toBeNull();
    expect(queryByTestId('candidate-confidence-1')).toBeNull();
    expect(queryByTestId('candidate-rank-1')).toBeNull();
    expect(queryByText('JADALNY')).toBeNull();
  });

  it('says it does not know the species when the picture is unclear', async () => {
    classifySpy.mockResolvedValue({
      status: 'rejected',
      reason: 'unclear',
      processedImageUri: 'file://camera/real-capture.jpg',
      inferenceTimeMs: 11,
    });
    const { getByTestId, findByText, queryByText, queryByTestId } = await renderScanner();

    await fireEvent.press(getByTestId('scanner-shutter'));

    expect(await findByText(pl.scanner.rejectedTitle)).toBeTruthy();
    expect(await findByText(pl.scanner.rejectedUnclear)).toBeTruthy();
    expect(await findByText(pl.scanner.rejectedVerify)).toBeTruthy();
    expect(queryByText(/Pewność:/)).toBeNull();
    expect(queryByTestId('candidate-rank-1')).toBeNull();
    expect(queryByText('JADALNY')).toBeNull();
  });

  it('rejects a non-mushroom without naming a species', async () => {
    classifySpy.mockResolvedValue({
      status: 'rejected',
      reason: 'not_a_mushroom',
      processedImageUri: 'file://camera/real-capture.jpg',
      inferenceTimeMs: 9,
    });
    const { getByTestId, findByText, queryByText, queryByTestId } = await renderScanner();

    await fireEvent.press(getByTestId('scanner-shutter'));

    expect(await findByText(pl.scanner.rejectedNotMushroom)).toBeTruthy();
    expect(queryByText(/Pewność:/)).toBeNull();
    expect(queryByText(/Borowik szlachetny/)).toBeNull();
    expect(queryByTestId('expert-verification-banner')).toBeNull();
    expect(queryByTestId('candidate-rank-1')).toBeNull();
  });

  it('shows the top three and the dangerous-genus warning without an edibility verdict', async () => {
    classifySpy.mockResolvedValue({
      status: 'candidates',
      processedImageUri: 'file://camera/real-capture.jpg',
      inferenceTimeMs: 18,
      expertVerificationRequired: true,
      warningReasons: ['dangerous_genus', 'low_confidence'],
      top3: dangerousTop3,
    });
    const { getByTestId, findByText, queryByText } = await renderScanner();

    await fireEvent.press(getByTestId('scanner-shutter'));

    expect(await findByText(pl.scanner.candidatesTitle)).toBeTruthy();
    expect(getByTestId('dangerous-genus-warning')).toHaveTextContent(pl.scanner.dangerousGenusWarning);
    expect(getByTestId('low-confidence-warning')).toHaveTextContent(pl.scanner.lowConfidenceWarning);
    expect(getByTestId('expert-verification-banner')).toHaveTextContent(
      /Nie zbieraj tego do jedzenia na podstawie skanu/,
    );
    expect(getByTestId('candidate-rank-1')).toHaveTextContent(/Muchomor sromotnikowy/);
    expect(getByTestId('candidate-rank-2')).toHaveTextContent(/Zasłoniak rudy/);
    expect(getByTestId('candidate-rank-3')).toHaveTextContent(/Piestrzenica kasztanowata/);
    expect(getByTestId('candidate-confidence-1')).toHaveTextContent(/41\.0%/);
    expect(getByTestId('not-edibility-verdict')).toHaveTextContent(pl.scanner.notEdibilityVerdict);
    expect(queryByText('JADALNY')).toBeNull();
    expect(queryByText('ŚMIERTELNIE TRUJĄCY')).toBeNull();
    expect(pl.scanner.expertWarningBody).toMatch(/Nie zbieraj/);
    expect(pl.scanner.dangerousGenusWarning).toMatch(/Amanita, Cortinarius, Galerina albo Gyromitra/);
  });
});
