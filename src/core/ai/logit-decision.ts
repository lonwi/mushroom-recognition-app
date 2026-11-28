/**
 * Decyzja P2: energia, softmax(z/T) i fuzja logitów.
 * Model nie zwraca jadalności. Status to ok, unclear albo out_of_distribution.
 *
 * E(x) = −T · logsumexp(z/T). T energii to ood.energyTemperature, a gdy go nie
 * ma — calibration.temperature. Prawdopodobieństwa i wagi fuzji używają
 * calibration.temperature, a gdy go nie ma — tej samej jednej temperatury.
 * Bramka: E > próg to out_of_distribution, potem p_top1 < minTop1Prob to unclear.
 * Porównania są ostre. Fuzja: c_v = 1 − H_v/ln K, w_v = c_v/Σc (równe wagi przy
 * Σc = 0), z̄ = Σ w_v z_v. Do fuzji wchodzą tylko zdjęcia ze statusem ok.
 */

export type DecisionStatus = 'ok' | 'unclear' | 'out_of_distribution';

export type DecisionCandidate = {
  index: number;
  classId: string;
  probability: number;
  rank: number;
};

export type LogitDecision = {
  status: DecisionStatus;
  energy: number;
  pTop1: number;
  candidates: DecisionCandidate[];
};

export type FusionDecision = {
  status: DecisionStatus;
  energy: number | null;
  pTop1: number | null;
  candidates: DecisionCandidate[];
  /** Liczba zdjęć, które przeszły bramkę pojedynczego zdjęcia. */
  m: number;
};

export type GateThresholds = {
  energyThreshold: number;
  minTop1Prob: number;
};

export type TemperaturePair = {
  probability: number;
  energy: number;
};

class DecisionMathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionMathError';
  }
}

export function temperaturesFrom(source: {
  calibration?: { temperature?: number };
  ood?: { energyTemperature?: number };
}): TemperaturePair {
  const calibrated = source.calibration?.temperature;
  const energy = source.ood?.energyTemperature;
  const probability = calibrated ?? energy;
  const energyTemperature = energy ?? calibrated;
  if (
    probability === undefined ||
    energyTemperature === undefined ||
    !(probability > 0) ||
    !(energyTemperature > 0)
  ) {
    throw new DecisionMathError('Brak dodatniej temperatury decyzji.');
  }
  return { probability, energy: energyTemperature };
}

export function classIdsFrom(classes: readonly (string | { classId: string })[]): string[] {
  return classes.map((item) => (typeof item === 'string' ? item : item.classId));
}

function assertFiniteLogits(logits: readonly number[], classCount: number): void {
  if (logits.length !== classCount) {
    throw new DecisionMathError(
      `Liczba logitów ${logits.length} nie jest liczbą klas ${classCount}.`,
    );
  }
  if (logits.length === 0) throw new DecisionMathError('Logity są puste.');
  for (const value of logits) {
    if (!Number.isFinite(value)) throw new DecisionMathError('Logity muszą być skończone.');
  }
}

function logSumExp(values: readonly number[]): number {
  let peak = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value > peak) peak = value;
  }
  let sum = 0;
  for (const value of values) sum += Math.exp(value - peak);
  return peak + Math.log(sum);
}

/** E(x) = −T · logsumexp(z/T). Niższa energia oznacza rozkład bliższy danym treningowym. */
function energyScore(logits: readonly number[], temperature: number): number {
  if (!(temperature > 0)) throw new DecisionMathError('Temperatura energii musi być dodatnia.');
  const scaled = logits.map((value) => value / temperature);
  return -temperature * logSumExp(scaled);
}

/** softmax(z/T) ze stabilnym odejmowaniem maksimum. */
function softmaxTemperature(logits: readonly number[], temperature: number): number[] {
  if (!(temperature > 0)) throw new DecisionMathError('Temperatura softmaxu musi być dodatnia.');
  const scaled = logits.map((value) => value / temperature);
  let peak = Number.NEGATIVE_INFINITY;
  for (const value of scaled) {
    if (value > peak) peak = value;
  }
  const exps = scaled.map((value) => Math.exp(value - peak));
  let total = 0;
  for (const value of exps) total += value;
  return exps.map((value) => value / total);
}

