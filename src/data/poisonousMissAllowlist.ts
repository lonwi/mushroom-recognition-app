/**
 * Pairs where a poisonous or deadly species may leave both atlas sections
 * for a reason other than hymenophore or spore print.
 *
 * New entries only with an owner decision recorded in
 * https://github.com/lonwi/mushroom-recognition-app/issues/63.
 * Removing entries is always allowed.
 *
 * `ring-present` × Hypholoma fasciculare stays a miss until that issue
 * decides whether a cortina that looks like a ring zone should hold.
 * It is not a new exclusion.
 */
export const POISONOUS_MISS_ALLOWLIST: readonly { speciesId: string; chipId: string }[] = [
  { speciesId: 'hypholoma_fasciculare', chipId: 'ring-present' },
];
