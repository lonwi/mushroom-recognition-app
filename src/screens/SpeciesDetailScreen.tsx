import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { MushroomSpecies } from '../types/mushroom';
import { LookAlikeAlert } from '../components/LookAlikeAlert';
import { SpeciesGallery } from '../components/SpeciesGallery';
import { SulphurHoneyComparison } from '../components/SulphurHoneyComparison';
import { showsSulphurHoneyComparison } from '../data/sulphurHoneyComparison';
import { MUSHROOM_IDS } from '../data/mushrooms';
import { colors } from '../theme/tokens';
import { SpeciesHeroHeader } from '../components/species/SpeciesHeroHeader';
import { SpeciesSafetyBanners } from '../components/species/SpeciesSafetyBanners';
import { SpeciesSeasonalityCard } from '../components/species/SpeciesSeasonalityCard';
import { SpeciesMorphologyCard } from '../components/species/SpeciesMorphologyCard';
import { SpeciesSignificanceCard } from '../components/species/SpeciesSignificanceCard';

interface Props {
  species: MushroomSpecies;
  onBack: () => void;
  onOpenLookAlike?: (speciesId: string) => void;
}

export const SpeciesDetailScreen: React.FC<Props> = ({ species, onBack, onOpenLookAlike }) => {
  return (
    <View style={styles.container}>
      <SpeciesHeroHeader species={species} onBack={onBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SpeciesGallery speciesId={species.id} />

        <SpeciesSafetyBanners species={species} />

        <SpeciesSeasonalityCard species={species} />

        {showsSulphurHoneyComparison(species.id) ? <SulphurHoneyComparison /> : null}

        {/* Lookalikes Warning */}
        <View style={styles.lookAlikeContainer}>
          <LookAlikeAlert
            risks={species.confusionRisks}
            noDangerousLookAlikesSource={species.noDangerousLookAlikes?.source}
            catalogIds={MUSHROOM_IDS}
            ownStatus={species.status}
            onOpenSpecies={onOpenLookAlike}
          />
        </View>

        <SpeciesMorphologyCard species={species} />

        <SpeciesSignificanceCard species={species} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  lookAlikeContainer: {
    marginBottom: 24,
  },
});
