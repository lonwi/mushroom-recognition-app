import { AppText } from '@/ui/text';
import { fontFamily, typography } from '@/ui/tokens';

export interface LatinBinomialProps {
  name: string;
  authority?: string;
  className?: string;
}

/**
 * Autorski atom LatinBinomial (Pileus v1.0).
 * Prezentuje binominalną nazwę łacińską w kursywie (Plus Jakarta Sans Semibold).
 * Opcjonalna autorstwo (authority) wyświetlane bez kursywy.
 */
export function LatinBinomial({ name, authority, className = '' }: LatinBinomialProps) {
  return (
    <AppText
      className={`text-muted ${className}`}
      style={{
        fontFamily: fontFamily.semibold,
        fontStyle: 'italic',
        fontSize: typography.speciesLatin.fontSize,
        lineHeight: typography.speciesLatin.lineHeight,
      }}
      accessibilityRole="text"
    >
      {name}
      {authority ? <AppText className="not-italic text-muted"> {authority}</AppText> : null}
    </AppText>
  );
}
