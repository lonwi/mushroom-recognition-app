import manifestJson from '../../assets/models/labels.json';

export interface ModelClass {
  index: number;
  id: string;
  name: string;
  name_latin: string;
  genus: string;
}

export interface OodConfig {
  method: string;
  background_class_id: string;
  unknown_class_id?: string;
  temperature: number;
  energy_threshold: number | null;
  min_softmax_for_accept: number | null;
  min_top1_softmax_for_high_confidence: number | null;
  min_margin: number | null;
  calibrated: boolean;
}

export interface ModelManifest {
  model_packaged: boolean;
  recognition_available: boolean;
  dangerous_genera: string[];
  /** 2nd/3rd-place dangerous genera warn only at or above this probability. Rank 1 always warns. */
  dangerous_genus_min_probability?: number;
  ood: OodConfig;
  classes: ModelClass[];
  input: {
    size: number;
    formula: string;
  };
}

export const modelManifest = manifestJson as ModelManifest;

export const DANGEROUS_GENERA = modelManifest.dangerous_genera;
