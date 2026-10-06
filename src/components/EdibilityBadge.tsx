import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EdibilityStatus } from '../types/mushroom';
import { useLanguage } from '../contexts/LanguageContext';
import { pl } from '../i18n/pl';

interface Props {
  status: EdibilityStatus;
  size?: 'small' | 'medium' | 'large';
}

export const INCOMPLETE_CARD_LABEL = pl.edibility.incomplete;
export const MISSING_CARD_LABEL = pl.edibility.missing;

interface IncompleteProps {
  size?: 'small' | 'medium' | 'large';
  testID?: string;
}

export const IncompleteCardBadge: React.FC<IncompleteProps> = ({ size = 'medium', testID }) => {
  const { t } = useLanguage();
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        styles.incompleteBadge,
        {
          paddingVertical: isSmall ? 2 : isLarge ? 8 : 4,
          paddingHorizontal: isSmall ? 6 : isLarge ? 14 : 10,
        },
      ]}
    >
      <Text
        style={[
          styles.icon,
          styles.incompleteText,
          {
            fontSize: isSmall ? 10 : isLarge ? 16 : 12,
            marginRight: 4,
          },
        ]}
      >
        ◇
      </Text>
      <Text
        style={[
          styles.text,
          styles.incompleteText,
          {
            fontSize: isSmall ? 10 : isLarge ? 14 : 12,
            fontWeight: '700',
          },
        ]}
      >
        {t('edibility.incomplete')}
      </Text>
    </View>
  );
};

/** A named look-alike with no atlas card. Not an edibility verdict. */
export const MissingCardBadge: React.FC<IncompleteProps> = ({ size = 'medium', testID }) => {
  const { t } = useLanguage();
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        styles.missingBadge,
        {
          paddingVertical: isSmall ? 2 : isLarge ? 8 : 4,
          paddingHorizontal: isSmall ? 6 : isLarge ? 14 : 10,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          styles.missingText,
          {
            fontSize: isSmall ? 10 : isLarge ? 14 : 12,
            fontWeight: '700',
          },
        ]}
      >
        {t('edibility.missing')}
      </Text>
    </View>
  );
};

interface SpeciesStatusProps {
  status: EdibilityStatus;
  incompleteCard?: boolean;
  size?: 'small' | 'medium' | 'large';
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
  const getBadgeConfig = () => {
    switch (status) {
      case 'EDIBLE':
        return {
          label: t('edibility.edible'),
          bgColor: '#E8F5E9',
          textColor: '#2E7D32',
          borderColor: '#81C784',
          icon: '✓',
        };
      case 'INEDIBLE':
        return {
          label: t('edibility.inedible'),
          bgColor: '#FFF3E0',
          textColor: '#E65100',
          borderColor: '#FFB74D',
          icon: '⚠',
        };
      case 'POISONOUS':
        return {
          label: t('edibility.poisonous'),
          bgColor: '#FFEBEE',
          textColor: '#C62828',
          borderColor: '#EF5350',
          icon: '✕',
        };
      case 'DEADLY_POISONOUS':
        return {
          label: t('edibility.deadly'),
          bgColor: '#3E000C',
          textColor: '#FF4560',
          borderColor: '#FF1744',
          icon: '☠',
        };
    }
  };

  const config = getBadgeConfig();

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          paddingVertical: isSmall ? 2 : isLarge ? 8 : 4,
          paddingHorizontal: isSmall ? 6 : isLarge ? 14 : 10,
        },
      ]}
    >
      <Text
        style={[
          styles.icon,
          {
            color: config.textColor,
            fontSize: isSmall ? 10 : isLarge ? 16 : 12,
            marginRight: 4,
          },
        ]}
      >
        {config.icon}
      </Text>
      <Text
        style={[
          styles.text,
          {
            color: config.textColor,
            fontSize: isSmall ? 10 : isLarge ? 14 : 12,
            fontWeight: '700',
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    fontWeight: 'bold',
  },
  text: {
    letterSpacing: 0.5,
  },
  incompleteBadge: {
    backgroundColor: '#FFF7ED',
    borderColor: '#C2410C',
  },
  incompleteText: {
    color: '#9A3412',
  },
  missingBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#64748B',
  },
  missingText: {
    color: '#334155',
  },
});
