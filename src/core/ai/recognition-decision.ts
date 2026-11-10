/**
 * Szkielet decyzji rozpoznania (D-08, D11).
 * Model nie zwraca jadalności. Status gatunku przyjdzie z bazy w późniejszej fazie.
 * Bramka energii i fuzja nie są tu liczone.
 */

export type RejectionReason = 'out_of_distribution' | 'unclear';

export interface UnavailableDecision {
  status: 'unavailable';
  reason: string;
}

export interface RejectedDecision {
  status: 'rejected';
  reason: RejectionReason;
}

export interface CandidateDecision {
  status: 'candidates';
  classIds: readonly string[];
  dangerousGenus: boolean;
  lowConfidence: boolean;
  partialEvidence: boolean;
  viewsDisagree: boolean;
}

export type RecognitionDecision = UnavailableDecision | RejectedDecision | CandidateDecision;

export function unavailableDecision(reason: string): UnavailableDecision {
  return { status: 'unavailable', reason };
}

export function rejectedDecision(reason: RejectionReason): RejectedDecision {
  return { status: 'rejected', reason };
}

/** Kształt wyniku bez progów. Nie czyta jadalności i nie zgaduje gatunku z pikseli. */
export function candidateSkeleton(classIds: readonly string[]): CandidateDecision {
  return {
    status: 'candidates',
    classIds,
    dangerousGenus: false,
    lowConfidence: false,
    partialEvidence: false,
    viewsDisagree: false,
  };
}

const forbiddenKeys = ['edibility', 'verdict', 'edible', 'safe'] as const;

export function decisionCarriesEdibility(decision: RecognitionDecision): boolean {
  return Object.keys(decision).some((key) => forbiddenKeys.some((forbidden) => forbidden === key));
}
