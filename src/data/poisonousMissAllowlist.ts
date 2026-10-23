/**
 * Pairs where a poisonous or deadly species may leave both atlas sections
 * for a reason other than a `STABLE_TRAITS` contradiction.
 *
 * New entries only with an owner decision recorded in
 * https://github.com/lonwi/mushroom-recognition-app/issues/63.
 * Removing entries is always allowed.
 */
export const POISONOUS_MISS_ALLOWLIST: readonly { speciesId: string; chipId: string }[] = [];
