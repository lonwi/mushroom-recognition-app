export type AtlasName = {
  namePl?: string;
  nameEn?: string;
  nameLatin?: string;
};

function trimmed(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * Polish or English atlas name, otherwise the Latin name.
 * A blank string means the chip must not be rendered.
 */
export function atlasExampleLabel(species: AtlasName, language: 'pl' | 'en'): string {
  const local = language === 'en' ? species.nameEn : species.namePl;
  return trimmed(local) || trimmed(species.nameLatin);
}

export function visibleAtlasExamples<T extends { id: string }>(
  examples: readonly T[],
  language: 'pl' | 'en',
  speciesFor: (id: string) => AtlasName | undefined,
): Array<T & { label: string }> {
  const chips: Array<T & { label: string }> = [];
  for (const example of examples) {
    const species = speciesFor(example.id);
    if (!species) continue;
    const label = atlasExampleLabel(species, language);
    if (!label) continue;
    chips.push({ ...example, label });
  }
  return chips;
}
