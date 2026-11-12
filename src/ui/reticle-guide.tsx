import { View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';

import type { ThemeName } from '@/core/theme';

export type ScannerStep = 1 | 2 | 3;

export interface ReticleGuideProps {
  step: ScannerStep;
  theme?: ThemeName;
  size?: number;
  accessibilityLabel?: string;
}

/**
 * Celownik fotograficzny do wieloujęciowego skanera terenowego (Pileus v1.0).
 * Dynamicznie zmienia szablon w zależności od kroku:
 *  - Krok 1: Kapelusz z góry (owal, koncentryczny szczyt, krzyżyk centrujący)
 *  - Krok 2: Spód kapelusza / hymenofor (promieniste blaszki, pierścienie)
 *  - Krok 3: Trzon z pierścieniem i podstawą (kontur trzonu, pierścień, pochwa/bulwa)
 */
export function ReticleGuide({
  step,
  theme = 'light',
  size = 260,
  accessibilityLabel,
}: ReticleGuideProps) {
  const isHc = theme === 'highContrast';
  const bracketStroke = '#FFFFFF';
  const guideStroke = isHc ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)';
  const subtleStroke = isHc ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)';

  return (
    <View
      testID={`reticle-guide-step-${step}`}
      className="items-center justify-center pointer-events-none"
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `Celownik skanera - krok ${step}`}
    >
      <Svg width={size} height={size} viewBox="0 0 260 260">
        {/* Narożne ramki celownika wizjera */}
        <Path
          d="M 15 45 L 15 15 L 45 15"
          fill="none"
          stroke={bracketStroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M 215 15 L 245 15 L 245 45"
          fill="none"
          stroke={bracketStroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M 15 215 L 15 245 L 45 245"
          fill="none"
          stroke={bracketStroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M 215 245 L 245 245 L 245 215"
          fill="none"
          stroke={bracketStroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Krzyżyk centrujący */}
        <Line x1={120} y1={130} x2={140} y2={130} stroke={subtleStroke} strokeWidth={1} />
        <Line x1={130} y1={120} x2={130} y2={140} stroke={subtleStroke} strokeWidth={1} />

        {/* Krok 1: Kapelusz z góry */}
        {step === 1 && (
          <>
            <Ellipse
              cx={130}
              cy={130}
              rx={85}
              ry={75}
              fill="none"
              stroke={guideStroke}
              strokeWidth={2}
              strokeDasharray="6, 6"
            />
            <Ellipse
              cx={130}
              cy={130}
              rx={45}
              ry={38}
              fill="none"
              stroke={subtleStroke}
              strokeWidth={1.5}
              strokeDasharray="3, 3"
            />
            <Circle cx={130} cy={130} r={4} fill={guideStroke} />
          </>
        )}

        {/* Krok 2: Spód (hymenofor promienity - blaszki / rurki) */}
        {step === 2 && (
          <>
            <Circle
              cx={130}
              cy={130}
              r={92}
              fill="none"
              stroke={guideStroke}
              strokeWidth={2}
              strokeDasharray="5, 5"
            />
            <Circle
              cx={130}
              cy={130}
              r={60}
              fill="none"
              stroke={subtleStroke}
              strokeWidth={1}
              strokeDasharray="4, 4"
            />
            <Circle cx={130} cy={130} r={22} fill="none" stroke={guideStroke} strokeWidth={2} />
            {/* 12 radialnych linii imitujących blaszki */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = 130 + Math.cos(rad) * 24;
              const y1 = 130 + Math.sin(rad) * 24;
              const x2 = 130 + Math.cos(rad) * 90;
              const y2 = 130 + Math.sin(rad) * 90;
              return (
                <Line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={subtleStroke}
                  strokeWidth={1}
                  strokeDasharray="3, 3"
                />
              );
            })}
          </>
        )}

        {/* Krok 3: Trzon z pierścieniem i podstawą */}
        {step === 3 && (
          <>
            {/* Zarys kapelusza u góry */}
            <Path
              d="M 80 55 Q 130 38 180 55"
              fill="none"
              stroke={subtleStroke}
              strokeWidth={1.5}
              strokeDasharray="4, 4"
            />
            {/* Trzon */}
            <Path
              d="M 116 55 C 116 100 110 160 102 200"
              fill="none"
              stroke={guideStroke}
              strokeWidth={2}
              strokeDasharray="5, 5"
            />
            <Path
              d="M 144 55 C 144 100 148 160 158 200"
              fill="none"
              stroke={guideStroke}
              strokeWidth={2}
              strokeDasharray="5, 5"
            />
            {/* Pierścień na trzonie */}
            <Path
              d="M 106 114 Q 130 122 154 114 Q 130 106 106 114"
              fill="none"
              stroke={guideStroke}
              strokeWidth={2}
            />
            {/* Podstawa trzonu (bulwa / pochwa) */}
            <Path
              d="M 102 200 C 88 220 172 220 158 200"
              fill="none"
              stroke={guideStroke}
              strokeWidth={2}
            />
            {/* Poziom gruntu */}
            <Line
              x1={75}
              y1={224}
              x2={185}
              y2={224}
              stroke={subtleStroke}
              strokeWidth={1.5}
              strokeDasharray="4, 4"
            />
          </>
        )}
      </Svg>
    </View>
  );
}
