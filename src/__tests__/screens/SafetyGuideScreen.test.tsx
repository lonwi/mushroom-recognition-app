import React from 'react';
import { render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafetyGuideScreen } from '../../screens/SafetyGuideScreen';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { en } from '../../i18n/en';
import { pl } from '../../i18n/pl';

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
