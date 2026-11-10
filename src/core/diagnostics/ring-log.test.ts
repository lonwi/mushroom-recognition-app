import {
  appendDiagnosticLine,
  createDiagnosticLog,
  sanitizeDiagnosticLine,
} from '@/core/diagnostics/ring-log';

test('drops coordinates and keeps a byte ring', () => {
  expect(sanitizeDiagnosticLine('motyw: dark')).toBe('motyw: dark');
  expect(sanitizeDiagnosticLine('tu 52.2297, 21.0122')).toBe('[usunięto: współrzędne]');
  expect(sanitizeDiagnosticLine('lat: 52.2 obok')).toBe('[współrzędna] obok');
  expect(appendDiagnosticLine('a', '')).toBe('a');
  expect(appendDiagnosticLine('jeden', 'dwa', 6)).toBe('dwa');
});

test('writes through the sink', () => {
  let stored = '';
  const log = createDiagnosticLog({
    read: () => stored,
    write: (text) => {
      stored = text;
    },
  });
  log.append('pierwsza');
  log.append('druga');
  expect(log.text()).toBe('pierwsza\ndruga');
  expect(stored).toBe('pierwsza\ndruga');
});
