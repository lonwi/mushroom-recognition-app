import React from 'react';
import { Alert, Linking, StyleSheet } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafetyGuideScreen } from '../../screens/SafetyGuideScreen';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { en } from '../../i18n/en';
import { pl } from '../../i18n/pl';
import { TOXICOLOGY_CENTERS } from '../../data/safetyRules';

describe('SafetyGuideScreen foraging rules', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows the gilled-mushroom rule as critical and the harvest tips as tips', async () => {
    const { getByText, getAllByText, queryByText } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} onOpenPreparation={() => {}} />
      </LanguageProvider>,
    );

    expect(getByText(pl.safetyGuide.rules.rule_tubes_first.title)).toBeTruthy();
    expect(getByText(pl.safetyGuide.rules.rule_whole_mushroom.title)).toBeTruthy();
    expect(getByText(pl.safetyGuide.rules.rule_whole_mushroom.description)).toBeTruthy();
    expect(getByText(pl.safetyGuide.rules.rule_tube_mushrooms_cut.title)).toBeTruthy();
    expect(getByText(pl.safetyGuide.rules.rule_tube_mushrooms_cut.description)).toBeTruthy();
    expect(getByText(pl.safetyGuide.rules.rule_protect_forest_floor.title)).toBeTruthy();
    expect(getByText(pl.safetyGuide.rules.rule_protect_forest_floor.description)).toBeTruthy();
    expect(queryByText('Wykręcaj owocnik w całości z nasadą trzonu')).toBeNull();
    expect(getAllByText(pl.safetyGuide.badgeCritical).length).toBeGreaterThanOrEqual(4);
    expect(getAllByText(pl.safetyGuide.badgeTip).length).toBeGreaterThanOrEqual(3);
  });

  it('renders the same foraging guidance in English', async () => {
    await AsyncStorage.setItem('app_language', 'en');

    const { findByText, queryByText } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );

    expect(await findByText(en.safetyGuide.rules.rule_whole_mushroom.title)).toBeTruthy();
    expect(await findByText(en.safetyGuide.rules.rule_tube_mushrooms_cut.description)).toBeTruthy();
    expect(await findByText(en.safetyGuide.rules.rule_protect_forest_floor.description)).toBeTruthy();
    expect(await findByText(en.safetyGuide.rules.rule_tubes_first.title)).toBeTruthy();
    expect(queryByText(pl.safetyGuide.rules.rule_whole_mushroom.title)).toBeNull();
  });
});

describe('SafetyGuideScreen — handleCall', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('calls Linking.openURL when the tel: scheme is supported', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const { getByText } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );

    fireEvent.press(getByText(pl.safetyGuide.call112Title));

    await waitFor(() => {
      expect(openURL).toHaveBeenCalledWith('tel:112');
    });
  });

  it('shows an Alert when the tel: scheme is not supported (tablet / simulator)', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByText } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );

    fireEvent.press(getByText(pl.safetyGuide.call112Title));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        pl.safetyGuide.callNotSupportedTitle,
        pl.safetyGuide.callNotSupportedBody,
      );
    });
  });
});

describe('SafetyGuideScreen — toxicology centres', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('shows the 112 button before the toxicology centres', async () => {
    const { toJSON } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );
    const tree = JSON.stringify(toJSON());
    const first = TOXICOLOGY_CENTERS[0];
    expect(first).toBeDefined();
    expect(tree.indexOf(pl.safetyGuide.call112Title)).toBeGreaterThan(-1);
    expect(tree.indexOf(pl.safetyGuide.call112Title)).toBeLessThan(tree.indexOf(first?.address ?? ''));
  });

  it('renders a call button for every number, including the second Gdańsk number', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const { getByText } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );

    for (const phone of TOXICOLOGY_CENTERS.flatMap((c) => c.phones)) {
      expect(getByText(`📞 ${phone}`)).toBeTruthy();
    }
    fireEvent.press(getByText('📞 512 069 737'));
    await waitFor(() => {
      expect(openURL).toHaveBeenCalledWith('tel:+48512069737');
    });
  });

  it('exposes every call button to screen readers with a label and a 44 pt target', async () => {
    const { getByTestId } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );

    const emergency = getByTestId('call-112');
    expect(emergency.props.accessibilityRole).toBe('button');
    expect(emergency.props.accessibilityLabel).toBe(pl.safetyGuide.call112Title);
    expect(StyleSheet.flatten(emergency.props.style).minHeight).toBeGreaterThanOrEqual(44);

    for (const center of TOXICOLOGY_CENTERS) {
      for (const phone of center.phones) {
        const button = getByTestId(`call-center-${phone.replace(/\D/g, '')}`);
        expect(button.props.accessibilityRole).toBe('button');
        expect(button.props.accessibilityLabel).toBe(`Zadzwoń: ${center.city} ${phone}`);
        expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
      }
    }
  });

  it('labels the call buttons in English', async () => {
    await AsyncStorage.setItem('app_language', 'en');
    const { findByTestId } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );

    const lodz = await findByTestId('call-center-661442576');
    expect(lodz.props.accessibilityLabel).toBe('Call: Łódź 661 442 576');
  });
});
