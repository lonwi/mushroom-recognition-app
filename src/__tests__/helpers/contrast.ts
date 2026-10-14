import { StyleSheet } from 'react-native';

type StyledNode = {
  parent?: unknown;
  props?: { style?: unknown };
};

/** WCAG 2 contrast ratio from sRGB hex colours. */
export function contrastRatio(foreground: string, background: string): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string) => {
    const parsed = Number.parseInt(hex.slice(1), 16);
    const red = channel((parsed >> 16) & 255);
    const green = channel((parsed >> 8) & 255);
    const blue = channel(parsed & 255);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/** First solid background walking up from a rendered text node. Translucent rgba fills are skipped. */
export function nearestBackground(node: StyledNode): string {
  let current: StyledNode | null = node;
  while (current) {
    const style = StyleSheet.flatten(current.props?.style) as { backgroundColor?: unknown } | undefined;
    if (typeof style?.backgroundColor === 'string' && !style.backgroundColor.startsWith('rgba')) {
      return style.backgroundColor;
    }
    current = (current.parent as StyledNode | null) ?? null;
  }
  throw new Error('No background colour behind this text');
}
