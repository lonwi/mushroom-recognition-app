import { parseCsv } from '@/core/db/csv-table';
import { pickUiPhotos } from '@/core/db/pick-ui-photos';

test('parses a quoted comma', () => {
  const rows = parseCsv('class,uwagi\namanita,"SPORNY: a, b"\n');
  expect(rows).toEqual([{ class: 'amanita', uwagi: 'SPORNY: a, b' }]);
});

test('picks three ui-safe photos from different observations', () => {
  const row = (id: string, observation: string, license: string): Record<string, string> => ({
    image_url: `https://example.test/${id}.jpg`,
    author: 'Autor',
    license,
    source_url: `https://example.test/obs/${observation}`,
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    inat_photo_id: id,
    inat_observation_id: observation,
  });
  const picked = pickUiPhotos([
    row('1', '1', 'CC BY-NC'),
    row('2', '9', 'CC BY'),
    row('3', '9', 'CC0'),
    row('4', '8', 'CC BY'),
    row('5', '7', 'pd-self'),
  ]);
  expect(picked.map((photo) => photo.photoId)).toEqual(['3', '4', '2']);
  expect(picked.every((photo) => photo.license === 'cc0' || photo.license === 'cc-by')).toBe(true);
});
