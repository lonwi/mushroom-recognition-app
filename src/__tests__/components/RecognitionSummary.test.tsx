import React from 'react';
import { render } from '@testing-library/react-native';
import { RecognitionSummary, RecognitionSummaryData } from '../../components/RecognitionSummary';
import { LanguageProvider } from '../../contexts/LanguageContext';

const ENTRY_ID = 'entry-1';

const DEADLY_NAME = 'Muchomor sromotnikowy (zielonawy)';
const TOXIC_NAME = 'Maślanka wiązkowa';
const GENUS_WARNING = /Amanita, Cortinarius, Galerina albo Gyromitra/;
const EXPERT_BODY = /Nie zbieraj tego do jedzenia na podstawie skanu/;
const NOT_EDIBILITY = 'Ten skan nie jest oceną jadalności.';
const UNKNOWN_BODY = 'To wygląda na grzyba, którego aplikacja nie zna. Nie zbieraj go ani nie jedz na podstawie skanu.';
const UNKNOWN_DEADLY = 'Ten grzyb może być śmiertelnie trujący.';
const NOT_MUSHROOM_BODY = /Gatunek nie został podany/;
const VERIFY = /grzyboznawcy albo w Sanepidzie/;

async function renderSummary(recognition: RecognitionSummaryData, variant: 'modal' | 'journal') {
  const props =
    variant === 'modal'
      ? { variant: 'modal' as const, recognition }
      : { variant: 'journal' as const, recognition, entryId: ENTRY_ID };
  return render(
    <LanguageProvider>
      <RecognitionSummary {...props} />
    </LanguageProvider>,
  );
}

function expectNoEdibilityBadge(queryByText: (text: string) => unknown) {
  expect(queryByText('JADALNY')).toBeNull();
  expect(queryByText('NIEJADALNY')).toBeNull();
  expect(queryByText('TRUJĄCY')).toBeNull();
  expect(queryByText('ŚMIERTELNIE TRUJĄCY')).toBeNull();
}

