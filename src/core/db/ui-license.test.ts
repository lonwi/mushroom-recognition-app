import { uiLicense } from '@/core/db/ui-license';

test('keeps only cc0 and cc by', () => {
  expect(uiLicense('CC0')).toBe('cc0');
  expect(uiLicense('CC BY')).toBe('cc-by');
  expect(uiLicense('CC BY 4.0')).toBe('cc-by');
  expect(uiLicense('cc_by')).toBe('cc-by');
  expect(uiLicense('CC BY-NC')).toBeNull();
  expect(uiLicense('CC BY-SA')).toBeNull();
  expect(uiLicense('pd-self')).toBeNull();
  expect(uiLicense('CC BY-ND')).toBeNull();
});
