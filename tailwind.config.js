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
        'surface-raised': 'var(--color-surface-raised)',
        line: 'var(--color-border)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        focus: 'var(--color-focus)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
      },
    },
  },
};