describe('RecognitionSummary warnings', () => {
  it('shows the deadly-genus warning and hides an edibility badge', async () => {
    const recognition: RecognitionSummaryData = {
      status: 'candidates',
      expertVerificationRequired: true,
      warningReasons: ['dangerous_genus'],
      top3: [
        {
          id: 'amanita_phalloides',
          namePl: DEADLY_NAME,
          nameLatin: 'Amanita phalloides',
          confidence: 0.41,
          rank: 1,
        },
      ],
    };

    const modal = await renderSummary(recognition, 'modal');
    expect(modal.getByTestId('dangerous-genus-warning').props.children).toMatch(GENUS_WARNING);
    expect(modal.getByTestId('expert-verification-banner')).toBeTruthy();
    expect(modal.getByText(EXPERT_BODY)).toBeTruthy();
    expect(modal.getByTestId('not-edibility-verdict').props.children).toBe(NOT_EDIBILITY);
    expect(modal.getByText(/Muchomor sromotnikowy \(zielonawy\)/)).toBeTruthy();
    expect(modal.queryByTestId('low-confidence-warning')).toBeNull();
    expectNoEdibilityBadge(modal.queryByText);

    const journal = await renderSummary(recognition, 'journal');
    expect(journal.getByText(GENUS_WARNING)).toBeTruthy();
    expect(journal.getByTestId(`journal-expert-${ENTRY_ID}`).props.children).toMatch(EXPERT_BODY);
    expect(journal.getByTestId(`journal-not-edible-${ENTRY_ID}`).props.children).toBe(NOT_EDIBILITY);
    expect(journal.getByText(/Muchomor sromotnikowy \(zielonawy\)/)).toBeTruthy();
    expect(journal.queryByTestId(`journal-low-confidence-${ENTRY_ID}`)).toBeNull();
    expectNoEdibilityBadge(journal.queryByText);
  });

  it('shows the expert warning for a toxic species without the deadly-genus line', async () => {
    const recognition: RecognitionSummaryData = {
      status: 'candidates',
      expertVerificationRequired: true,
      warningReasons: ['low_confidence'],
      top3: [
        {
          id: 'hypholoma_fasciculare',
          namePl: TOXIC_NAME,
          nameLatin: 'Hypholoma fasciculare',
          confidence: 0.57,
          rank: 1,
        },
      ],
    };

    const modal = await renderSummary(recognition, 'modal');
    expect(modal.getByTestId('low-confidence-warning')).toBeTruthy();
    expect(modal.getByTestId('expert-verification-banner')).toBeTruthy();
    expect(modal.getByText(EXPERT_BODY)).toBeTruthy();
    expect(modal.queryByTestId('dangerous-genus-warning')).toBeNull();
    expect(modal.queryByText(GENUS_WARNING)).toBeNull();
    expect(modal.getByText(/Maślanka wiązkowa/)).toBeTruthy();
    expectNoEdibilityBadge(modal.queryByText);

    const journal = await renderSummary(recognition, 'journal');
    expect(journal.getByTestId(`journal-low-confidence-${ENTRY_ID}`)).toBeTruthy();
    expect(journal.getByTestId(`journal-expert-${ENTRY_ID}`)).toBeTruthy();
    expect(journal.queryByText(GENUS_WARNING)).toBeNull();
    expect(journal.getByText(/Maślanka wiązkowa/)).toBeTruthy();
    expectNoEdibilityBadge(journal.queryByText);
  });

  it('treats unknown_mushroom as unnamed and possibly deadly', async () => {
    const recognition: RecognitionSummaryData = { status: 'rejected', reason: 'unknown_mushroom' };

    const modal = await renderSummary(recognition, 'modal');
    expect(modal.getByTestId('recognition-unknown-body').props.children).toBe(UNKNOWN_BODY);
    expect(modal.getByTestId('recognition-unknown-deadly').props.children).toBe(UNKNOWN_DEADLY);
    expect(modal.getByTestId('recognition-unknown-verify').props.children).toMatch(VERIFY);
    expect(modal.queryByText(DEADLY_NAME)).toBeNull();
    expect(modal.queryByText(/%/)).toBeNull();
    expectNoEdibilityBadge(modal.queryByText);

    const journal = await renderSummary(recognition, 'journal');
    expect(journal.getByTestId(`journal-title-${ENTRY_ID}`).props.children).toBe('Nieznany grzyb');
    expect(journal.getByTestId(`journal-unknown-${ENTRY_ID}`).props.children).toBe(UNKNOWN_BODY);
    expect(journal.getByTestId(`journal-unknown-deadly-${ENTRY_ID}`).props.children).toBe(UNKNOWN_DEADLY);
    expect(journal.getByTestId(`journal-unknown-verify-${ENTRY_ID}`).props.children).toMatch(VERIFY);
    expect(journal.queryByText(DEADLY_NAME)).toBeNull();
    expectNoEdibilityBadge(journal.queryByText);
  });

  it('names no species for not_a_mushroom and skips the deadly line', async () => {
    const recognition: RecognitionSummaryData = { status: 'rejected', reason: 'not_a_mushroom' };

    const modal = await renderSummary(recognition, 'modal');
    expect(modal.getByTestId('recognition-rejected-body').props.children).toMatch(NOT_MUSHROOM_BODY);
    expect(modal.getByText(VERIFY)).toBeTruthy();
    expect(modal.queryByText(UNKNOWN_DEADLY)).toBeNull();
    expect(modal.queryByTestId('expert-verification-banner')).toBeNull();
    expect(modal.queryByText(DEADLY_NAME)).toBeNull();
    expectNoEdibilityBadge(modal.queryByText);

    const journal = await renderSummary(recognition, 'journal');
    expect(journal.getByTestId(`journal-title-${ENTRY_ID}`).props.children).toBe('To nie jest grzyb z modelu');
    expect(journal.getByText(NOT_MUSHROOM_BODY)).toBeTruthy();
    expect(journal.queryByText(UNKNOWN_DEADLY)).toBeNull();
    expect(journal.queryByText(DEADLY_NAME)).toBeNull();
    expectNoEdibilityBadge(journal.queryByText);
  });

  it('keeps a legacy journal row unnamed and uneaten, and renders nothing in the modal', async () => {
    const recognition: RecognitionSummaryData = {
      status: 'legacy',
      speciesNamePl: 'Borowik szlachetny',
      speciesNameLatin: 'Boletus edulis',
    };

    const modal = await renderSummary(recognition, 'modal');
    expect(modal.queryByText('Borowik szlachetny')).toBeNull();
    expect(modal.queryByText(/Starszy wpis/)).toBeNull();
    expectNoEdibilityBadge(modal.queryByText);

    const journal = await renderSummary(recognition, 'journal');
    expect(journal.getByTestId(`journal-legacy-${ENTRY_ID}`).props.children).toMatch(/starszej wersji/);
    expect(journal.getByTestId(`journal-title-${ENTRY_ID}`).props.children).toBe('Starszy wpis');
    expect(journal.getByTestId(`journal-legacy-name-${ENTRY_ID}`).props.children).toEqual([
      'Zachowana nazwa',
      ': ',
      'Borowik szlachetny',
      ' (Boletus edulis)',
    ]);
    expect(journal.getByTestId(`journal-legacy-edibility-${ENTRY_ID}`).props.children).toMatch(/Nie jedz grzyba/);
    expect(journal.queryByText('JADALNY')).toBeNull();
    expectNoEdibilityBadge(journal.queryByText);
  });

  it('says recognition is unavailable and names no species', async () => {
    const recognition: RecognitionSummaryData = { status: 'unavailable' };

    const modal = await renderSummary(recognition, 'modal');
    expect(modal.getByTestId('recognition-unavailable-body').props.children).toMatch(/Nie ma modelu/);
    expect(modal.getByText(/To nie jest wynik rozpoznawania/)).toBeTruthy();
    expect(modal.queryByText(DEADLY_NAME)).toBeNull();
    expect(modal.queryByText(/%/)).toBeNull();
    expectNoEdibilityBadge(modal.queryByText);

    const journal = await renderSummary(recognition, 'journal');
    expect(journal.getByTestId(`journal-title-${ENTRY_ID}`).props.children).toBe('Rozpoznawanie niedostępne');
    expect(journal.getByText(/To nie jest wynik rozpoznawania/)).toBeTruthy();
    expect(journal.queryByText(DEADLY_NAME)).toBeNull();
    expectNoEdibilityBadge(journal.queryByText);
  });
});
