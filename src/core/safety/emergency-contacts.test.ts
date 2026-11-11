import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  emergencyContactViolations,
  emergencyContacts,
  type EmergencyContact,
} from '@/core/safety/emergency-contacts';

const NUMBER = /\b(?:112|999|998|997)\b/;

test('ships no emergency number until it is verified', () => {
  expect(
    emergencyContacts.every((contact) => contact.phone === '' && contact.verified === false),
  ).toBe(true);
  expect(emergencyContactViolations()).toEqual([]);
  const unverified: EmergencyContact = {
    id: 'emergency',
    role: 'emergency',
    phone: '123456789',
    verified: false,
    sourceUrl: '',
  };
  expect(emergencyContactViolations([unverified]).length).toBeGreaterThan(0);
  expect(
    emergencyContactViolations([
      { ...unverified, verified: true, sourceUrl: 'https://example.test/zrodlo' },
    ]),
  ).toEqual([]);
});

test('published phone numbers stay in the emergency module', () => {
  const root = path.resolve(__dirname, '../../..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.ts') || full.endsWith('.tsx')) files.push(full);
    }
  };
  walk(path.join(root, 'src'));
  const allowed = path.normalize(path.join(root, 'src/core/safety/emergency-contacts.ts'));
  const offenders = files.filter((file) => {
    if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) return false;
    if (path.normalize(file) === allowed) return false;
    return NUMBER.test(readFileSync(file, 'utf8'));
  });
  expect(offenders).toEqual([]);
});
