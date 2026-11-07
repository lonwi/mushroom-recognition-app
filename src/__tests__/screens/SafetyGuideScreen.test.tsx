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
    expect(tree.indexOf(pl.safetyGuide.call112Title)).toBeLessThan(tree.indexOf(pl.safetyGuide.call999Title));
    expect(tree.indexOf(pl.safetyGuide.call999Title)).toBeLessThan(tree.indexOf(first?.address ?? ''));
  });

  it('calls 999 from its own button next to 112', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const { getByTestId } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );

    const button = getByTestId('call-999');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe(pl.safetyGuide.call999Title);
    expect(StyleSheet.flatten(button.props.style)).toEqual(
      StyleSheet.flatten(getByTestId('call-112').props.style),
    );
    expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);

    fireEvent.press(button);
    await waitFor(() => {
      expect(openURL).toHaveBeenCalledWith('tel:999');
    });
  });

  it('shows the consultation-line note and the sourced hours in Polish', async () => {
    const { getByText } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );

    expect(getByText(pl.safetyGuide.centersSub)).toBeTruthy();
    expect(pl.safetyGuide.centersSub).toContain('112 lub 999');
    expect(
      getByText(`${pl.safetyGuide.availabilityLabel} ${pl.safetyGuide.hours247DoctorAdvice}`),
    ).toBeTruthy();
    expect(
      getByText(`${pl.safetyGuide.availabilityLabel} ${pl.safetyGuide.hours247DoctorOnDuty}`),
    ).toBeTruthy();
  });

  it('translates every hours label in English', async () => {
    await AsyncStorage.setItem('app_language', 'en');
    const { findByText, findByTestId, toJSON } = await render(
      <LanguageProvider>
        <SafetyGuideScreen onShowDisclaimer={() => {}} />
      </LanguageProvider>,
    );

    expect(await findByText(en.safetyGuide.centersSub)).toBeTruthy();
    expect(
      await findByText(`${en.safetyGuide.availabilityLabel} ${en.safetyGuide.hours247DoctorAdvice}`),
    ).toBeTruthy();
    expect(
      await findByText(`${en.safetyGuide.availabilityLabel} ${en.safetyGuide.hours247DoctorOnDuty}`),
    ).toBeTruthy();
    expect((await findByTestId('call-999')).props.accessibilityLabel).toBe(en.safetyGuide.call999Title);
    const tree = JSON.stringify(toJSON());
    for (const hours of TOXICOLOGY_CENTERS.map((c) => c.hours).filter(Boolean)) {
      expect(tree).not.toContain(hours);
    }
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
