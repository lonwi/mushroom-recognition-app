/** Kolory biorą się ze zmiennych ustawianych w runtime z `src/ui/tokens.ts`. */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        appBg: 'var(--color-paper)',
        paperActive: 'var(--color-surface-raised)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        'on-accent': 'var(--color-on-accent)',
        primaryGreen: 'var(--color-accent)',
        primaryGreenHover: '#152E23',
        surface: 'var(--color-surface)',
        surfaceCard: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        line: 'var(--color-border)',
        border: 'var(--color-border)',
        borderSubtle: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        focus: 'var(--color-focus)',
        danger: 'var(--color-danger)',
        accentRed: 'var(--color-danger)',
        accentRedSoft: '#FDF2F2',
        softGreenBg: '#F4F7F4',
        warning: 'var(--color-warning)',
        warningAmber: '#D97706',
        warningSoft: '#FEF3C7',
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
      },
      boxShadow: {
        '2xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
};
