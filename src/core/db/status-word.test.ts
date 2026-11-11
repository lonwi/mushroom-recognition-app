import { mapStatusWord } from '@/core/db/assemble-catalog';

test('does not read niejadalny as edible and does not invent a status', () => {
  expect(mapStatusWord('niejadalny (sporny)')).toBe('INEDIBLE');
  expect(mapStatusWord('śmiertelny')).toBe('DEADLY_POISONOUS');
  expect(mapStatusWord('trujący')).toBe('POISONOUS');
  expect(mapStatusWord('jadalny')).toBe('EDIBLE');
  expect(mapStatusWord('poza modelem')).toBeNull();
});
