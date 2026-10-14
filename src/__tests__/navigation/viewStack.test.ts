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

  it('pops species detail back to the atlas and then exits', () => {
    const detail = openSpecies(selectTab(root, 'JOURNAL'), 'boletus_edulis');
    expect(detail).toEqual({ tab: 'ATLAS', pushed: [{ name: 'species', speciesId: 'boletus_edulis' }] });
    expect(highlightedTab(detail)).toBe('ATLAS');
    expect(visibleRoute(detail)).toEqual({ kind: 'species', speciesId: 'boletus_edulis' });

    const atlas = applyHardwareBack(detail);
    expect(atlas).toEqual({ handled: true, stack: { tab: 'ATLAS', pushed: [] } });
    if (!atlas.handled) return;
    expect(applyHardwareBack(atlas.stack)).toEqual({ handled: false });
  });

  it('replaces a look-alike instead of stacking another species', () => {
    const detail = openSpecies(root, 'macrolepiota_procera');
    const twin = openSpecies(detail, 'amanita_phalloides');
    expect(twin.pushed).toEqual([{ name: 'species', speciesId: 'amanita_phalloides' }]);
    const back = applyHardwareBack(twin);
    expect(back.handled).toBe(true);
    if (!back.handled) return;
    expect(back.stack.pushed).toEqual([]);
    expect(back.stack.tab).toBe('ATLAS');
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

    const toAtlas = applyHardwareBack(toDetail.stack);
    expect(toAtlas.handled).toBe(true);
    if (!toAtlas.handled) return;
    expect(visibleRoute(toAtlas.stack)).toEqual({ kind: 'tab', tab: 'ATLAS' });
    expect(applyHardwareBack(toAtlas.stack).handled).toBe(false);
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
