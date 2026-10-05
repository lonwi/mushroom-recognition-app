export type EdibilityStatus = 
  | 'EDIBLE'             // Jadalny (smaczny / dopuszczony do obrotu)
  | 'INEDIBLE'           // Niejadalny (gorzki, twardy, niesmaczny, ale nietoksyczny)
  | 'POISONOUS'          // Trujący (wywołuje zaburzenia żołądkowo-jelitowe itp.)
  | 'DEADLY_POISONOUS';  // Śmiertelnie trujący (amatoksyny, orellanina, gyromitryna)

export type HymenophoreType = 
  | 'TUBES'   // Rurki ("gąbka") - np. borowiki, maślaki, podgrzybki
  | 'GILLS'   // Blaszki - np. muchomory, kanie, gołąbki, pieczarki
  | 'FOLDS'   // Listewki / fałdy - np. pieprznik jadalny (kurka)
  | 'SPINES'  // Kolce - np. sarniak, kolczak
  | 'OTHER';  // Inny (np. purchawki, smardze - fałdy główki)

export interface ConfusionRisk {
  confusedWithId: string;
  confusedWithName: string;
  confusedWithStatus: EdibilityStatus;
  keyDifferences: string[];
  fatal: boolean;
}

export interface MushroomSpecies {
  id: string;
  namePl: string;
  nameLatin: string;
  commonNicknames: string[];
  family: string;
  status: EdibilityStatus;
  /**
   * Minimal stub card. Does not change `status`. The UI must not lead with the green edible badge.
   */
  incompleteCard?: boolean;
  hymenophore: HymenophoreType;
  months: number[]; // Miesiące występowania: 1-12
  habitat: string;
  capDescription: string;
  hymenophoreDescription: string;
  stemDescription: string;
  fleshDescription: string;
  tasteAndSmell: string;
  culinaryValue: string;
  confusionRisks: ConfusionRisk[];
  warningNotes?: string;
  /**
   * Set only with a sourced statement that no dangerous look-alikes are known.
   * An empty `confusionRisks` list is not this statement and must not read as an all-clear.
   */
  noDangerousLookAlikes?: {
    source: string;
  };
}

export interface ModelPrediction {
  species: MushroomSpecies;
  confidence: number; // 0 - 100%
  rank: number;
}

export interface SightingRecord {
  id: string;
  speciesId: string;
  speciesNamePl: string;
  speciesNameLatin: string;
  photoUri: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
  notes?: string;
  confidence: number;
}