function topIndex(probabilities: readonly number[]): { index: number; probability: number } {
  let index = 0;
  let probability = probabilities[0] ?? 0;
  for (let cursor = 1; cursor < probabilities.length; cursor += 1) {
    const next = probabilities[cursor] ?? 0;
    if (next > probability) {
      index = cursor;
      probability = next;
    }
  }
  return { index, probability };
}

function topCandidates(
  probabilities: readonly number[],
  classIds: readonly string[],
  limit: number,
): DecisionCandidate[] {
  const order = probabilities.map((_, index) => index);
  order.sort((left, right) => {
    const delta = (probabilities[right] ?? 0) - (probabilities[left] ?? 0);
    if (delta !== 0) return delta;
    return left - right;
  });
  return order.slice(0, limit).map((index, rank) => ({
    index,
    classId: classIds[index] ?? '',
    probability: probabilities[index] ?? 0,
    rank: rank + 1,
  }));
}

export function decideLogits(
  logits: readonly number[],
  classIds: readonly string[],
  temperatures: TemperaturePair,
  thresholds: GateThresholds,
): LogitDecision {
  assertFiniteLogits(logits, classIds.length);
  const probabilities = softmaxTemperature(logits, temperatures.probability);
  const energy = energyScore(logits, temperatures.energy);
  const top = topIndex(probabilities);
  const status: DecisionStatus =
    energy > thresholds.energyThreshold
      ? 'out_of_distribution'
      : top.probability < thresholds.minTop1Prob
        ? 'unclear'
        : 'ok';
  return {
    status,
    energy,
    pTop1: top.probability,
    candidates: status === 'ok' ? topCandidates(probabilities, classIds, 3) : [],
  };
}

function confidence(probabilities: readonly number[]): number {
  let entropy = 0;
  for (const probability of probabilities) {
    if (probability > 0) entropy -= probability * Math.log(probability);
  }
  const cap = Math.log(probabilities.length);
  const value = 1 - entropy / cap;
  return value > 0 ? value : 0;
}

function entropyWeighted(
  rows: readonly (readonly number[])[],
  probabilityTemperature: number,
): number[] {
  const width = rows[0]?.length ?? 0;
  const confidences = rows.map((row) =>
    confidence(softmaxTemperature(row, probabilityTemperature)),
  );
  let total = 0;
  for (const value of confidences) total += value;
  const weights =
    total === 0 ? rows.map(() => 1 / rows.length) : confidences.map((value) => value / total);
  const fused = Array.from({ length: width }, () => 0);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const weight = weights[rowIndex] ?? 0;
    for (let index = 0; index < width; index += 1) {
      fused[index] = (fused[index] ?? 0) + weight * (row[index] ?? 0);
    }
  }
  return fused;
}

/**
 * Najpierw bramka każdego zdjęcia progami pojedynczego zdjęcia.
 * m = liczba zdjęć ok. m = 0 nie ma z̄. m = 1 ocenia ten wektor progami
 * pojedynczego zdjęcia. m = 2 i 3 oceniają z̄ progami ood.fusion[m].
 */
export function fuseLogits(
  photos: readonly (readonly number[])[],
  classIds: readonly string[],
  temperatures: TemperaturePair,
  single: GateThresholds,
  fusionThresholds: { readonly 2?: GateThresholds; readonly 3?: GateThresholds },
): FusionDecision {
  const accepted: number[][] = [];
  for (const logits of photos) {
    const decision = decideLogits(logits, classIds, temperatures, single);
    if (decision.status === 'ok') accepted.push([...logits]);
  }
  const m = accepted.length;
  if (m === 0) {
    return { status: 'out_of_distribution', energy: null, pTop1: null, candidates: [], m };
  }
  const thresholds = m === 1 ? single : m === 2 ? fusionThresholds[2] : fusionThresholds[3];
  if (thresholds === undefined) {
    throw new DecisionMathError(`Brak progów fuzji dla m = ${m}.`);
  }
  const fused = m === 1 ? (accepted[0] ?? []) : entropyWeighted(accepted, temperatures.probability);
  const decision = decideLogits(fused, classIds, temperatures, thresholds);
  return { ...decision, m };
}
