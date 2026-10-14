import { atlasExampleLabel, visibleAtlasExamples } from '../utils/atlasExampleLabel';

describe('atlas example chip labels', () => {
  it('uses the language name and falls back to Latin when that name is missing', () => {
    expect(
      atlasExampleLabel(
        { namePl: 'Prawdziwki', nameEn: 'Penny bun group', nameLatin: 'Boletus edulis' },
        'pl',
      ),
    ).toBe('Prawdziwki');
    expect(
      atlasExampleLabel({ namePl: 'Muchomor sromotnikowy', nameLatin: 'Amanita phalloides' }, 'en'),
    ).toBe('Amanita phalloides');
    expect(
      atlasExampleLabel({ namePl: '   ', nameEn: ' ', nameLatin: '  Cantharellus cibarius  ' }, 'pl'),
    ).toBe('Cantharellus cibarius');
    expect(atlasExampleLabel({ namePl: ' ', nameEn: '', nameLatin: ' \n ' }, 'en')).toBe('');
  });

  it('omits an example whose atlas entry has no name', () => {
    const chips = visibleAtlasExamples(
      [{ id: 'blank' }, { id: 'latin-only' }, { id: 'missing' }],
      'pl',
      (id) => {
        if (id === 'blank') return { namePl: ' ', nameLatin: ' ' };
        if (id === 'latin-only') return { namePl: '', nameLatin: 'Macrolepiota procera' };
        return undefined;
      },
    );

    expect(chips).toEqual([{ id: 'latin-only', label: 'Macrolepiota procera' }]);
    expect(chips.every((chip) => chip.label.trim().length > 0)).toBe(true);
  });
});
