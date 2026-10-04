import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ScannerScreen } from '../../screens/ScannerScreen';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { classifierService } from '../../services/classifierService';

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

function renderScanner(onOpenAtlasSpecies = jest.fn()) {
  return {
    onOpenAtlasSpecies,
    ...render(
      <LanguageProvider>
        <ScannerScreen onOpenAtlasSpecies={onOpenAtlasSpecies} />
      </LanguageProvider>
    ),
  };
}

describe('ScannerScreen does not invent a recognition result', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    takePictureAsync.mockReset();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockReset();
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(classifierService, 'classifyImage');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('labels species chips as atlas samples and does not classify them', async () => {
    const classifySpy = jest.spyOn(classifierService, 'classifyImage');
    const { getByTestId, getByText, queryByText, onOpenAtlasSpecies } = await renderScanner();

    expect(getByText('Przykłady z atlasu — to nie jest rozpoznawanie:')).toBeTruthy();
    expect(queryByText(/Szybki test/)).toBeNull();

    fireEvent.press(getByTestId('demo-atlas-boletus'));
    fireEvent.press(getByTestId('demo-atlas-amanita'));

    expect(onOpenAtlasSpecies).toHaveBeenNthCalledWith(1, 'boletus_edulis');
    expect(onOpenAtlasSpecies).toHaveBeenNthCalledWith(2, 'amanita_phalloides');
    expect(classifySpy).not.toHaveBeenCalled();
  });

  it('does not fall back to a stock photo when the camera fails', async () => {
    const classifySpy = jest.spyOn(classifierService, 'classifyImage');
    takePictureAsync.mockRejectedValue(new Error('camera failed'));
    const { getByTestId, queryByText } = await renderScanner();

    fireEvent.press(getByTestId('scanner-shutter'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Nie udało się zrobić zdjęcia',
        'Rozpoznawanie nie zostało uruchomione. Nie użyto zdjęcia zastępczego.'
      );
    });
    expect(classifySpy).not.toHaveBeenCalled();
    expect(queryByText('Rozpoznawanie niedostępne')).toBeNull();
    const alertText = (Alert.alert as jest.Mock).mock.calls.flat().join(' ');
    expect(alertText).not.toMatch(/unsplash|boletus_edulis/i);
  });

  it('does not classify when the camera returns no photo', async () => {
    const classifySpy = jest.spyOn(classifierService, 'classifyImage');
    takePictureAsync.mockResolvedValue({});
    const { getByTestId } = await renderScanner();

    fireEvent.press(getByTestId('scanner-shutter'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
    expect(classifySpy).not.toHaveBeenCalled();
  });

  it('shows recognition unavailable for a real captured photo, without a confidence', async () => {
    takePictureAsync.mockResolvedValue({ uri: 'file://camera/real-capture.jpg' });
    const { getByTestId, findByText, queryByText } = await renderScanner();

    fireEvent.press(getByTestId('scanner-shutter'));

    expect(await findByText('Rozpoznawanie niedostępne')).toBeTruthy();
    expect(classifierService.classifyImage).toHaveBeenCalledTimes(1);
    expect(classifierService.classifyImage).toHaveBeenCalledWith('file://camera/real-capture.jpg');
    expect(queryByText(/Pewność/)).toBeNull();
    expect(queryByText(/TFLite/)).toBeNull();
    expect(queryByText(/Borowik szlachetny/)).toBeNull();
  });

  it('does not fall back to a stock photo when the gallery picker fails', async () => {
    const classifySpy = jest.spyOn(classifierService, 'classifyImage');
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(new Error('picker failed'));
    const { getByTestId, queryByText } = await renderScanner();

    fireEvent.press(getByTestId('scanner-gallery'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
    expect(classifySpy).not.toHaveBeenCalled();
    expect(queryByText('Rozpoznawanie niedostępne')).toBeNull();
    const alertText = (Alert.alert as jest.Mock).mock.calls.flat().join(' ');
    expect(alertText).not.toMatch(/unsplash/i);
  });
});
