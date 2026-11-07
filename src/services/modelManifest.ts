import manifestJson from '../../assets/models/labels.json';

interface ModelClass {
  index: number;
  id: string;
  name: string;
  name_latin: string;
  genus: string;
}

interface OodConfig {
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

interface DelegateReleaseEntry {
  passed: boolean;
  reason?: string;
  platform?: string;
  measured_on?: string;
  model_sha256?: string;
  sample_sha256?: string;
  top1_agreement?: number;
  high_risk_top1_agreement?: number;
  decision_agreement?: number;
  high_risk_decision_agreement?: number;
  decision_fields?: string[];
  max_energy_difference?: number;
  images?: number;
  high_risk_images?: number;
}

export interface ModelManifest {
  model_packaged: boolean;
  recognition_available: boolean;
  dangerous_genera: string[];
  /** 2nd/3rd-place dangerous genera warn only at or above this probability. Rank 1 always warns. */
  dangerous_genus_min_probability?: number;
  /** sha256 of the packaged .tflite. Null until export installs a model. */
  model_sha256?: string | null;
  /** sha256 of the fixed val+test delegate sample. Null until a device report is scored. */
  delegate_sample_sha256?: string | null;
  delegate_release?: {
    'android-gpu'?: DelegateReleaseEntry;
    'core-ml'?: DelegateReleaseEntry;
  };
  ood: OodConfig;
  classes: ModelClass[];
  input: {
    size: number;
    formula: string;
  };
}

export const modelManifest = manifestJson as ModelManifest;
