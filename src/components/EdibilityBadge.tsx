import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EdibilityStatus } from '../types/mushroom';
import { useLanguage } from '../contexts/LanguageContext';
import { pl } from '../i18n/pl';
import { EDIBILITY_BADGE } from '../presentation/speciesMeta';
import { colors, edibilityColors, radius, spacing, typography } from '../theme/tokens';

interface Props {
  status: EdibilityStatus;
  size?: BadgeSize;
}

export const INCOMPLETE_CARD_LABEL = pl.edibility.incomplete;
export const MISSING_CARD_LABEL = pl.edibility.missing;

type BadgeSize = 'small' | 'medium' | 'large';

const BADGE_SIZE: Record<
  BadgeSize,
  { paddingVertical: number; paddingHorizontal: number; iconSize: number; labelSize: number }
> = {
  small: { paddingVertical: spacing.xxs, paddingHorizontal: 6, iconSize: typography.caption, labelSize: typography.caption },
  medium: { paddingVertical: spacing.xs, paddingHorizontal: 10, iconSize: typography.small, labelSize: typography.small },
  large: { paddingVertical: spacing.sm, paddingHorizontal: 14, iconSize: typography.title, labelSize: typography.body },
};

interface ChipProps {
  label: string;
  icon?: string;
  backgroundColor: string;
  borderColor: string;
  color: string;
  size: BadgeSize;
  testID?: string;
}

function StatusChip({ label, icon, backgroundColor, borderColor, color, size, testID }: ChipProps) {
  const metrics = BADGE_SIZE[size];
  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        {
          backgroundColor,
          borderColor,
          paddingVertical: metrics.paddingVertical,
          paddingHorizontal: metrics.paddingHorizontal,
        },
      ]}
    >
      {icon ? (
        <Text style={[styles.icon, { color, fontSize: metrics.iconSize, marginRight: spacing.xs }]}>{icon}</Text>
      ) : null}
      <Text style={[styles.text, { color, fontSize: metrics.labelSize }]}>{label}</Text>
    </View>
  );
}

interface IncompleteProps {
  size?: BadgeSize;
  testID?: string;
}

export const IncompleteCardBadge: React.FC<IncompleteProps> = ({ size = 'medium', testID }) => {
  const { t } = useLanguage();
  return (
    <StatusChip
      testID={testID}
      size={size}
      icon="◇"
      label={t('edibility.incomplete')}
      backgroundColor={colors.orange50}
      borderColor={colors.orange700}
      color={colors.orange800}
    />
  );
};

/** A named look-alike with no atlas card. Not an edibility verdict. */
export const MissingCardBadge: React.FC<IncompleteProps> = ({ size = 'medium', testID }) => {
  const { t } = useLanguage();
  return (
    <StatusChip
      testID={testID}
      size={size}
      label={t('edibility.missing')}
      backgroundColor={colors.surfaceVariant}
      borderColor={colors.slate500}
      color={colors.slate700}
    />
  );
};

interface SpeciesStatusProps {
  status: EdibilityStatus;
  incompleteCard?: boolean;
  size?: BadgeSize;
  testID?: string;
}

/** Keeps the stored edibility status, but does not lead an unfinished card with the green edible badge. */
export const SpeciesStatusBadge: React.FC<SpeciesStatusProps> = ({
  status,
  incompleteCard = false,
  size = 'medium',
  testID,
}) => {
  if (incompleteCard && status === 'EDIBLE') {
    return <IncompleteCardBadge size={size} testID={testID} />;
  }
  return <EdibilityBadge status={status} size={size} />;
};

export const EdibilityBadge: React.FC<Props> = ({ status, size = 'medium' }) => {
  const { t } = useLanguage();
  const copy = EDIBILITY_BADGE[status];
  const tone = edibilityColors[status];
  return (
    <StatusChip
      size={size}
      icon={copy.icon}
      label={t(copy.labelKey)}
      backgroundColor={tone.background}
      borderColor={tone.border}
      color={tone.text}
    />
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    fontWeight: 'bold',
  },
  text: {
    letterSpacing: 0.5,
    fontWeight: '700',
  },
});
