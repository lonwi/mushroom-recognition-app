import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MushroomSpecies } from '../../types/mushroom';
import { hasFatalLookAlikeRisk } from '../../data/mushrooms';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/tokens';

const ENGLISH_POISONING_KEYS: Record<string, string> = {
  amanita_muscaria: 'cards.flyAgaricPoisoning',
  amanita_pantherina: 'cards.pantherPoisoning',
};

function EnglishSafetyNote({ speciesId }: { speciesId: string }) {
  const { language, t } = useLanguage();
  if (language !== 'en') {
    return null;
  }
  const poisoningKey = ENGLISH_POISONING_KEYS[speciesId];
  const galerina = speciesId === 'galerina_marginata';
  if (!poisoningKey && !galerina) {
    return null;
  }
  return (
    <>
      {poisoningKey ? (
        <Text testID="species-poisoning-note" style={styles.warningText}>
          {t('cards.poisoningNoteTitle')} {t(poisoningKey)} {t('cards.poisoningFirstAid')}
        </Text>
      ) : null}
      {galerina ? (
        <Text testID="species-galerina-lookalike-note" style={styles.warningText}>
          {t('cards.galerinaLookalikeWarning')}
        </Text>
      ) : null}
    </>
  );
}

interface SpeciesSafetyBannersProps {
  species: MushroomSpecies;
}

export const SpeciesSafetyBanners: React.FC<SpeciesSafetyBannersProps> = ({ species }) => {
  const { t, language } = useLanguage();
  const fatalLookAlike = hasFatalLookAlikeRisk(species);

  return (
    <>
      {language === 'en' ? (
        <Text style={styles.sourceLanguageNote} testID="species-source-language-note">
          {t('cards.sourceLanguageNote')}
        </Text>
      ) : null}

      {fatalLookAlike ? (
        <View style={styles.fatalBanner} testID="fatal-lookalike-banner">
          <Text style={styles.fatalBannerTitle}>{t('cardWarnings.fatalBannerTitle')}</Text>
          <Text style={styles.fatalBannerBody}>{t('cardWarnings.fatalBannerBody')}</Text>
        </View>
      ) : null}

      {species.id === 'morchella_esculenta' ? (
        <View style={styles.morelBanner} testID="morel-protection-notice">
          <Text style={styles.morelBannerTitle}>{t('cards.morelProtectionTitle')}</Text>
          <Text style={styles.morelBannerBody}>{t('cards.morelProtectionBody')}</Text>
        </View>
      ) : null}

      {species.warningNotes ? (
        <View style={styles.warningBox} testID="species-warning-notes">
          <Feather name="info" size={18} color={colors.amber700} style={styles.warningIcon} />
          <View style={styles.warningCopy}>
            <Text style={styles.warningText}>{species.warningNotes}</Text>
            <EnglishSafetyNote speciesId={species.id} />
          </View>
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  sourceLanguageNote: {
    color: colors.blueInk,
    backgroundColor: colors.blue50,
    borderColor: colors.blue300,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 16,
  },
  fatalBanner: {
    backgroundColor: colors.red50,
    borderWidth: 2,
    borderColor: colors.red600,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  fatalBannerTitle: {
    color: colors.red800,
    fontSize: 16,
    fontWeight: '800',
  },
  fatalBannerBody: {
    color: colors.red900,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    fontWeight: '600',
  },
  morelBanner: {
    marginBottom: 16,
    backgroundColor: colors.amber50,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  morelBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.amber800,
    marginBottom: 6,
  },
  morelBannerBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.amber900,
  },
  warningBox: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: colors.amber50,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  warningCopy: {
    flex: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.amber800,
    fontWeight: '600',
    marginLeft: 10,
    lineHeight: 20,
  },
  warningIcon: {
    marginTop: 2,
  },
});
