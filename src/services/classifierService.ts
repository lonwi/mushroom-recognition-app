/**
 * On-device species recognition is not available.
 *
 * assets/models/labels.json is a class list, not a network, and nothing in
 * this app reads image pixels with it. There is no mushrooms_model.tflite
 * binary, and react-native-fast-tflite is not installed. Until a later change
 * loads a real model, this service must not invent a species, a confidence
 * score, or an inference time from a photo URI.
 */

export const MODEL_MISSING_REASON = 'model_missing' as const;

export interface ClassificationResult {
  status: 'unavailable';
  reason: typeof MODEL_MISSING_REASON;
  processedImageUri: string;
}

class MushroomClassifierService {
  /**
   * False until a model that consumes image pixels is actually wired in.
   * A labels file does not count.
   */
  public isRecognitionAvailable(): boolean {
    return false;
  }

  public async classifyImage(imageUri: string): Promise<ClassificationResult> {
    return {
      status: 'unavailable',
      reason: MODEL_MISSING_REASON,
      processedImageUri: imageUri,
    };
  }
}

export const classifierService = new MushroomClassifierService();
