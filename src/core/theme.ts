export const themeNames = ['light', 'dark', 'highContrast'] as const;

export type ThemeName = (typeof themeNames)[number];
