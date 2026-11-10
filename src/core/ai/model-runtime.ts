/**
 * Warstwa 1 z D-08: runtime zwraca logity, nigdy jadalności.
 * Prawdziwy plik `.tflite` dojdzie później. Ta warstwa jest atrapą do testów.
 */
export interface ModelRuntime {
  readonly implementation: 'fake';
  run(fixtureId: string): Promise<Float32Array>;
}
