import React from 'react';
import { BackHandler, Platform, StyleSheet } from 'react-native';
import { act, render, fireEvent, waitFor, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AtlasScreen } from '../../screens/AtlasScreen';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { en } from '../../i18n/en';
import { pl } from '../../i18n/pl';

interface TestNode {
  props: { onRequestClose?: () => void };
  children: ReadonlyArray<TestNode | string | number>;
}

function requestClose(node: TestNode): (() => void) | undefined {
  if (typeof node.props.onRequestClose === 'function') return node.props.onRequestClose;
  for (const child of node.children) {
    if (typeof child === 'object') {
      const found = requestClose(child);
      if (found) return found;
    }
  }
  return undefined;
}

describe('AtlasScreen RTL Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders search input and mushroom list', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    expect(getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...')).toBeTruthy();
    expect(getByText('Prawdziwki')).toBeTruthy();
  });

  it('filters species by search query', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, getByText, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    const input = getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...');
    await fireEvent.changeText(input, 'Prawdziwek');

    await waitFor(() => {
      expect(getByText('Prawdziwki')).toBeTruthy();
      expect(queryByText('Muchomor sromotnikowy (zielonawy)')).toBeNull();
    });
  });

  it('keeps a long deadly name full width with the badge under the title', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.press(screen.getByTestId('filter-chip-kind-poisonous'));

    const copy = await screen.findByTestId('atlas-card-copy-amanita_phalloides');
    const title = screen.getByTestId('atlas-name-pl-amanita_phalloides');
    const latin = screen.getByTestId('atlas-name-latin-amanita_phalloides');
    const badge = screen.getByTestId('atlas-card-badge-amanita_phalloides');
    const column = StyleSheet.flatten(copy.props.style);
    const titleStyle = StyleSheet.flatten(title.props.style);

    expect(column.flexDirection).toBe('column');
    expect(column.alignItems).toBe('stretch');
    expect(titleStyle.alignSelf).toBe('stretch');
    expect(title.parent).toBe(copy);
    expect(latin.parent).toBe(copy);
    expect(badge.parent).toBe(copy);
    expect(copy.children.indexOf(title)).toBeLessThan(copy.children.indexOf(badge));
    expect(copy.children.indexOf(latin)).toBeLessThan(copy.children.indexOf(badge));
    expect(title.props.children).toBe('Muchomor sromotnikowy (zielonawy)');
    expect(title.props.textBreakStrategy).toBe('simple');
    expect(title.props.android_hyphenationFrequency).toBe('none');
    expect(StyleSheet.flatten(latin.props.style).alignSelf).toBe('stretch');
    expect(latin.props.textBreakStrategy).toBe('simple');
    expect(latin.props.android_hyphenationFrequency).toBe('none');
    expect(within(badge).getByText('ŚMIERTELNIE TRUJĄCY')).toBeTruthy();

    const longCopy = screen.getByTestId('atlas-card-copy-inocybe_erubescens');
    const longTitle = screen.getByTestId('atlas-name-pl-inocybe_erubescens');
    const longLatin = screen.getByTestId('atlas-name-latin-inocybe_erubescens');
    const longBadge = screen.getByTestId('atlas-card-badge-inocybe_erubescens');

    expect(longTitle.props.children).toBe('Strzępiak ceglasty');
    expect(longLatin.props.children).toBe('Inosperma erubescens (syn. Inocybe erubescens)');
    expect(longTitle.parent).toBe(longCopy);
    expect(longLatin.parent).toBe(longCopy);
    expect(longBadge.parent).toBe(longCopy);
    expect(longCopy.children.indexOf(longTitle)).toBeLessThan(longCopy.children.indexOf(longBadge));
    expect(longCopy.children.indexOf(longLatin)).toBeLessThan(longCopy.children.indexOf(longBadge));
    expect(StyleSheet.flatten(longCopy.props.style).flexDirection).toBe('column');
    expect(StyleSheet.flatten(longCopy.props.style).alignItems).toBe('stretch');
    expect(StyleSheet.flatten(longTitle.props.style).alignSelf).toBe('stretch');
    expect(StyleSheet.flatten(longLatin.props.style).alignSelf).toBe('stretch');
    expect(longTitle.props.textBreakStrategy).toBe('simple');
    expect(longLatin.props.textBreakStrategy).toBe('simple');
    expect(longLatin.props.android_hyphenationFrequency).toBe('none');
    expect(within(longBadge).getByText('ŚMIERTELNIE TRUJĄCY')).toBeTruthy();
  });

  it('filters deadly poisonous mushrooms', async () => {
    const onSelect = jest.fn();
    const { getByText, getAllByText, getByTestId, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    await fireEvent.press(getByTestId('filter-chip-kind-poisonous'));

    await waitFor(() => {
      expect(getByText('Muchomor sromotnikowy (zielonawy)')).toBeTruthy();
      expect(queryByText('Prawdziwki')).toBeNull();
      expect(getAllByText('☠ Sobowtór!').length).toBeGreaterThan(0);
    });
  });

  it('opens borowik szatański for szatan and does not open goryczak', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, getByText, queryByTestId, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    await fireEvent.changeText(
      getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...'),
      'szatan'
    );

    await waitFor(() => {
      expect(getByText('Borowik szatański')).toBeTruthy();
      expect(queryByText('Goryczak żółciowy')).toBeNull();
      expect(queryByTestId('atlas-szatan-notice')).toBeNull();
      expect(queryByText(/nie jest opisany/)).toBeNull();
      expect(queryByTestId('atlas-months-rubroboletus_satanas')).toBeNull();
    });
  });

  it('shows a no-photo state for look-alikes that have no picture', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, getByTestId, getByText, queryByTestId, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={onSelect} />
      </LanguageProvider>
    );

    await fireEvent.changeText(
      getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...'),
      'Gołąbek zielonawy'
    );

    await waitFor(() => {
      expect(getByTestId('atlas-photo-missing-russula_virescens')).toBeTruthy();
      expect(getByText('Brak zdjęcia')).toBeTruthy();
      expect(queryByTestId('atlas-photo-russula_virescens')).toBeNull();
      expect(getByTestId('incomplete-card-badge-russula_virescens')).toBeTruthy();
      expect(queryByText('JADALNY')).toBeNull();
    });
  });

  it('states the real card count and that the atlas is not a complete key', async () => {
    const { getByTestId } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    const { MUSHROOMS_DATABASE } = require('../../data/mushrooms');
    const notice = getByTestId('atlas-scope-notice').props.children as string;
    expect(notice).toContain(String(MUSHROOMS_DATABASE.length));
    expect(notice).toContain('nie jest kompletny klucz');
    expect(notice).toContain('Sanepidzie');
    expect(getByTestId('atlas-result-count').props.children).toBe(
      `Pasujące karty: ${MUSHROOMS_DATABASE.length}`
    );
  });

  it('filters by inedible and poisonous chips and keeps the result count on the matches', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.press(screen.getByTestId('filter-chip-kind-inedible'));
    await waitFor(() => {
      const matches = within(screen.getByTestId('atlas-matches'));
      expect(matches.getByText('Goryczak żółciowy')).toBeTruthy();
      expect(matches.queryByText('Prawdziwki')).toBeNull();
      expect(matches.queryByText('W kuchni')).toBeNull();
      expect(screen.getByTestId('atlas-result-count').props.children).toBe('Pasujące karty: 2');
    });

    await fireEvent.press(screen.getByTestId('filter-chip-kind-inedible'));
    await fireEvent.press(screen.getByTestId('filter-chip-kind-poisonous'));
    await waitFor(() => {
      const matches = within(screen.getByTestId('atlas-matches'));
      expect(matches.getByText('Muchomor czerwony')).toBeTruthy();
      expect(matches.getByText('Muchomor plamisty')).toBeTruthy();
      expect(matches.getByTestId('atlas-psychoactive-amanita_muscaria')).toBeTruthy();
      expect(matches.getByTestId('atlas-psychoactive-amanita_pantherina')).toBeTruthy();
      expect(screen.queryByTestId('filter-chip-psychoactive')).toBeNull();
      expect(matches.getByText('Muchomor sromotnikowy (zielonawy)')).toBeTruthy();
      expect(matches.getByText('Krowiak podwinięty (Olszówka)')).toBeTruthy();
      expect(within(matches.getByTestId('atlas-card-badge-amanita_phalloides')).getByText('ŚMIERTELNIE TRUJĄCY')).toBeTruthy();
      expect(within(matches.getByTestId('atlas-card-badge-paxillus_involutus')).getByText('ŚMIERTELNIE TRUJĄCY')).toBeTruthy();
      expect(matches.queryByText('Goryczak żółciowy')).toBeNull();
      expect(matches.queryByText('Prawdziwki')).toBeNull();
    });
  });

  it('edible filter skips unfinished cards', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.press(screen.getByTestId('filter-chip-kind-edible'));
    await waitFor(() => {
      const matches = within(screen.getByTestId('atlas-matches'));
      expect(matches.getByText('Prawdziwki')).toBeTruthy();
      expect(matches.getAllByText('JADALNY').length).toBeGreaterThan(0);
      expect(matches.getAllByText('☠ Sobowtór!').length).toBeGreaterThan(0);
      expect(matches.queryByText('Muchomor sromotnikowy (zielonawy)')).toBeNull();
      expect(matches.queryByText('Gołąbek zielonawy')).toBeNull();
      expect(matches.queryByText('Pieczarka polna')).toBeNull();
      expect(matches.queryByText('Smardz jadalny')).toBeNull();
      expect(matches.queryByText('Borowik ceglastopory')).toBeNull();
      expect(matches.queryByText('Maślak sitarz')).toBeNull();
      expect(matches.queryByText('Opieńki')).toBeNull();
      expect(matches.queryByText('Łuskwiak zmienny')).toBeNull();
      expect(matches.queryByText('Gęśnica wiosenna')).toBeNull();
      expect(matches.queryByText('Maślanka łagodna')).toBeNull();
      const unverified = within(screen.getByTestId('atlas-unverified'));
      expect(unverified.getByText('Gołąbek zielonawy')).toBeTruthy();
      expect(unverified.getByText('Pieczarka polna')).toBeTruthy();
      expect(unverified.getByText('Smardz jadalny')).toBeTruthy();
      expect(unverified.getByText('Borowik ceglastopory')).toBeTruthy();
      expect(unverified.getByText('Maślak sitarz')).toBeTruthy();
      expect(unverified.getByText('Opieńki')).toBeTruthy();
      expect(unverified.getByText('Łuskwiak zmienny')).toBeTruthy();
      expect(unverified.getByText('Gęśnica wiosenna')).toBeTruthy();
      expect(unverified.getByText('Maślanka łagodna')).toBeTruthy();
      expect(unverified.getByText('Kolczak obłączasty')).toBeTruthy();
      expect(unverified.getByText(/nie oznacza, że grzyb jest jadalny/)).toBeTruthy();
      expect(screen.queryByTestId('atlas-condition-armillaria_mellea')).toBeNull();
    });
  });

  it('moves an empty feature to verification and keeps the result count on the matches', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.press(screen.getByTestId('atlas-filter-open'));
    await fireEvent.press(screen.getByTestId('filter-chip-ring-present'));
    await waitFor(() => {
      const matches = within(screen.getByTestId('atlas-matches'));
      expect(matches.getByText('Czubajka kania')).toBeTruthy();
      expect(matches.queryByText('Zasłonak rudy')).toBeNull();
      const unverified = within(screen.getByTestId('atlas-unverified'));
      expect(unverified.getByText('Zasłonak rudy')).toBeTruthy();
      expect(screen.queryByText('Gęśnica wiosenna')).toBeNull();
      expect(screen.queryByText('Prawdziwki')).toBeNull();
      const listed = screen.getAllByTestId(/^atlas-card-[a-z0-9_]+$/);
      const matchCount = within(screen.getByTestId('atlas-matches')).getAllByTestId(/^atlas-card-[a-z0-9_]+$/).length;
      expect(screen.getByTestId('atlas-result-count').props.children).toBe(`Pasujące karty: ${matchCount}`);
      expect(listed.length).toBeGreaterThan(matchCount);
    });
  });

  it('searches by Latin name', async () => {
    const { getByPlaceholderText, getByText, queryByText } = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.changeText(
      getByPlaceholderText('Szukaj grzyba (np. borowik, kania, kurka)...'),
      'Amanita virosa'
    );

    await waitFor(() => {
      expect(getByText('Muchomor jadowity')).toBeTruthy();
      expect(queryByText('Prawdziwki')).toBeNull();
    });
  });

  it('keeps Polish list labels and does not show the source-language note', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    expect(screen.getByText('Prawdziwki')).toBeTruthy();
    expect(screen.getByTestId('atlas-months-boletus_edulis').props.children).toBe('📅 6 - 11 mies.');
    expect(screen.queryByTestId('atlas-source-language-note')).toBeNull();
    expect(screen.queryByText(en.cards.sourceLanguageNote)).toBeNull();
    expect(pl.atlas.monthRange).toBe('{start} - {end} mies.');

    await fireEvent.press(screen.getByTestId('filter-chip-kind-poisonous'));
    await waitFor(() => {
      expect(screen.getAllByText('☠ Sobowtór!').length).toBeGreaterThan(0);
      expect(screen.queryByText('☠ Look-alike!')).toBeNull();
      expect(screen.queryByTestId('atlas-source-language-note')).toBeNull();
    });
  });

  it('shows English list labels, English months, and the Polish source-text note', async () => {
    await AsyncStorage.setItem('app_language', 'en');
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    expect(await screen.findByTestId('atlas-source-language-note')).toBeTruthy();
    expect(screen.getByText(en.cards.sourceLanguageNote)).toBeTruthy();
    expect(screen.getByText(/source text in Polish/)).toBeTruthy();
    expect(screen.getByText(/look-alike differences/)).toBeTruthy();
    expect(screen.getByText(/morphology/)).toBeTruthy();
    expect(screen.queryByText(pl.cards.sourceLanguageNote)).toBeNull();
    expect(screen.getByTestId('atlas-months-boletus_edulis').props.children).toBe('📅 months 6–11');
    expect(screen.queryByText(/mies\./)).toBeNull();
    expect(screen.getByText('Prawdziwki')).toBeTruthy();
    expect(screen.getByText('To be verified')).toBeTruthy();
    expect(screen.getByText('Filters (0)')).toBeTruthy();
    expect(screen.getByTestId('atlas-filter-open').props.accessibilityLabel).toBe('Filters, active: 0');

    await fireEvent.changeText(
      screen.getByPlaceholderText(en.atlas.searchPlaceholder),
      'Gołąbek zielonawy'
    );
    await waitFor(() => {
      expect(screen.getByText('No photo')).toBeTruthy();
      expect(screen.queryByText('Brak zdjęcia')).toBeNull();
    });

    await fireEvent.changeText(screen.getByPlaceholderText(en.atlas.searchPlaceholder), '');
    await fireEvent.press(screen.getByTestId('filter-chip-kind-edible'));
    await waitFor(() => {
      const matches = within(screen.getByTestId('atlas-matches'));
      const unverified = within(screen.getByTestId('atlas-unverified'));
      expect(matches.getByText('Prawdziwki')).toBeTruthy();
      expect(matches.queryByText('Opieńki')).toBeNull();
      expect(unverified.getByText('Opieńki')).toBeTruthy();
      expect(screen.queryByTestId('atlas-condition-armillaria_mellea')).toBeNull();
    });
    await fireEvent.press(screen.getByTestId('filter-chip-kind-edible'));
    await fireEvent.press(screen.getByTestId('filter-chip-kind-poisonous'));
    await waitFor(() => {
      expect(screen.getAllByText('☠ Look-alike!').length).toBeGreaterThan(0);
      expect(screen.queryByText('☠ Sobowtór!')).toBeNull();
      expect(screen.getByTestId('atlas-psychoactive-amanita_muscaria').props.children).toBe('Psychoactive');
      expect(screen.getByTestId('atlas-source-language-note')).toBeTruthy();
      expect(screen.queryByText('Nietrujące')).toBeNull();
      expect(screen.queryByText('Non-poisonous')).toBeNull();
    });

    await fireEvent.press(screen.getByTestId('atlas-filter-open'));
    await fireEvent.press(screen.getByTestId('filter-chip-protection-brak'));
    expect(screen.getByTestId('filter-active-protection-brak').props.accessibilityLabel).toBe(
      'Remove filter: Protection: Not protected',
    );
    expect(within(screen.getByTestId('filter-active-protection-brak')).getByText('Not protected ×')).toBeTruthy();
  });

  it('keeps type chips and Do weryfikacji in one row and the other groups in the sheet', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    const bar = within(screen.getByTestId('atlas-filter-bar'));
    expect(bar.getByTestId('filter-chip-kind-edible').props.accessibilityRole).toBe('button');
    expect(bar.getByTestId('filter-chip-kind-edible').props.accessibilityState).toEqual({ selected: false });
    expect(bar.getByText('Do weryfikacji')).toBeTruthy();
    expect(bar.getByTestId('filter-chip-unverified').props.accessibilityState).toEqual({ selected: false });
    expect(bar.getByText('Filtry (0)')).toBeTruthy();
    expect(screen.getByTestId('atlas-filter-open').props.accessibilityLabel).toBe('Filtry, aktywne: 0');
    expect(screen.queryByTestId('filter-chip-hymenophore-blaszki')).toBeNull();
    expect(screen.queryByTestId('filter-chip-psychoactive')).toBeNull();
    expect(screen.queryByText('Nietrujące')).toBeNull();

    await fireEvent.press(screen.getByTestId('atlas-filter-open'));
    const sheet = within(screen.getByTestId('atlas-filter-sheet'));
    expect(sheet.queryByTestId('filter-chip-unverified')).toBeNull();
    expect(sheet.queryByTestId('filter-chip-kind-edible')).toBeNull();
    expect(sheet.getByTestId('filter-chip-hymenophore-blaszki')).toBeTruthy();
    expect(sheet.getByTestId('filter-chip-spore-bialy')).toBeTruthy();
    expect(sheet.getByTestId('filter-chip-protection-scisla')).toBeTruthy();
    expect(sheet.getByTestId('filter-chip-ring-present')).toBeTruthy();
    expect(sheet.getByTestId('filter-chip-volva-pochwa')).toBeTruthy();
    expect(sheet.getByText('Wyczyść')).toBeTruthy();
    expect(screen.getByTestId('atlas-filter-open').props.accessibilityState).toEqual({ expanded: true });
  });

  it('counts panel filters, removes one chip, and clears the sheet without hiding poisonous cards', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    expect(screen.getByText('Muchomor sromotnikowy (zielonawy)')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('atlas-filter-open'));
    await fireEvent.press(screen.getByTestId('filter-chip-hymenophore-kolce'));
    await fireEvent.press(screen.getByTestId('filter-chip-ring-present'));

    const withBoth = screen.getByTestId('atlas-result-count').props.children as string;
    expect(withBoth).toBe('Pasujące karty: 0');
    const visibleBoth = screen.getAllByTestId(/^atlas-card-[a-z0-9_]+$/).length;
    expect(visibleBoth).toBeGreaterThan(0);
    expect(screen.getByText('Filtry (2)')).toBeTruthy();
    expect(screen.getByTestId('atlas-filter-open').props.accessibilityLabel).toBe('Filtry, aktywne: 2');
    const show = screen.getByTestId('atlas-filter-show');
    expect(show.props.accessibilityRole).toBe('button');
    expect(show.props.accessibilityLabel).toBe(`Pokaż ${visibleBoth} wyników`);
    expect(within(show).getByText(`Pokaż ${visibleBoth}`)).toBeTruthy();
    expect(screen.getByTestId('filter-chip-hymenophore-kolce').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('filter-active-hymenophore-kolce').props.accessibilityLabel).toBe(
      'Usuń filtr: Spód kapelusza: Kolce',
    );
    expect(within(screen.getByTestId('filter-active-hymenophore-kolce')).getByText('Kolce ×')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('filter-active-hymenophore-kolce'));
    await waitFor(() => {
      expect(screen.getByText('Filtry (1)')).toBeTruthy();
      expect(screen.queryByTestId('filter-active-hymenophore-kolce')).toBeNull();
      expect(screen.getByTestId('filter-active-ring-present').props.accessibilityLabel).toBe(
        'Usuń filtr: Pierścień: Jest pierścień',
      );
      expect(screen.getByTestId('atlas-result-count').props.children).not.toBe(withBoth);
      const visible = screen.getAllByTestId(/^atlas-card-[a-z0-9_]+$/).length;
      expect(screen.getByTestId('atlas-filter-show').props.accessibilityLabel).toBe(`Pokaż ${visible} wyników`);
    });

    await fireEvent.press(screen.getByTestId('atlas-filter-clear'));
    await waitFor(() => {
      expect(screen.getByText('Filtry (0)')).toBeTruthy();
      expect(screen.queryByTestId('atlas-active-filters')).toBeNull();
      expect(screen.getByTestId('atlas-filter-show').props.accessibilityLabel).toBe(
        `Pokaż ${screen.getByTestId('atlas-result-count').props.children.replace('Pasujące karty: ', '')} wyników`,
      );
      expect(screen.getByText('Muchomor sromotnikowy (zielonawy)')).toBeTruthy();
      expect(screen.getByText('Prawdziwki')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('atlas-filter-show'));
    expect(screen.queryByTestId('atlas-filter-sheet')).toBeNull();

    await fireEvent.press(screen.getByTestId('filter-chip-kind-edible'));
    await waitFor(() => {
      expect(within(screen.getByTestId('atlas-matches')).queryByText('Muchomor sromotnikowy (zielonawy)')).toBeNull();
    });
    await fireEvent.press(screen.getByTestId('filter-chip-kind-edible'));
    await waitFor(() => {
      expect(screen.getByText('Muchomor sromotnikowy (zielonawy)')).toBeTruthy();
      expect(screen.getByTestId('filter-chip-kind-edible').props.accessibilityState).toEqual({ selected: false });
    });
  });

  it('counts unverified cards in Pokaż when no card matches', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.press(screen.getByTestId('atlas-filter-open'));
    await fireEvent.press(screen.getByTestId('filter-chip-spore-zolty'));
    await waitFor(() => {
      expect(screen.getByTestId('atlas-result-count').props.children).toBe('Pasujące karty: 0');
      expect(screen.queryByTestId('atlas-empty')).toBeNull();
      expect(screen.getByTestId('atlas-unverified')).toBeTruthy();
    });
    const visible = screen.getAllByTestId(/^atlas-card-[a-z0-9_]+$/);
    expect(visible.length).toBeGreaterThan(1);
    const show = screen.getByTestId('atlas-filter-show');
    expect(show.props.accessibilityLabel).toBe(`Pokaż ${visible.length} wyników`);
    expect(within(show).getByText(`Pokaż ${visible.length}`)).toBeTruthy();
    expect(within(show).queryByText('Pokaż 0')).toBeNull();

    await fireEvent.press(show);
    await waitFor(() => {
      expect(screen.queryByTestId('atlas-filter-sheet')).toBeNull();
    });
    expect(screen.getAllByTestId(/^atlas-card-[a-z0-9_]+$/)).toHaveLength(visible.length);
    expect(screen.queryByTestId('atlas-matches')).toBeNull();
    expect(screen.queryByTestId('atlas-empty')).toBeNull();
  });

  it('names the group when two absence chips would otherwise collide', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.press(screen.getByTestId('atlas-filter-open'));
    await fireEvent.press(screen.getByTestId('filter-chip-protection-brak'));
    await fireEvent.press(screen.getByTestId('filter-chip-volva-brak'));

    const protection = screen.getByTestId('filter-active-protection-brak');
    const volva = screen.getByTestId('filter-active-volva-brak');
    expect(protection.props.accessibilityLabel).toBe('Usuń filtr: Ochrona: Niechroniony');
    expect(volva.props.accessibilityLabel).toBe('Usuń filtr: Pochwa / bulwa: Brak pochwy i bulwy');
    expect(within(protection).getByText('Niechroniony ×')).toBeTruthy();
    expect(within(volva).getByText('Brak pochwy i bulwy ×')).toBeTruthy();

    await fireEvent.press(protection);
    await waitFor(() => {
      expect(screen.queryByTestId('filter-active-protection-brak')).toBeNull();
      expect(screen.getByTestId('filter-active-volva-brak')).toBeTruthy();
      expect(screen.getByText('Filtry (1)')).toBeTruthy();
    });
  });

  it('moves Do weryfikacji above the matches and still shows poisonous cards', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasScreen onSelectSpecies={() => {}} />
      </LanguageProvider>
    );

    await fireEvent.press(screen.getByTestId('filter-chip-unverified'));
    await waitFor(() => {
      expect(screen.getByTestId('filter-chip-unverified').props.accessibilityState).toEqual({ selected: true });
      const results = screen.getByTestId('atlas-results');
      const unverified = screen.getByTestId('atlas-unverified');
      const matches = screen.getByTestId('atlas-matches');
      expect(results.children.indexOf(unverified)).toBeLessThan(results.children.indexOf(matches));
      expect(within(matches).getByText('Muchomor sromotnikowy (zielonawy)')).toBeTruthy();
    });
  });

  it('closes the filter sheet on the Android back button', async () => {
    const previousPlatform = Platform.OS;
    Platform.OS = 'android';
    const handlers: Array<() => boolean | null | undefined> = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, handler) => {
      if (event !== 'hardwareBackPress') {
        return { remove: () => undefined };
      }
      const listener = handler as () => boolean | null | undefined;
      handlers.push(listener);
      return {
        remove: () => {
          const index = handlers.indexOf(listener);
          if (index >= 0) handlers.splice(index, 1);
        },
      };
    });

    try {
      const screen = await render(
        <LanguageProvider>
          <AtlasScreen onSelectSpecies={() => {}} />
        </LanguageProvider>
      );

      await fireEvent.press(screen.getByTestId('atlas-filter-open'));
      expect(screen.getByTestId('atlas-filter-sheet')).toBeTruthy();
      const closeSheet = screen.root ? requestClose(screen.root as unknown as TestNode) : undefined;
      expect(closeSheet).toEqual(expect.any(Function));
      await act(async () => {
        closeSheet?.();
      });
      await waitFor(() => {
        expect(screen.queryByTestId('atlas-filter-sheet')).toBeNull();
      });
      expect(screen.getByTestId('atlas-scope-notice')).toBeTruthy();

      await fireEvent.press(screen.getByTestId('atlas-filter-open'));
      expect(screen.getByTestId('atlas-filter-sheet')).toBeTruthy();
      expect(handlers.length).toBeGreaterThan(0);
      await act(async () => {
        expect(handlers[handlers.length - 1]()).toBe(true);
      });
      await waitFor(() => {
        expect(screen.queryByTestId('atlas-filter-sheet')).toBeNull();
      });
      expect(handlers[handlers.length - 1]()).toBe(false);
      expect(screen.getByTestId('atlas-scope-notice')).toBeTruthy();
    } finally {
      spy.mockRestore();
      Platform.OS = previousPlatform;
    }
  });
});
