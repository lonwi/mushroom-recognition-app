import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../..');

/** Rendered inside App's content slot. The shell already applied the insets. */
const IN_SHELL = [
  'src/screens/AtlasScreen.tsx',
  'src/screens/JournalScreen.tsx',
  'src/screens/SafetyGuideScreen.tsx',
  'src/screens/PreparationGuideScreen.tsx',
  'src/screens/SettingsScreen.tsx',
  'src/screens/SpeciesDetailScreen.tsx',
  'src/screens/ScannerScreen.tsx',
  'src/components/PhotoCredits.tsx',
];

/** Full-screen roots. A modal is outside the shell, so it owns its own insets. */
const OWNS_INSETS = [
  'App.tsx',
  'src/components/ResultModal.tsx',
  'src/components/SafetyDisclaimerModal.tsx',
];

function source(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('safe area insets', () => {
  it('applies each inset once: shell and full-screen modals only', () => {
    for (const file of IN_SHELL) {
      expect(source(file)).not.toContain('SafeAreaView');
    }

    const shell = source('App.tsx');
    expect(shell).toContain("edges={['top', 'right', 'bottom', 'left']}");
    expect(shell.match(/<SafeAreaView/g)).toHaveLength(1);

    for (const file of OWNS_INSETS) {
      expect(source(file)).toContain('SafeAreaView');
    }
  });
});
