import {
  activateShellTab,
  applyHardwareBack,
  highlightedTab,
  initialViewStack,
  openPreparation,
  openSettings,
  openSpecies,
  resetToScanner,
  selectSpecies,
  selectTab,
  shellScreen,
  visibleRoute,
} from '../../navigation/viewStack';

describe('view stack', () => {
  const root = initialViewStack();

  it('exits only from a root tab', () => {
    expect(applyHardwareBack(root)).toEqual({ handled: false });
    expect(applyHardwareBack(selectTab(root, 'ATLAS'))).toEqual({ handled: false });
    expect(applyHardwareBack(selectTab(root, 'JOURNAL'))).toEqual({ handled: false });
    expect(applyHardwareBack(selectTab(root, 'SAFETY'))).toEqual({ handled: false });
    expect(highlightedTab(root)).toBe('SCANNER');
    expect(visibleRoute(root)).toEqual({ kind: 'tab', tab: 'SCANNER' });
  });

  it('returns from a look-alike to the previous card, and from scanner or journal to that tab', () => {
    const fromScanner = openSpecies(root, 'macrolepiota_procera');
    const lookalike = openSpecies(fromScanner, 'amanita_phalloides');
    expect(lookalike).toEqual({
      tab: 'SCANNER',
      pushed: [
        { name: 'species', speciesId: 'macrolepiota_procera' },
        { name: 'species', speciesId: 'amanita_phalloides' },
      ],
    });
    expect(highlightedTab(lookalike)).toBe('SCANNER');
    expect(shellScreen(lookalike)).toBe('SCANNER');
    expect(visibleRoute(lookalike)).toEqual({ kind: 'species', speciesId: 'amanita_phalloides' });

    const previousCard = applyHardwareBack(lookalike);
    expect(previousCard).toEqual({ handled: true, stack: fromScanner });
    if (!previousCard.handled) return;
    const scanner = applyHardwareBack(previousCard.stack);
    expect(scanner).toEqual({ handled: true, stack: root });
    if (!scanner.handled) return;
    expect(applyHardwareBack(scanner.stack)).toEqual({ handled: false });

    const journal = selectTab(root, 'JOURNAL');
    const fromJournal = openSpecies(journal, 'boletus_edulis');
    expect(fromJournal.tab).toBe('JOURNAL');
    expect(highlightedTab(fromJournal)).toBe('JOURNAL');
    expect(shellScreen(fromJournal)).toBe('JOURNAL');
    const backToJournal = applyHardwareBack(fromJournal);
    expect(backToJournal).toEqual({ handled: true, stack: journal });
    if (!backToJournal.handled) return;
    expect(applyHardwareBack(backToJournal.stack)).toEqual({ handled: false });
  });

  it('truncates A → B → A back to the first card', () => {
    const cardA = openSpecies(root, 'macrolepiota_procera');
    const cardB = openSpecies(cardA, 'amanita_phalloides');
    const again = openSpecies(cardB, 'macrolepiota_procera');

    expect(again.pushed).toHaveLength(1);
    expect(again).toEqual(cardA);
    expect(visibleRoute(again)).toEqual({ kind: 'species', speciesId: 'macrolepiota_procera' });

    const source = applyHardwareBack(again);
    expect(source).toEqual({ handled: true, stack: root });
    if (!source.handled) return;
    expect(applyHardwareBack(source.stack)).toEqual({ handled: false });
  });

  it('returns from settings to the screen that opened it', () => {
    const journal = selectTab(root, 'JOURNAL');
    const settings = openSettings(journal);
    expect(visibleRoute(settings)).toEqual({ kind: 'settings' });
    expect(highlightedTab(settings)).toBeNull();
    expect(openSettings(settings)).toBe(settings);

    const back = applyHardwareBack(settings);
    expect(back).toEqual({ handled: true, stack: journal });
  });

  it('pops settings before species detail', () => {
    const detail = openSpecies(root, 'boletus_edulis');
    const settings = openSettings(detail);
    expect(settings.pushed.map((screen) => screen.name)).toEqual(['species', 'settings']);

    const toDetail = applyHardwareBack(settings);
    expect(toDetail.handled).toBe(true);
    if (!toDetail.handled) return;
    expect(visibleRoute(toDetail.stack)).toEqual({ kind: 'species', speciesId: 'boletus_edulis' });

    const toScanner = applyHardwareBack(toDetail.stack);
    expect(toScanner.handled).toBe(true);
    if (!toScanner.handled) return;
    expect(visibleRoute(toScanner.stack)).toEqual({ kind: 'tab', tab: 'SCANNER' });
    expect(applyHardwareBack(toScanner.stack).handled).toBe(false);
  });

  it('returns from the preparation guide to the safety tab', () => {
    const safety = selectTab(root, 'SAFETY');
    const preparation = openPreparation(safety);
    expect(visibleRoute(preparation)).toEqual({ kind: 'preparation' });
    expect(highlightedTab(preparation)).toBeNull();
    expect(openPreparation(preparation)).toBe(preparation);

    const back = applyHardwareBack(preparation);
    expect(back).toEqual({ handled: true, stack: safety });
    if (!back.handled) return;
    expect(applyHardwareBack(back.stack).handled).toBe(false);
  });

  it('resets the header logo to the scanner root from any screen', () => {
    const detail = openSpecies(selectTab(root, 'JOURNAL'), 'boletus_edulis');
    const settings = openSettings(detail);
    const preparation = openPreparation(selectTab(root, 'SAFETY'));

    expect(resetToScanner(settings)).toEqual(initialViewStack());
    expect(resetToScanner(preparation)).toEqual(root);
    expect(resetToScanner(detail)).toEqual(root);
    expect(resetToScanner(selectTab(root, 'ATLAS'))).toEqual(root);
    expect(resetToScanner(root)).toBe(root);
    expect(activateShellTab(selectSpecies(settings, null), 'SCANNER')).toEqual(root);
    expect(activateShellTab(selectSpecies(detail, null), 'SCANNER')).toEqual(root);

    const home = resetToScanner(settings);
    expect(shellScreen(home)).toBe('SCANNER');
    expect(highlightedTab(home)).toBe('SCANNER');
    expect(applyHardwareBack(home).handled).toBe(false);
  });

  it('clears pushed screens when a tab is selected', () => {
    const preparation = openPreparation(selectTab(root, 'SAFETY'));
    expect(selectTab(preparation, 'SCANNER')).toEqual(root);
    expect(selectTab(openSpecies(root, 'boletus_edulis'), 'ATLAS')).toEqual({
      tab: 'ATLAS',
      pushed: [],
    });
  });
});
