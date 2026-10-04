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
  const CameraView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ takePictureAsync }));
    return React.createElement('CameraView', props);
  });
  return {
    CameraView,
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
    __takePictureAsync: takePictureAsync,
  };
});

const takePictureAsync = (require('expo-camera') as { __takePictureAsync: jest.Mock }).__takePictureAsync;

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
    takePictureAsync.mockResolvedValue({ uri: 'file://camera/real-capture.jpg' });
    const { getByTestId, findByText, queryByText } = await renderScanner();

    await fireEvent.press(getByTestId('scanner-shutter'));

    expect(await findByText(pl.scanner.recognitionUnavailableTitle)).toBeTruthy();
    await settle();
    expect(classifySpy).toHaveBeenCalledTimes(1);
    expect(classifySpy).toHaveBeenCalledWith('file://camera/real-capture.jpg');
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
});
