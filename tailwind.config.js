/** Kolory biorą się ze zmiennych ustawianych w runtime z `src/ui/tokens.ts`. */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        'on-accent': 'var(--color-on-accent)',
        surface: 'var(--color-surface)',
        line: 'var(--color-border)',
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        semibold: ['PlusJakartaSans_600SemiBold'],
      },
    },
  },
};
