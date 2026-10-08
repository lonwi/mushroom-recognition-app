import fs from 'fs';
import path from 'path';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';

const expectedTag: Record<string, string> = {
  EDIBLE: 'edible',
  INEDIBLE: 'other',
  POISONOUS: 'toxic',
  DEADLY_POISONOUS: 'toxic',
};

describe('safety_tag', () => {
  it('matches atlas edibility for every species that is also a model class', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../assets/models/labels.json'), 'utf8'),
    ) as { classes: Array<{ id: string; safety_tag?: string }> };
    const tags = new Map(manifest.classes.map((item) => [item.id, item.safety_tag]));
    let checked = 0;
    for (const mushroom of MUSHROOMS_DATABASE) {
      if (!tags.has(mushroom.id)) {
        continue;
      }
      checked += 1;
      expect(tags.get(mushroom.id)).toBe(expectedTag[mushroom.status]);
    }
    expect(checked).toBe(37);
    for (const id of ['amanita_rubescens', 'amanita_citrina', 'cortinarius_orellanus', 'cortinarius_rubellus']) {
      expect(MUSHROOMS_DATABASE.some((mushroom) => mushroom.id === id)).toBe(true);
      expect(tags.has(id)).toBe(true);
    }
  });
});
